"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_cron_1 = __importDefault(require("node-cron"));
const toc_scheduler_1 = require("./jobs/toc.scheduler");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const tenant_routes_1 = __importDefault(require("./routes/tenant.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const item_routes_1 = __importDefault(require("./routes/item.routes"));
const pfep_routes_1 = __importDefault(require("./routes/pfep.routes"));
const supplier_routes_1 = __importDefault(require("./routes/supplier.routes"));
const machine_routes_1 = __importDefault(require("./routes/machine.routes"));
const die_routes_1 = __importDefault(require("./routes/die.routes"));
const bom_routes_1 = __importDefault(require("./routes/bom.routes"));
const routing_routes_1 = __importDefault(require("./routes/routing.routes"));
const purchase_routes_1 = __importDefault(require("./routes/purchase.routes"));
const grn_routes_1 = __importDefault(require("./routes/grn.routes"));
const jobcard_routes_1 = __importDefault(require("./routes/jobcard.routes"));
const quality_routes_1 = __importDefault(require("./routes/quality.routes"));
const dispatch_routes_1 = __importDefault(require("./routes/dispatch.routes"));
const vendor_routes_1 = __importDefault(require("./routes/vendor.routes"));
const stock_routes_1 = __importDefault(require("./routes/stock.routes"));
const oee_routes_1 = __importDefault(require("./routes/oee.routes"));
const customer_routes_1 = __importDefault(require("./routes/customer.routes"));
const toc_routes_1 = __importDefault(require("./routes/toc.routes"));
const alert_routes_1 = __importDefault(require("./routes/alert.routes"));
const factory_routes_1 = __importDefault(require("./routes/factory.routes"));
const finance_routes_1 = __importDefault(require("./routes/finance.routes"));
const complaint_routes_1 = __importDefault(require("./routes/complaint.routes"));
const maintenance_routes_1 = __importDefault(require("./routes/maintenance.routes"));
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const costing_routes_1 = __importDefault(require("./routes/costing.routes"));
const owner_routes_1 = __importDefault(require("./routes/owner.routes"));
const quarantine_routes_1 = __importDefault(require("./routes/quarantine.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'nuvatin-erp-backend',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/tenants', tenant_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/items', item_routes_1.default);
app.use('/api/pfep', pfep_routes_1.default);
app.use('/api/suppliers', supplier_routes_1.default);
app.use('/api/machines', machine_routes_1.default);
app.use('/api/dies', die_routes_1.default);
app.use('/api/bom', bom_routes_1.default);
app.use('/api/routing', routing_routes_1.default);
app.use('/api/purchase', purchase_routes_1.default);
app.use('/api/grn', grn_routes_1.default);
app.use('/api/jobcards', jobcard_routes_1.default);
app.use('/api/quality', quality_routes_1.default);
app.use('/api/dispatch', dispatch_routes_1.default);
app.use('/api/vendors', vendor_routes_1.default);
app.use('/api/stock', stock_routes_1.default);
app.use('/api/oee', oee_routes_1.default);
app.use('/api/customers', customer_routes_1.default);
app.use('/api/toc', toc_routes_1.default);
app.use('/api/alerts', alert_routes_1.default);
app.use('/api/factory', factory_routes_1.default);
app.use('/api/finance', finance_routes_1.default);
app.use('/api/complaints', complaint_routes_1.default);
app.use('/api/maintenance', maintenance_routes_1.default);
app.use('/api/reports', reports_routes_1.default);
app.use('/api/costing', costing_routes_1.default);
app.use('/api/owner', owner_routes_1.default);
app.use('/api/quarantine', quarantine_routes_1.default);
// TOC Scheduler — 6 AM and 2 PM daily
node_cron_1.default.schedule('0 6 * * *', () => { console.log('[CRON] 6 AM TOC run'); (0, toc_scheduler_1.runTOCForAllTenants)().catch(console.error); });
node_cron_1.default.schedule('0 14 * * *', () => { console.log('[CRON] 2 PM TOC run'); (0, toc_scheduler_1.runTOCForAllTenants)().catch(console.error); });
app.listen(PORT, () => {
    console.log('Nuvatin ERP backend running on port ' + PORT);
});
exports.default = app;
