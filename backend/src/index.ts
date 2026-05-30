import 'dotenv/config';

import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { connectDatabase } from './config/database';
import { swaggerSpec } from './config/swagger';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import storeRoutes from './routes/stores';
import inventoryRoutes from './routes/inventory';
import matchingRoutes from './routes/matching';
import transferRoutes from './routes/transfers';
import { errorHandler } from './middleware/errorHandler';
import { setSocketServer } from './controllers/inventoryController';
import { setSocketServerTransfer } from './controllers/transferController';

const app = express();
const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || '*' },
});
setSocketServer(io);
setSocketServerTransfer(io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.', code: 'TOO_MANY_ATTEMPTS' },
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transfers', transferRoutes);
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
        console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
      });
    })
    .catch((err) => {
      console.error('[FATAL] Database connection failed:', err.message);
      process.exit(1);
    });
}

export { app, httpServer, io };
