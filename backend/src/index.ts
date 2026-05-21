import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import tenantRoutes from './routes/tenant.routes';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import itemRoutes from './routes/item.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'nuvatin-erp-backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);

app.listen(PORT, () => {
  console.log(`Nuvatin ERP backend running on port ${PORT}`);
});

export default app;
