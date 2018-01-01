import * as express from "express";

export interface IResponseMap {
  [uuid: string]: express.Response;
}

export interface IBasicMessage {
  deviceId: string;
}

export interface IAdjustVolumeRequest extends IBasicMessage {
  volumeDelta: string;
}

export interface ISetVolumeRequest extends IBasicMessage {
  volume: number;
}

export interface ISetMuteRequest extends IBasicMessage {
  isMuted: boolean;
}

export const isRequestAdjustVolumeRequest = (
  requestBody: any,
): requestBody is IAdjustVolumeRequest => {
  return requestBody.volumeDelta !== undefined;
};

export const isRequestSetVolumeRequest = (
  requestBody: any,
): requestBody is ISetVolumeRequest => {
  return requestBody.volume !== undefined;
};

export const isRequestSetMuteRequest = (
  requestBody: any,
): requestBody is ISetMuteRequest => {
  return requestBody.isMuted !== undefined;
};
