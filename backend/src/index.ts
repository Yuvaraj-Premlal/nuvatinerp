import express from 'express';
import cron from 'node-cron';
import { runTOCForAllTenants } from './jobs/toc.scheduler';
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
import tocRoutes from './routes/toc.routes';
import alertRoutes from './routes/alert.routes';
import factoryRoutes from './routes/factory.routes';
import financeRoutes from './routes/finance.routes';
import complaintRoutes from './routes/complaint.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import reportsRoutes from './routes/reports.routes';
import costingRoutes from './routes/costing.routes';
import ownerRoutes from './routes/owner.routes';
import quarantineRoutes from './routes/quarantine.routes';
import batchRoutes from './routes/batch.routes';
import locationRoutes from './routes/location.routes';
import meltRoutes from './routes/melt.routes';
import mwoRoutes from './routes/mwo.routes';
import mrRoutes from './routes/mr.routes';
import costCentreRoutes from './routes/costcentre.routes';
import paymentTermsRoutes from './routes/paymentterms.routes';
import auditLogRoutes from './routes/auditlog.routes';
import itemPriceRoutes from './routes/itemprice.routes';

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
app.use('/api/toc', tocRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/factory', factoryRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/costing', costingRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/quarantine', quarantineRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/melt', meltRoutes);
app.use('/api/mwo', mwoRoutes);
app.use('/api', mrRoutes);
app.use('/api/cost-centres', costCentreRoutes);
app.use('/api/payment-terms', paymentTermsRoutes);
app.use('/api/audit', auditLogRoutes);
app.use('/api/items', itemPriceRoutes);

// TOC Scheduler — 6 AM and 2 PM daily
cron.schedule('0 6 * * *', () => { console.log('[CRON] 6 AM TOC run'); runTOCForAllTenants().catch(console.error); });
cron.schedule('0 14 * * *', () => { console.log('[CRON] 2 PM TOC run'); runTOCForAllTenants().catch(console.error); });

app.listen(PORT, () => {
  console.log('Nuvatin ERP backend running on port ' + PORT);
});

export default app;
