import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4'; 
import connectDB from './config/db.js';
import schema from './graphql/schema.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB Atlas
connectDB();

// Core Cross-Origin and JSON Parsing Middlewares
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// Initialize Apollo Server with your master schema
const server = new ApolloServer({
  schema,
  introspection: true,
});

// Start Apollo Server before applying it as middleware
await server.start();

// Mount the GraphQL endpoint at /graphql
app.use('/graphql', expressMiddleware(server));

app.listen(PORT, () => {
  console.log(`📡 Express server running on http://localhost:${PORT}`);
  console.log(`🚀 Apollo GraphQL Sandbox ready at http://localhost:${PORT}/graphql`);
});
