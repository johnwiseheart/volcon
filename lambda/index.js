"use strict";

var https = require("https");

/**
 * This sample demonstrates a smart home skill using the publicly available API on Amazon's Alexa platform.
 * For more information about developing smart home skills, see
 *  https://developer.amazon.com/alexa/smart-home
 *
 * For details on the smart home API, please visit
 *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference
 */

/**
 * Mock data for devices to be discovered
 *
 * For more information on the discovered appliance response please see
 *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesresponse
 */
const USER_DEVICES = [
  {
    endpointId: "4b8c20fc-36a7-4ac0-8c6f-6699d701e87b",
    friendlyName: "Volcon Volume Control",
    description: "Volcon Volume Control",
    manufacturerName: "John Wiseheart",
    displayCategories: ["SPEAKER"],
    cookie: {},
    capabilities: [
      {
        type: "AlexaInterface",
        interface: "Alexa",
        version: "3"
      },
      {
        type: "AlexaInterface",
        interface: "Alexa.Speaker",
        version: "3",
        properties: {
          supported: [
            {
              name: "volume"
            },
            {
              name: "muted"
            }
          ],
          retrievable: true
        }
      }
    ]
  }
];

/**
 * Utility functions
 */

function log(title, msg) {
  console.log(`[${title}] ${msg}`);
}

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

function generateGenericResponse(name, payload) {
  return {
    event: {
      header: {
        messageId: generateMessageID(),
        name: name,
        namespace: "Alexa.Speaker",
        payloadVersion: "3"
      },
      endpoint: "appliance-001",
      payload: payload
    }
  };
}

function generateResponse(name, volume, isMuted) {
  return {
    context: {
      properties: [
        {
          namespace: "Alexa.Speaker",
          name: "volume",
          value: volume,
          timeOfSample: "2017-02-03T16:20:50.52Z",
          uncertaintyInMilliseconds: 0
        },
        {
          namespace: "Alexa.Speaker",
          name: "muted",
          value: isMuted,
          timeOfSample: "2017-02-03T16:20:50.52Z",
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
      endpoint: "appliance-001",
      payload: {}
    }
  };
}

/**
 * Mock functions to access device cloud.
 *
 * TODO: Pass a user access token and call cloud APIs in production.
 */

function getDevicesFromPartnerCloud() {
  /**
   * For the purposes of this sample code, we will return:
   * (1) Non-dimmable light bulb
   * (2) Dimmable light bulb
   */

  return USER_DEVICES;
}

/**
 * Main logic
 */

/**
 * This function is invoked when we receive a "Discovery" message from Alexa Smart Home Skill.
 * We are expected to respond back with a list of appliances that we have discovered for a given customer.
 *
 * @param {Object} request - The full request object from the Alexa smart home service. This represents a DiscoverAppliancesRequest.
 *     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesrequest
 *
 * @param {function} callback - The callback object on which to succeed or fail the response.
 *     https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html#nodejs-prog-model-handler-callback
 *     If successful, return <DiscoverAppliancesResponse>.
 *     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesresponse
 */
function handleDiscovery(request, callback) {
  log("DEBUG", `Discovery Request: ${JSON.stringify(request.directive)}`);

  /**
   * Get the OAuth token from the request.
   */
  const userAccessToken = request.directive.payload.scope.token.trim();

  var request = new https.request(
    {
      host: "volcon.dynamic.jcaw.me",
      port: "443",
      path: "/devices",
      method: "GET"
    },
    res => {
      res.setEncoding("utf8");
      res.on("data", function(body) {
        const content = JSON.parse(body);
        const response = {
          event: {
            header: {
              messageId: generateMessageID(),
              name: "Discover.Response",
              namespace: "Alexa.Discovery",
              payloadVersion: "3"
            },
            payload: {
              endpoints: content.payload.devices
            }
          }
        };

        /**
         * Log the response. These messages will be stored in CloudWatch.
         */
        log("DEBUG", `Discovery Response: ${JSON.stringify(response)}`);

        /**
         * Return result with successful message.
         */
        callback(null, response);
      });
    }
  );
  request.end();
}

function handleSpeaker(request, callback) {
  let response;
  let volume = undefined;

  switch (request.directive.header.name) {
    case "SetVolume":
      volume = request.directive.payload.volume;
      if (!volume) {
        const payload = { faultingParameter: `volume: ${volume}` };
        callback(
          null,
          generateGenericResponse("UnexpectedInformationReceivedError", payload)
        );
        return;
      }

      var body = JSON.stringify({
        deviceId: "d1b6ce9b-601f-4f80-8a04-5a0b1ed6c22f",
        volume
      });

      var request = new https.request(
        {
          host: "volcon.dynamic.jcaw.me",
          port: "443",
          path: "/setVolume",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body)
          }
        },
        res => {
          res.setEncoding("utf8");
          res.on("data", function(body) {
            console.log("AAA", body);
            const content = JSON.parse(body);
            callback(
              null,
              generateResponse(
                "VolumeChanged",
                content.payload.volume,
                content.payload.isMuted
              )
            );
          });
        }
      );
      request.end(body);
      break;
    case "AdjustVolume":
      volume = request.payload.volume;
      if (!volume) {
        const payload = { faultingParameter: `volume: ${volume}` };
        callback(
          null,
          generateGenericResponse("UnexpectedInformationReceivedError", payload)
        );
        return;
      }

      var body = JSON.stringify({
        deviceId: "25c94278-4b6e-4f71-b300-48b16cfaddcf",
        volumeDelta: volume
      });

      var request = new https.request(
        {
          host: "volcon.dynamic.jcaw.me",
          port: "443",
          path: "/adjustVolume",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body)
          }
        },
        res => {
          res.setEncoding("utf8");
          res.on("data", function(body) {
            console.log("AAA", body);
            const content = JSON.parse(body);
            callback(
              null,
              generateResponse(
                "VolumeChanged",
                content.payload.volume,
                content.payload.isMuted
              )
            );
          });
        }
      );
      request.end(body);
      break;
    case "SetMute":
      const mute = request.payload.mute;
      if (mute === undefined) {
        const payload = { faultingParameter: `mute: ${mute}` };
        callback(
          null,
          generateGenericResponse("UnexpectedInformationReceivedError", payload)
        );
        return;
      }

      var body = JSON.stringify({
        deviceId: "9af0818d-deb6-4807-a71d-fa66c434a96b",
        isMuted: mute
      });

      var request = new https.request(
        {
          host: "volcon.dynamic.jcaw.me",
          port: "443",
          path: "/setMute",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body)
          }
        },
        res => {
          res.setEncoding("utf8");
          res.on("data", function(body) {
            console.log("AAA", body);
            const content = JSON.parse(body);
            callback(
              null,
              generateResponse(
                "MuteChanged",
                content.payload.volume,
                content.payload.isMuted
              )
            );
          });
        }
      );
      request.end(body);
      break;
    default: {
      log("ERROR", `No supported directive name: ${request.directive.header.name}`);
      callback(null, generateGenericResponse("UnsupportedOperationError", {}));
      return;
    }
  }
}

/**
 * Main entry point.
 * Incoming events from Alexa service through Smart Home API are all handled by this function.
 *
 * It is recommended to validate the request and response with Alexa Smart Home Skill API Validation package.
 *  https://github.com/alexa/alexa-smarthome-validation
 */
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
    default: {
      const errorMessage = `No supported namespace: ${JSON.stringify(request)}`;
      log("ERROR", errorMessage);
      callback(new Error(errorMessage));
    }
  }
};
