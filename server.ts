import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { startOpcuaServer, triggerManualFault } from './server/opcua_server.ts';
import { startOpcuaClient } from './server/opcua_client.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startAppServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected to socket');
    socket.on('inject_fault', () => {
      console.log('Manual fault injection triggered');
      triggerManualFault();
    });
  });

  const PORT = 3000;

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Start OPC-UA Server
  console.log('[Main] Starting OPC-UA Server...');
  const opcuaServer = await startOpcuaServer();
  console.log('[Main] OPC-UA Server is up.');

  // Wait a bit for server to be fully ready before client connects
  console.log('[Main] Waiting 2s for server stabilization...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Start OPC-UA Client and pass Socket.io instance for real-time updates
  console.log('[Main] Starting OPC-UA Client...');
  await startOpcuaClient(io);
  console.log('[Main] OPC-UA Client initialization triggered.');

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`OPC-UA Server is active`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await opcuaServer.shutdown();
    process.exit(0);
  });
}

startAppServer().catch((err) => {
  console.error('Failed to start server:', err);
});
