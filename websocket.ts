import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';

let _wss = null;

const availableChannels = ['TasksIndexChannel'];

const connectedClients: Set<WebSocket> = new Set();
const clientUserIds: Map<WebSocket, string> = new Map();
const clientChannels: Map<WebSocket, string> = new Map();

const startWebsocketServer = async () => {
  _wss = new WebSocketServer({ port: 8080 });
  const secretKey = process.env.SECRET_KEY;

  _wss.on('connection', function connection(ws, request) {
    const token = request.headers['authorization'];

    jwt.verify(token, secretKey, (err, decoded) => {
      const userId = decoded.id;

      // Handle invalid token
      if (err) {
        ws.terminate();
        return;
      }

      // Handle WS error
      ws.on('error', console.error);

      // Handle WS incoming message - subscribe/unsubscribe channels
      ws.on('message', function message(data) {
        try {
          const payload = JSON.parse(data);

          const channel = payload?.identifier?.channel || '';

          if (payload?.command === 'subscribe') {
            if (availableChannels.includes(channel)) {
              const subscribePayload = {
                type: 'confirmSubscription',
                identifier: {
                  channel,
                },
              };
              clientChannels.set(ws, channel);
              ws.send(JSON.stringify(subscribePayload));
            } else {
              ws.send(JSON.stringify({ type: 'error', message: 'Channel does not exist' }));
            }
          }

          if (payload?.command === 'unsubscribe') {
            if (availableChannels.includes(channel)) {
              const unsubscribePayload = {
                type: 'confirmUnsubscription',
                identifier: {
                  channel,
                },
              };
              clientChannels.delete(ws);
              ws.send(JSON.stringify(unsubscribePayload));
            } else {
              ws.send(JSON.stringify({ type: 'error', message: 'Channel does not exist' }));
            }
          }
        } catch (_) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid payload' }));
        }
      });

      // Handle WS connection close
      ws.on('close', () => {
        connectedClients.delete(ws);
        clientUserIds.delete(ws);
        clientChannels.delete(ws);
      });

      // Add userId to WS object
      clientUserIds.set(ws, userId);

      // Add client to connected clients
      connectedClients.add(ws);

      ws.send(JSON.stringify({ type: 'welcome', message: 'Welcome!' }));
    });
  });
};

const sendWebSocketMessage = (data: unknown, channel, receiversIds, messageType) => {
  connectedClients.forEach((client) => {
    const receiverId = clientUserIds.get(client);
    const clientChannel = clientChannels.get(client);

    if (client.readyState === WebSocket.OPEN && clientChannel === channel && receiversIds.includes(receiverId)) {
      const payload = {
        identifier: {
          channel,
        },
        message: {
          actionType: messageType,
          data,
        },
      };
      client.send(JSON.stringify(payload));
    }
  });
};

export { startWebsocketServer, _wss, sendWebSocketMessage };
