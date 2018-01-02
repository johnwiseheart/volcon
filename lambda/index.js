"use strict";

var https = require("https");
const fetch = require('node-fetch');

const log = console.log;

/**
 * Generate a unique message ID
 *
 * TODO: UUID v4 is recommended as a message ID in production.
 */
function generateMessageID() {
  return "38A28869-DD5E-48CE-BBE5-A4DB78CECB28"; // Dummy
}

/**
 * Generate a response message
 *
 * @param {string} name - Directive name
 * @param {Object} payload - Any special payload required for the response
 * @returns {Object} Response object
 */

function generateResponse(name, payload) {
  return {
    context: {
      properties: [
        {
          namespace: "Alexa.Speaker",
          name: "volume",
          value: payload.volume,
          timeOfSample: new Date().toISOString(),
          uncertaintyInMilliseconds: 0
        },
        {
          namespace: "Alexa.Speaker",
          name: "muted",
          value: payload.isMuted,
          timeOfSample: new Date().toISOString(),
          uncertaintyInMilliseconds: 0
        }
      ]
    },
    event: {
      header: {
        messageId: generateMessageID(),
        name: name,
        namespace: "Alexa.Speaker",
        payloadVersion: "3"
      },
      endpoint: payload.deviceId,
      payload: {}
    }
  };
}

function handleDiscovery(request, callback) {
  log("DEBUG", `Discovery Request: ${JSON.stringify(request.directive)}`);

  /**
   * Get the OAuth token from the request.
   */
  const userAccessToken = request.directive.payload.scope.token.trim();

  fetch("https://volcon.dynamic.jcaw.me/devices")
    .then((resp) => resp.json())
    .then((json) => {
      const response = {
        event: {
          header: {
            messageId: generateMessageID(),
            name: "Discover.Response",
            namespace: "Alexa.Discovery",
            payloadVersion: "3"
          },
          payload: {
            endpoints: json.payload.devices
          }
        }
      };

      log("DEBUG", `Discovery Response: ${JSON.stringify(response)}`);
      callback(null, response);
    });
}

function handleSpeaker(request, callback) {
  let response;
  let volume = undefined;

  switch (request.directive.header.name) {
    case "SetVolume":
      volume = request.directive.payload.volume;

      fetch("https://volcon.dynamic.jcaw.me/setVolume", {
        method: "POST",
        body: JSON.stringify({
          deviceId: "d1b6ce9b-601f-4f80-8a04-5a0b1ed6c22f",
          volume
        })
      })
        .then((resp) => resp.json())
        .then((json) => {
          console.log("AAA", body);
            callback(
              null,
              generateResponse(
                "VolumeChanged",
                json.payload
              )
            )
        });
      break;
    case "AdjustVolume":
      volume = request.payload.volume;
      var body = JSON.stringify({
        deviceId: "25c94278-4b6e-4f71-b300-48b16cfaddcf",
        volumeDelta: volume
      });

      fetch("https://volcon.dynamic.jcaw.me/adjustVolume", {
        method: "POST",
        body: JSON.stringify({
          deviceId: "d1b6ce9b-601f-4f80-8a04-5a0b1ed6c22f",
          volumeDelta: volume
        })
      })
        .then((resp) => resp.json())
        .then((json) => {
            callback(
              null,
              generateResponse(
                "VolumeChanged",
                json.payload
              )
            )
        });
      break;
    case "SetMute":
      const mute = request.payload.mute;
      var body = JSON.stringify({
        deviceId: "9af0818d-deb6-4807-a71d-fa66c434a96b",
        isMuted: mute
      });

      fetch("https://volcon.dynamic.jcaw.me/setMute", {
        method: "POST",
        body: JSON.stringify({
          deviceId: "d1b6ce9b-601f-4f80-8a04-5a0b1ed6c22f",
          volumeDelta: volume
        })
      })
        .then((resp) => resp.json())
        .then((json) => {
            callback(
              null,
              generateResponse(
                "MuteChanged",
                json.payload
              )
            )
        });
      break;
  }
}

exports.handler = (request, context, callback) => {
  console.log(JSON.stringify(request));
  switch (request.directive.header.namespace) {
    case "Alexa.Discovery":
      handleDiscovery(request, callback);
      break;

    case "Alexa.Speaker":
      handleSpeaker(request, callback);
      break;

    case "Alexa.Authorization":
      callback(null, {
        event: {
          header: {
            messageId: generateMessageID(),
            namespace: "Alexa.Authorization",
            name: "AcceptGrant.Response",
            payloadVersion: "3"
          },
          payload: {}
        }
      });
      break;
  }
};
