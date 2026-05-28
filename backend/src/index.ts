import 'dotenv/config';

// Required environment variables
const required = ['MONGODB_URI', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[WARN] Missing env var: ${key} – using defaults`);
  }
}

import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { connectDatabase } from './config/database';
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

// Rate limit ONLY login endpoint (brute force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth/login', loginLimiter);
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

if (process.env.NODE_ENV !== 'test') {
  connectDatabase()
    .then(() => {
      httpServer.listen(PORT, () => {
        console.log(`SmartShelf API running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[FATAL] Database connection failed:', err.message);
      process.exit(1);
    });
}

export { app, httpServer, io };
