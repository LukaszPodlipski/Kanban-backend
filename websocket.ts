import { WebSocketServer, WebSocket } from 'ws';
import { URLSearchParams } from 'url';
import jwt from 'jsonwebtoken';
import { compareObjects } from './helpers/';

let _wss = null;

interface iMapParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

class MapWithParams {
  mainMap: Map<WebSocket, string>;
  params: Map<WebSocket, iMapParams>;

  constructor() {
    this.mainMap = new Map();
    this.params = new Map();
  }

  set(key: WebSocket, value: string, params: iMapParams | undefined) {
    this.mainMap.set(key, value);
    this.params.set(key, params);
  }

  get(key: WebSocket): string | undefined {
    return this.mainMap.get(key);
  }

  getMapParams(key: WebSocket): iMapParams | undefined {
    return this.params.get(key);
  }

  delete(key: WebSocket): boolean {
    const resultMain = this.mainMap.delete(key);
    const resultAdditional = this.params.delete(key);
    return resultMain && resultAdditional;
  }
}

const availableChannels = ['TasksIndexChannel'];

const connectedClients: Set<WebSocket> = new Set();
const clientUserIds: Map<WebSocket, number> = new Map();
const clientChannels = new MapWithParams();

interface JwtPayload {
  id: number;
}

const startWebsocketServer = async () => {
  _wss = new WebSocketServer({ port: 8080 });
  const secretKey = process.env.SECRET_KEY;

  _wss.on('connection', function connection(ws, request) {
    const urlParams = new URLSearchParams(request.url.split('?')[1]);
    const token = urlParams.get('Authorization');

    jwt.verify(token, secretKey, (err, decoded: JwtPayload) => {
      const userId = decoded?.id;

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
          const params = payload?.identifier?.params || {};

          if (payload?.command === 'subscribe') {
            if (availableChannels.includes(channel)) {
              const subscribePayload = {
                type: 'confirmSubscription',
                identifier: {
                  channel,
                },
              };
              clientChannels.set(ws, channel, params);
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

const sendWebSocketMessage = (payload) => {
  const { data, itemType, messageType, channel, channelParams, receiversIds } = payload || {};
  connectedClients.forEach((client) => {
    const receiverId = clientUserIds.get(client);
    const clientChannel = clientChannels.get(client);
    const clientParams = clientChannels.getMapParams(client);

    const webSocketOpen = client.readyState === WebSocket.OPEN;
    const channelMatch = clientChannel === channel;
    const paramsMatch = compareObjects(channelParams, clientParams);
    const receiversMatch = receiversIds.includes(receiverId);

    if (webSocketOpen && channelMatch && paramsMatch && receiversMatch) {
      const payload = {
        identifier: {
          channel,
        },
        message: {
          itemType,
          actionType: messageType,
          data,
        },
      };
      client.send(JSON.stringify(payload));
    }
  });
};

export { startWebsocketServer, _wss, sendWebSocketMessage };
