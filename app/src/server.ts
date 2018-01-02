import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";
import * as Joi from "joi";
import * as uuid4 from "uuid/v4";
import * as WebSocket from "ws";
import * as api from "./types/api";
import * as websocket from "./types/websocket";

const generateApiErrorResponse = (error: string) => {
  return JSON.stringify({ success: false, error });
};

const generateApiSuccessResponse = (payload: object) => {
  return JSON.stringify({ success: true, payload });
};

const generateDiscoverResponse = (deviceId: string) => {
  return {
    capabilities: [
      {
        interface: "Alexa",
        type: "AlexaInterface",
        version: "3",
      },
      {
        interface: "Alexa.Speaker",
        properties: {
          retrievable: true,
          supported: [
            {
              name: "volume",
            },
            {
              name: "muted",
            },
          ],

        },
        type: "AlexaInterface",
        version: "3",
      },
    ],
    cookie: {},
    description: "Volcon Volume Control",
    displayCategories: ["SPEAKER"],
    endpointId: deviceId,
    friendlyName: "Volume Control",
    manufacturerName: "John Wiseheart",
  };
};

const validate = (typeGuard: (obj: any) => boolean) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (typeGuard(req.body)) {
      next();
    } else {
      res.send(generateApiErrorResponse("Received bad fields in json"));
    }
  };
};

const setJSONHeader = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  res.setHeader("Content-Type", "application/json");
  next();
};

class VolumeControlServer {
  private connectedDevices: websocket.IWebSocketMap = {};
  private awaitingResponses: api.IResponseMap = {};

  constructor(port = 3000) {
    const app = express();
    app.use(bodyParser.json());
    app.all("/*", setJSONHeader);
    app.get("/ping", (req: express.Request, res: express.Response) => {
      res.send("Ping");
    });
    app.get("/devices", this.handleDevicesRequest);
    app.post(
      "/adjustVolume",
      validate(api.isRequestAdjustVolumeRequest),
      this.handleAdjustVolumeRequest,
    );
    app.post(
      "/setVolume",
      validate(api.isRequestSetVolumeRequest),
      this.handleSetVolumeRequest,
    );
    app.post(
      "/setMute",
      validate(api.isRequestSetMuteRequest),
      this.handleMuteRequest,
    );

    const server = app.listen(port);

    const wss = new WebSocket.Server({ server });
    wss.on("connection", (ws: WebSocket) => {
      ws.on("message", (json: string) => this.handleWebsocketMessage(ws, json));
      let timerId: NodeJS.Timer;
      const keepAlive = () => {
          if (ws.readyState === ws.OPEN) {
              ws.send("");
          }
          timerId = setTimeout(keepAlive, 20000);
      };
      const cancelKeepAlive = () => {
          if (timerId) {
              clearTimeout(timerId);
          }
      };

      keepAlive();
      ws.on("close", cancelKeepAlive);
    });
  }

  private isValidDeviceId = (deviceId) => {
    return Object.keys(this.connectedDevices).indexOf(deviceId) > -1;
  }

  private handleDevicesRequest = (
    req: express.Request,
    res: express.Response,
  ) => {

    Object.keys(this.connectedDevices).forEach((id) => {
      const device = this.connectedDevices[id];
      if (device.readyState === device.CLOSED) {
        delete this.connectedDevices[id];
      }
    });

    res.send(
      generateApiSuccessResponse({ devices: Object.keys(this.connectedDevices).map(generateDiscoverResponse) }),
    );
  }

  private handleAdjustVolumeRequest = (
    req: express.Request,
    res: express.Response,
  ) => {
    if (!this.isValidDeviceId(req.body.deviceId)) {
      res.send(generateApiErrorResponse("Invalid device ID"));
    }

    if (api.isRequestAdjustVolumeRequest(req.body)) {
      const { deviceId, volumeDelta } = req.body;
      const messageId = uuid4();
      this.sendMessage(deviceId, {
        deviceId,
        messageId,
        type: websocket.MessageType.ADJUST_VOLUME,
        volumeDelta,
      });
      this.awaitingResponses[messageId] = res;
    }
  }

  private handleSetVolumeRequest = (req: express.Request, res: express.Response) => {
    if (!this.isValidDeviceId(req.body.deviceId)) {
      res.send(generateApiErrorResponse("Invalid device ID"));
    }

    if (api.isRequestSetVolumeRequest(req.body)) {
      const { deviceId, volume } = req.body;
      const messageId = uuid4();
      this.sendMessage(deviceId, {
        deviceId,
        messageId,
        type: websocket.MessageType.SET_VOLUME,
        volume,
      });
      this.awaitingResponses[messageId] = res;
    }
  }

  private handleMuteRequest = (req: express.Request, res: express.Response) => {
    if (!this.isValidDeviceId(req.body.deviceId)) {
      res.send(generateApiErrorResponse("Invalid device ID"));
    }

    if (api.isRequestSetMuteRequest(req.body)) {
      const { deviceId, isMuted } = req.body;
      const messageId = uuid4();
      this.sendMessage(deviceId, {
        deviceId,
        isMuted,
        messageId,
        type: websocket.MessageType.SET_MUTE,
      });
      this.awaitingResponses[messageId] = res;
    }
  }

  private handleWebsocketMessage = (ws: WebSocket, json: string) => {
    const data = JSON.parse(json);
    if (websocket.isMessageConnectMessage(data)) {
      this.connectedDevices[data.deviceId] = ws;
    } else if (websocket.isMessageDisconnectMessage(data)) {
      delete this.connectedDevices[data.deviceId];
    } else if (websocket.isMessageUpdateMessage(data)) {
      const { deviceId, volume, isMuted, messageId } = data;
      this.awaitingResponses[messageId].send(
        generateApiSuccessResponse({ deviceId, isMuted, volume }),
      );
      delete this.awaitingResponses[messageId];
    } else {
      // tslint:disable-next-line
      console.log("received unknown message: %s", JSON.stringify(data));
    }
  }

  private sendMessage = (deviceId: string, data: websocket.Message) => {
    const ws = this.connectedDevices[deviceId];
    if (ws.readyState !== ws.CLOSED) {
      ws.send(JSON.stringify(data));
    } else {
      delete this.connectedDevices[deviceId];
    }
  }
}

const a = new VolumeControlServer(3000);
