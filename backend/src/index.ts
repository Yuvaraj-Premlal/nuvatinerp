import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import tenantRoutes from './routes/tenant.routes';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import itemRoutes from './routes/item.routes';
import pfepRoutes from './routes/pfep.routes';
import supplierRoutes from './routes/supplier.routes';
import machineRoutes from './routes/machine.routes';
import dieRoutes from './routes/die.routes';
import bomRoutes from './routes/bom.routes';
import routingRoutes from './routes/routing.routes';
import purchaseRoutes from './routes/purchase.routes';
import grnRoutes from './routes/grn.routes';
import jobcardRoutes from './routes/jobcard.routes';
import qualityRoutes from './routes/quality.routes';
import dispatchRoutes from './routes/dispatch.routes';
import vendorRoutes from './routes/vendor.routes';
import stockRoutes from './routes/stock.routes';
import oeeRoutes from './routes/oee.routes';
import customerRoutes from './routes/customer.routes';

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
app.use('/api/pfep', pfepRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/dies', dieRoutes);
app.use('/api/bom', bomRoutes);
app.use('/api/routing', routingRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/jobcards', jobcardRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/oee', oeeRoutes);
app.use('/api/customers', customerRoutes);

app.listen(PORT, () => {
  console.log('Nuvatin ERP backend running on port ' + PORT);
});

export default app;
