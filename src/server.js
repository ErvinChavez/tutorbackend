import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4'; 
import connectDB from './config/db.js';
import schema from './graphql/schema.js';

const app = express();
const PORT = process.env.PORT || 4000;

// 1. Establish data layer connection first
connectDB();

// 2. Load body parsing and cors BEFORE anything else reads incoming traffic
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// 3. Initialize the Apollo Server orchestration instance
const server = new ApolloServer({
  schema,
  introspection: true,
});

// 4. Await the server compilation boot layer
await server.start();

// 5. Mount the compiled engine onto Express AFTER express.json() is active
app.use('/graphql', expressMiddleware(server));

app.listen(PORT, () => {
  console.log(`📡 Express server running on http://localhost:${PORT}`);
  console.log(`🚀 Apollo GraphQL Sandbox ready at http://localhost:${PORT}/graphql`);
});
