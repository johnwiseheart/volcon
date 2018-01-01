import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";
import * as uuid4 from "uuid/v4";
import * as WebSocket from "ws";
import * as api from "./types/api";
import * as websocket from "./types/websocket";

class VolumeControlServer {
  private connectedUsers: websocket.IWebSocketMap = {};
  private awaitingResponses: api.IResponseMap = {};

  constructor(port = 3000) {
    const app = express();
    app.use(bodyParser.json());
    app.post(
      "/*",
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        res.setHeader("Content-Type", "application/json");
        next();
      },
    );
    app.get("/ping", (req: express.Request, res: express.Response) => {
      res.send("Ping");
    });
    app.post("/adjustVolume", this.handleAdjustVolumeRequest);
    app.post("/setVolume", this.handleSetVolumeRequest);
    app.post("/setMute", this.handleMuteRequest);

    const server = app.listen(port);

    const wss = new WebSocket.Server({ server });
    wss.on("connection", (ws: WebSocket) => {
      ws.on("message", (json: string) => this.handleWebsocketMessage(ws, json));
    });
  }

  public handleAdjustVolumeRequest = (
    req: express.Request,
    res: express.Response,
  ) => {
    if (api.isRequestAdjustVolumeRequest(req.body)) {
      const { deviceId, volumeDelta } = req.body;
      const messageId = uuid4();
      this.sendMessage(this.connectedUsers[deviceId], {
        deviceId,
        messageId,
        type: websocket.MessageType.ADJUST_VOLUME,
        volumeDelta,
      });
      this.awaitingResponses[messageId] = res;
    } else {
      res.send(generateApiErrorResponse("Incorrect fields in json"));
    }
  }

  public handleSetVolumeRequest = (
    req: express.Request,
    res: express.Response,
  ) => {
    if (api.isRequestSetVolumeRequest(req.body)) {
      const { deviceId, volume } = req.body;
      const messageId = uuid4();
      this.sendMessage(this.connectedUsers[deviceId], {
        deviceId,
        messageId,
        type: websocket.MessageType.SET_VOLUME,
        volume,
      });
      this.awaitingResponses[messageId] = res;
    } else {
      res.send(generateApiErrorResponse("Incorrect fields in json"));
    }
  }

  public handleMuteRequest = (req: express.Request, res: express.Response) => {
    if (api.isRequestSetMuteRequest(req.body)) {
      const { deviceId, isMuted } = req.body;
      const messageId = uuid4();
      this.sendMessage(this.connectedUsers[deviceId], {
        deviceId,
        isMuted,
        messageId,
        type: websocket.MessageType.SET_MUTE,
      });
      this.awaitingResponses[messageId] = res;
    } else {
      res.send(generateApiErrorResponse("Incorrect fields in json"));
    }
  }

  public handleWebsocketMessage = (ws: WebSocket, json: string) => {
    const data = JSON.parse(json);
    if (websocket.isMessageConnectMessage(data)) {
      this.connectedUsers[data.deviceId] = ws;
    } else if (websocket.isMessageDisconnectMessage(data)) {
      delete this.connectedUsers[data.deviceId];
    } else if (websocket.isMessageUpdateMessage(data)) {
      const { deviceId, volume, isMuted, messageId } = data;
      this.awaitingResponses[messageId].send(
        generateApiSuccessResponse({ deviceId, isMuted, volume }),
      );
    } else {
      // tslint:disable-next-line
      console.log("received unknown message: %s", JSON.stringify(data));
    }
  }

  public sendMessage = (ws: WebSocket, data: websocket.Message) => {
    ws.send(JSON.stringify(data));
  }
}

const a = new VolumeControlServer(3000);

const generateApiErrorResponse = (error: string) => {
  return JSON.stringify({ success: false, error });
};

const generateApiSuccessResponse = (payload: object) => {
  return JSON.stringify({ success: true, payload });
};
