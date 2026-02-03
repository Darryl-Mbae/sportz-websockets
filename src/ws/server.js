import { WebSocketServer } from "ws";
import { WebSocket } from "ws";
import { wsArcjet } from "../arcjet.js";

function sendJSON(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }

}

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