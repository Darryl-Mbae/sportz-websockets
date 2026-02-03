import { WebSocketServer } from "ws";
import { WebSocket } from "ws";

/**
 * Sends the given payload as a JSON-formatted message over the WebSocket if the socket is open.
 * @param {WebSocket} socket - The target WebSocket; message is sent only when its readyState is WebSocket.OPEN.
 * @param {*} payload - Value to be JSON-stringified and transmitted.
 */
function sendJSON(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

/**
 * Broadcasts a JSON-serializable payload to all open clients of a WebSocketServer.
 *
 * The payload is serialized with JSON.stringify and sent to each client whose
 * readyState equals WebSocket.OPEN. If a non-open client is encountered, the
 * function stops and does not continue broadcasting to remaining clients.
 *
 * @param {WebSocketServer} wss - The WebSocketServer whose connected clients will receive the payload.
 * @param {*} payload - The value to serialize and send to each open client.
 */
function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }

}

/**
 * Attaches a WebSocketServer to an existing HTTP server and exposes a helper to broadcast match creation events.
 *
 * @param {import('http').Server} server - HTTP server to attach the WebSocketServer to.
 * @returns {{ broadCastMatchCreated: (match: any) => void }} An object with a `broadCastMatchCreated(match)` method that broadcasts a `match_created` event with the provided match data to all connected WebSocket clients.
 */
export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024
    });

    wss.on('connection', (socket) => {
        socket.isAlive = true;

        socket.on('pong', () => {
            socket.isAlive = true;
        });


        sendJSON(socket, { type: 'welcome' });

        socket.on('error',console.error);
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(interval);
    });

    function broadCastMatchCreated(match) {
        broadcast(wss, { type: 'match_created', data: match });
    }

    return { broadCastMatchCreated };
}