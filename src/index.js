import express from 'express';
import { matchRouter } from './routes/matches.js';
import http from 'http';
import { attachWebSocketServer } from './ws/server.js';
import { securityMiddleware } from './arcjet.js';
import { commentaryRouter } from './routes/commentary.js';


const port = Number(process.env.PORT || 8000) ;
const host = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);


// JSON middleware
app.use(express.json());
app.use(securityMiddleware());

// Simple route that returns a short message
app.get('/', (req, res) => {
	res.json({ message: 'Hello from Express!' });
});

app.use('/matches',matchRouter);
app.use('/matches/:id/commentary',commentaryRouter);

const { broadcastMatchCreated, broadcastCommentary } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;


// Start server and log the full URL
server.listen(port, host, () => {
	const baseURL = host === '0.0.0.0' ? `http://localhost:${port}` : `http://${host}:${port}`;
	console.log(`Server running on ${baseURL}`);
	console.log(`WebSocket server is running on ${baseURL.replace('http', 'ws')}/ws`);
	
});
