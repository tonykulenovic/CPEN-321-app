import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { connectDB } from './config/database';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler.middleware';
import router from './routes/routes';
import path from 'path';
import { locationGateway } from './realtime/gateway';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

app.use('/api', router);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('*', notFoundHandler);
app.use(errorHandler);

// Initialize location gateway with Socket.io
locationGateway.initialize(httpServer);

connectDB();
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io enabled for real-time location updates`);
});
