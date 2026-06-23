import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

import connectDB from './config/db.js';
import schema from './graphql/schema.js';

const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const httpServer = http.createServer(app);

const server = new ApolloServer({
  schema,
  // Introspection powers the Sandbox in dev, but exposes your full schema —
  // so it's enabled only outside production.
  introspection: !isProduction,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

async function startServer() {
  // 1. Establish the data layer before we accept any traffic.
  await connectDB();

  // 2. Apollo must be started before being mounted as middleware.
  await server.start();

  // 3. Core middleware: CORS + JSON body parsing.
  app.use(
    cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' })
  );
  app.use(express.json());

  // 4. Mount GraphQL with a context function.
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => ({ req }),
    })
  );

  // 5. Listen via the HTTP server 
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log(`📡 Express 5 server running on http://localhost:${PORT}`);
  console.log(`🚀 Apollo GraphQL ready at http://localhost:${PORT}/graphql`);
}

startServer().catch((error) => {
  console.error(`❌ Failed to start server: ${error.message}`);
  process.exit(1);
});