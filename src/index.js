import express from 'express';

const app = express();
const port = process.env.PORT || 8000;

// JSON middleware
app.use(express.json());

// Simple route that returns a short message
app.get('/', (req, res) => {
	res.json({ message: 'Hello from Express!' });
});

// Start server and log the full URL
app.listen(port, () => {
	const host = 'localhost';
	console.log(`Server listening at http://${host}:${port}/`);
});
