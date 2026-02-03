import { WebSocketServer } from "ws";
import { WebSocket } from "ws";
import { wsArcjet } from "../arcjet.js";

/**
 * Send a JavaScript value as a JSON-encoded message over a WebSocket if the socket is open.
 * @param {WebSocket} socket - The WebSocket to send the message on.
 * @param {*} payload - The value to JSON-encode and send.
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
 * Attach a WebSocket server to the provided HTTP server and manage client connections and heartbeat.
 * @param {import('http').Server} server - HTTP server to bind the WebSocket server to.
 * @returns {{ broadCastMatchCreated: (match: any) => void }} An object exposing `broadCastMatchCreated(match)`, which broadcasts a `match_created` message with `match` as payload to all connected clients.
 */
export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024
    });

    wss.on('connection', async (socket,request) => {

        if(wsArcjet){
            try{
                const decision = await wsArcjet.protect(request);

                if (decision.isDenied) {
                    const reason = decision.reason.isRateLimit() ? 'Rate limit exceeded' : 'Access denied';
                    const code = decision.reason.isRateLimit() ? 1013 : 1008; // Custom close codes

                    socket.close(code, reason);
                    return;
                }

            }catch(err){
                console.error("WS connection error:", err);
                socket.close(1011, 'Server security error');
                return;
            }
        }
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