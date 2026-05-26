import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import storeRoutes from './routes/stores';
import inventoryRoutes from './routes/inventory';
import matchingRoutes from './routes/matching';
import { errorHandler } from './middleware/errorHandler';
import { setSocketServer } from './controllers/inventoryController';

const app = express();
const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || '*' },
});
setSocketServer(io);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(
  rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false })
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api', matchingRoutes);

app.use(errorHandler);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`SmartShelf API running on port ${PORT}`);
});

export { app };
