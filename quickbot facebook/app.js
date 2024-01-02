/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger Platform Quick Start Tutorial
 *
 * This is the completed code for the Messenger Platform quick start tutorial
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 * To run this code, you must do the following:
 *
 * 1. Deploy this code to a server running Node.js
 * 2. Run `yarn install`
 * 3. Add your VERIFY_TOKEN and PAGE_ACCESS_TOKEN to your environment vars
 */

"use strict";

// Use dotenv to read .env vars into Node
require("dotenv").config();
// Imports dependencies and set up http server
const request = require("request"),
  express = require("express"),
  { urlencoded, json } = require("body-parser"),
  app = express();
// Parse application/x-www-form-urlencoded
app.use(urlencoded({ extended: true }));
const cors = require('cors');

app.use(cors({
  origin: 'https://trekhills.com' // Replace with your frontend app's URL
}));

// Parse application/json
app.use(json());

// PUT /api/users/:id/status
app.put('/api/users/:id/status', async (req, res) => {
  const userId = req.params.id;
  const { status } = req.body; // Ensure that 'status' is being sent in the request body

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = status;
    await user.save();

    res.json({ message: "User status updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  psid: String,
  name: String,
  email: String,
  phone: String,
  address: String,
  status: {
    type: String,
    default: 'pending'
  },
  attachmentUrl: String,
});

const User = mongoose.model('User', userSchema);

// Respond with 'Hello World' when a GET request is made to the homepage
app.get("/", function (_req, res) {
  res.send("Hello World");
});

// Adds support for GET requests to our webhook
app.get("/webhook", (req, res) => {
  // Your verify token. Should be a random string.
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  // Parse the query params
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

// Creates the endpoint for your webhook
app.post("/webhook", (req, res) => {
  let body = req.body;

  // Checks if this is an event from a page subscription
  if (body.object === "page") {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function (entry) {
      // Gets the body of the webhook event
      let webhookEvent = entry.messaging[0];
      console.log("Evenet Details : ");
      console.log(webhookEvent);

      // Get the sender PSID
      let senderPsid = webhookEvent.sender.id;
      console.log("Sender PSID: " + senderPsid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhookEvent.message) {

        handleMessage(senderPsid, webhookEvent.message);
      } else if (webhookEvent.postback) {
       
        handlePostback(senderPsid, webhookEvent.postback);
      }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).send("Server error");
  }
});


async function getUserFirstName(senderPsid) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${senderPsid}?fields=first_name&access_token=${PAGE_ACCESS_TOKEN}`
    );

    if (response.ok) {
      const data = await response.json();
      return data.first_name;
    } else {
      console.error("Error fetching user's first name:", response.statusText);
      return "User";
    }
  } catch (error) {
    console.error("Error fetching user's first name:", error);
    return "User";
  }
}

// Example user states storage
let userStates = {};

async function handleMessage(senderPsid, receivedMessage) {
  let response;

  // Check the user's current state
  const currentState = userStates[senderPsid] || 'START';

  let user = await User.findOne({ psid: senderPsid });
  if (!user) {
    const firstName = await getUserFirstName(senderPsid);
    user = new User({ psid: senderPsid, name: firstName });
  }

  if (receivedMessage.text) {
    // Handle text input based on the current state
    switch (currentState) {
      case 'AWAITING_EMAIL':
        user.email = receivedMessage.text.trim();
        userStates[senderPsid] = 'AWAITING_PHONE';
        response = { text: "Please provide your phone number." };
        break;

      case 'AWAITING_PHONE':
        user.phone = receivedMessage.text.trim();
        userStates[senderPsid] = 'AWAITING_ADDRESS';
        response = { text: "Please provide your shipping address." };
        break;

      case 'AWAITING_ADDRESS':
        user.address = receivedMessage.text.trim();
        delete userStates[senderPsid];
        response = { text: "Thank you for providing your details." };
        break;

      default:
        response = {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: `Salam, ${user.name}! How can I assist you today?`,
              buttons: [
                { type: "postback", title: "Get Order Status", payload: "GET_ORDER_STATUS" },
                { type: "postback", title: "Place a New Order", payload: "PLACE_NEW_ORDER" },
                { type: "postback", title: "Guidelines", payload: "GUIDELINES" },
              ],
            },
          },
        };
        break;
    }

    await user.save();
  } else if (receivedMessage.attachments) {
    // Handle attachments
    const attachmentUrl = receivedMessage.attachments[0].payload.url;
    user.attachmentUrl = attachmentUrl;
    await user.save();

    userStates[senderPsid] = 'AWAITING_EMAIL';
    response = { text: "Attachment received. Please provide your email address." };
  }

  callSendAPI(senderPsid, response);
}




// Handles messaging_postbacks events
function handlePostback(senderPsid, receivedPostback) {
  let response;

  // Get the payload for the postback
  let payload = receivedPostback.payload;

  // Set the response based on the postback payload
  console.log("this is call from yes", payload);

  if (payload === "GET_ORDER_STATUS") {
    response = { text: "Sure, let me check your order status for you." };
  } else if (payload === "PLACE_NEW_ORDER") {
    response = {
      text: "Great! Can you please send me the picture which you would like to order?",
    };
  } else if (payload === "GUIDELINES") {
    response = { text: "Here are the guidelines for using our bot." };
  } else  {
    // Extract and log the contact information
   // console.log("Contact Information:", payload);
  }

  callSendAPI(senderPsid, response);
}

// Sends response messages via the Send API
function callSendAPI(senderPsid, response) {
  // The page access token we have generated in your app settings
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  // Construct the message body
  let requestBody = {
    recipient: {
      id: senderPsid,
    },
    message: response,
  };

  // Send the HTTP request to the Messenger Platform
  request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: requestBody,
    },
    (err, _res, _body) => {
      if (!err) {
        console.log("Message sent!");
      } else {
        console.error("Unable to send message:" + err);
      }
    }
  );
}

async function customerAddress(senderPsid) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  console.log("this is call from address fuc", senderPsid);

  const message = {
    recipient: {
      id: senderPsid,
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "customer_information",
          countries: ["PK"],
          contact_overrides: [
            {
              email: {
                required: true,
              },
            },
          ],
          business_privacy: {
            url: "https://www.facebook.com/privacy/explanation",
          },
          expires_in_days: 1,
        },
      },
    },
  };
  // console.log("Customer Address Message:", JSON.stringify(message));

  const response = await fetch(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );
  console.log(response);
  if (response.ok) {
    // Message sent successfully
    console.log("message from ok");
  } else {
    // An error occurred
    // throw new Error(response.statusText);
    console.log("error recev");
    console.log(
      "response from else",     

      response,
      " another response",
      response.json()
    );
  }
}



mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Start the server after a successful connection
    var listener = app.listen(process.env.PORT, function () {
      console.log("Your app is listening on port " + listener.address().port);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // Handle the connection error (perhaps by exiting the process)
    process.exit(1);
  });

