import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import { initScheduler } from './services/schedulerService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Routes
app.use('/api', apiRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`[TED Procurement Monitor Server] Running on http://localhost:${PORT}`);
  
  // Initialize background scheduler
  initScheduler();
});
