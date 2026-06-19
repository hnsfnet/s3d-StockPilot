import express from 'express';
import cors from 'cors';
import { productRouter } from './routes/productRoutes';
import { stockRouter } from './routes/stockRoutes';
import { stocktakeRouter } from './routes/stocktakeRoutes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/products', productRouter);
app.use('/api/stock', stockRouter);
app.use('/api/stocktakes', stocktakeRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
