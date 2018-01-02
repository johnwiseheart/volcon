import * as WebSocket from "ws";
export interface IWebSocketMap { [index: string]: WebSocket; }

export enum MessageType {
  CONNECT = "CONNECT",
  DISCONNECT = "DISCONNECT",
  UPDATE = "UPDATE",
  ADJUST_VOLUME = "ADJUST_VOLUME",
  SET_VOLUME = "SET_VOLUME",
  SET_MUTE = "SET_MUTE",
}

export interface IBasicMessage {
  type: MessageType;
  deviceId: string;
  messageId: string;
}

export type IConnectMessage = IBasicMessage;

export type IDisconnectMessage = IBasicMessage;

export interface IUpdateMessage extends IBasicMessage {
  volume: number;
  isMuted: boolean;
}

export interface IAdjustVolumeMessage extends IBasicMessage {
  volumeDelta: string;
}

export interface ISetVolumeMessage extends IBasicMessage {
  volume: number;
}

export interface ISetMuteMessage extends IBasicMessage {
  isMuted: boolean;
}

export type Message =
  | IConnectMessage
  | IDisconnectMessage
  | IUpdateMessage
  | IAdjustVolumeMessage
  | ISetVolumeMessage
  | ISetMuteMessage;

export const isMessageConnectMessage = (
  message: IBasicMessage,
): message is IConnectMessage => {
  return message.type === MessageType.CONNECT;
};

export const isMessageDisconnectMessage = (
  message: IBasicMessage,
): message is IDisconnectMessage => {
  return message.type === MessageType.DISCONNECT;
};

export const isMessageUpdateMessage = (
  message: IBasicMessage,
): message is IUpdateMessage => {
  return message.type === MessageType.UPDATE;
};

export const isMessageAdjustVolumeMessage = (
  message: IBasicMessage,
): message is IAdjustVolumeMessage => {
  return message.type === MessageType.ADJUST_VOLUME;
};

export const isMessageSetVolumeMessage = (
  message: IBasicMessage,
): message is ISetVolumeMessage => {
  return message.type === MessageType.SET_VOLUME;
};

export const isMessageSetMuteMessage = (
  message: IBasicMessage,
): message is ISetMuteMessage => {
  return message.type === MessageType.SET_MUTE;
};
