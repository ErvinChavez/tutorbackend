import 'dotenv/config';
import express from 'express';
import connectDB from './config/db.js'; // Imports Claude's new connection script

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize the database connection
connectDB();

// A simple health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running smoothly' });
});

app.listen(PORT, () => {
  console.log(`📡 Server running on http://localhost:${PORT}`);
});
