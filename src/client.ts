import * as uuid4 from "uuid/v4";
import * as WebSocket from "ws";
import { websocket } from "./types";
import {
  IBasicMessage,
  isMessageAdjustVolumeMessage,
  isMessageSetMuteMessage,
  isMessageSetVolumeMessage,
  Message,
  MessageType,
} from "./types/websocket";

class VolumeControlClient {
  private volume = 50;
  private isMuted = false;
  private deviceId: string = undefined;

  constructor(websocketURI: string, deviceId?: string) {
    const ws = new WebSocket(websocketURI);
    ws.on("open", () => this.handleOpen(ws));
    ws.on("message", (json: string) => this.handleMessage(ws, json));

    this.deviceId = deviceId || uuid4();
  }

  private handleOpen = (ws: WebSocket) => {
    this.sendMessage(ws, {
      deviceId: this.deviceId,
      messageId: "connect",
      type: MessageType.CONNECT,
    });
  }

  private handleMessage = (ws: WebSocket, json: string) => {
    const message: IBasicMessage = JSON.parse(json);
    if (isMessageAdjustVolumeMessage(message)) {
      this.handleAdjustVolumeMessage(ws, message);
    } else if (isMessageSetVolumeMessage(message)) {
      this.handleSetVolumeMessage(ws, message);
    } else if (isMessageSetMuteMessage(message)) {
      this.handleSetMuteMessage(ws, message);
    } else {
      // tslint:disable-next-line
      console.log("Bad message received: %s", message);
    }
  }

  private handleAdjustVolumeMessage = (
    ws: WebSocket,
    message: websocket.IAdjustVolumeMessage,
  ) => {
    this.volume = this.computeNewVolume(message.volumeDelta);
    this.sendMessage(ws, {
      deviceId: this.deviceId,
      isMuted: this.isMuted,
      messageId: message.messageId,
      type: MessageType.UPDATE,
      volume: this.volume,
    });
  }

  private handleSetVolumeMessage = (
    ws: WebSocket,
    message: websocket.ISetVolumeMessage,
  ) => {
    this.volume = message.volume;
    this.sendMessage(ws, {
      deviceId: this.deviceId,
      isMuted: this.isMuted,
      messageId: message.messageId,
      type: MessageType.UPDATE,
      volume: this.volume,
    });
  }

  private handleSetMuteMessage = (
    ws: WebSocket,
    message: websocket.ISetMuteMessage,
  ) => {
    this.isMuted = message.isMuted;
    this.sendMessage(ws, {
      deviceId: this.deviceId,
      isMuted: this.isMuted,
      messageId: message.messageId,
      type: MessageType.UPDATE,
      volume: this.volume,
    });
  }

  private computeNewVolume = (deltaString: string) => {
    const operator = deltaString.charAt(0);
    const delta = parseInt(deltaString.substr(1), 10);

    if (operator === "-") {
      return Math.max(this.volume - delta, 0);
    } else if (operator === "+") {
      return Math.min(this.volume + delta, 100);
    }
  }

  private sendMessage = (ws: WebSocket, message: Message) => {
    ws.send(JSON.stringify(message));
  }
}

const client = new VolumeControlClient(
  "wss://volcon.dynamic.jcaw.me:443",
  "4b8c20fc-36a7-4ac0-8c6f-6699d701e87b",
);

// const client = new VolumeControlClient(
//   "ws://127.0.0.1:3000",
//   "4b8c20fc-36a7-4ac0-8c6f-6699d701e87b",
// );
