import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { connectDB } from './core/config/database';
import {
  errorHandler,
  notFoundHandler,
} from './core/middleware/errorHandler.middleware';
import router from './routes';
import path from 'path';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

app.use('/api', router);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('*', notFoundHandler);
app.use(errorHandler);

connectDB();
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
