"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComplaintSummary = exports.closeComplaint = exports.updateComplaintAction = exports.createComplaint = exports.getComplaintById = exports.getComplaints = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const D8_STEPS = [
    { step: 1, type: 'D1', title: 'Team Formation', description: 'Form cross-functional team to address the complaint' },
    { step: 2, type: 'D2', title: 'Problem Description', description: 'Describe the problem in detail — Who, What, Where, When, How many' },
    { step: 3, type: 'D3', title: 'Containment Action', description: 'Immediate action to protect customer — sort, screen, replace' },
    { step: 4, type: 'D4', title: 'Root Cause Analysis', description: 'Identify root cause using 5-Why or Ishikawa diagram' },
    { step: 5, type: 'D5', title: 'Corrective Action Plan', description: 'Define permanent corrective actions to eliminate root cause' },
    { step: 6, type: 'D6', title: 'Implement Corrective Action', description: 'Implement and validate corrective actions' },
    { step: 7, type: 'D7', title: 'Preventive Action', description: 'Update control plan, FMEA, work instructions to prevent recurrence' },
    { step: 8, type: 'D8', title: 'Close and Congratulate', description: 'Verify effectiveness, close complaint, recognise team' }
];
const getComplaints = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { complaint_type, status } = req.query;
        const where = { tenant_id };
        if (complaint_type)
            where.complaint_type = String(complaint_type);
        if (status)
            where.status = String(status);
        const complaints = await prisma_1.default.complaintHeader.findMany({
            where,
            include: { actions: { orderBy: { step_number: 'asc' } } },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: complaints });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getComplaints = getComplaints;
const getComplaintById = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = req.params.id;
        const complaint = await prisma_1.default.complaintHeader.findFirst({
            where: { id: String(id), tenant_id: String(tenant_id) },
            include: { actions: { orderBy: { step_number: 'asc' } } }
        });
        if (!complaint)
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        res.json({ success: true, data: complaint });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getComplaintById = getComplaintById;
const createComplaint = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const count = await prisma_1.default.complaintHeader.count({ where: { tenant_id } });
        const complaint_number = `CMP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 5);
        const complaint = await prisma_1.default.complaintHeader.create({
            data: {
                tenant_id,
                complaint_number,
                due_date: dueDate,
                ...req.body,
                raised_date: req.body.raised_date ? new Date(req.body.raised_date) : new Date()
            }
        });
        if (req.body.complaint_type === 'customer') {
            const actions = D8_STEPS.map(step => ({
                tenant_id,
                complaint_id: complaint.id,
                action_type: step.type,
                step_number: step.step,
                description: step.description,
                status: 'pending'
            }));
            await prisma_1.default.complaintAction.createMany({ data: actions });
        }
        else {
            await prisma_1.default.complaintAction.createMany({
                data: [
                    { tenant_id, complaint_id: complaint.id, action_type: 'containment', step_number: 1, description: 'Immediate containment to prevent further impact', status: 'pending' },
                    { tenant_id, complaint_id: complaint.id, action_type: 'rca', step_number: 2, description: 'Root cause analysis — identify why defect occurred', status: 'pending' },
                    { tenant_id, complaint_id: complaint.id, action_type: 'capa', step_number: 3, description: 'Corrective and preventive action', status: 'pending' },
                    { tenant_id, complaint_id: complaint.id, action_type: 'verify', step_number: 4, description: 'Verify effectiveness of corrective action', status: 'pending' }
                ]
            });
        }
        await prisma_1.default.systemAlert.create({
            data: {
                tenant_id,
                alert_type: 'complaint_raised',
                severity: req.body.severity === 'critical' ? 'critical' : 'warning',
                message: `${req.body.complaint_type === 'customer' ? 'Customer complaint' : req.body.complaint_type === 'supplier' ? 'Supplier SCAR' : 'Internal NCR'} raised — ${complaint_number}. 8D due in 5 days.`,
                reference_type: 'complaint',
                reference_id: complaint.id
            }
        });
        const fullComplaint = await prisma_1.default.complaintHeader.findFirst({
            where: { id: complaint.id },
            include: { actions: { orderBy: { step_number: 'asc' } } }
        });
        res.status(201).json({ success: true, data: fullComplaint });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createComplaint = createComplaint;
const updateComplaintAction = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const action_id = req.params.action_id;
        const { description, responsible_person, target_date, completion_date, status, evidence_notes } = req.body;
        await prisma_1.default.complaintAction.updateMany({
            where: { id: String(action_id), tenant_id: String(tenant_id) },
            data: {
                description,
                responsible_person,
                target_date: target_date ? new Date(target_date) : null,
                completion_date: completion_date ? new Date(completion_date) : null,
                status,
                evidence_notes
            }
        });
        const action = await prisma_1.default.complaintAction.findFirst({ where: { id: String(action_id) } });
        if (!action)
            return res.status(404).json({ success: false, error: 'Action not found' });
        const allActions = await prisma_1.default.complaintAction.findMany({ where: { complaint_id: String(action.complaint_id) } });
        const allDone = allActions.every((a) => a.status === 'completed');
        if (allDone) {
            await prisma_1.default.complaintHeader.updateMany({
                where: { id: String(action.complaint_id) },
                data: { status: 'capa_complete' }
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.updateComplaintAction = updateComplaintAction;
const closeComplaint = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = req.params.id;
        const { closed_by, effectiveness_notes } = req.body;
        const complaint = await prisma_1.default.complaintHeader.findFirst({ where: { id: String(id), tenant_id: String(tenant_id) } });
        if (!complaint)
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        const openActions = await prisma_1.default.complaintAction.count({
            where: { complaint_id: String(id), status: { not: 'completed' } }
        });
        if (openActions > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot close — ${openActions} action(s) still pending`
            });
        }
        await prisma_1.default.complaintHeader.updateMany({
            where: { id: String(id), tenant_id: String(tenant_id) },
            data: { status: 'closed', closed_at: new Date(), closed_by }
        });
        const similarComplaints = await prisma_1.default.complaintHeader.count({
            where: {
                tenant_id,
                part_number: complaint.part_number ?? undefined,
                status: 'closed',
                id: { not: String(id) }
            }
        });
        if (similarComplaints > 0) {
            await prisma_1.default.complaintHeader.updateMany({
                where: { id: String(id), tenant_id: String(tenant_id) },
                data: { is_repeat: true }
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.closeComplaint = closeComplaint;
const getComplaintSummary = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const total = await prisma_1.default.complaintHeader.count({ where: { tenant_id } });
        const open = await prisma_1.default.complaintHeader.count({ where: { tenant_id, status: { not: 'closed' } } });
        const customer = await prisma_1.default.complaintHeader.count({ where: { tenant_id, complaint_type: 'customer' } });
        const internal = await prisma_1.default.complaintHeader.count({ where: { tenant_id, complaint_type: 'internal' } });
        const supplier = await prisma_1.default.complaintHeader.count({ where: { tenant_id, complaint_type: 'supplier' } });
        const critical = await prisma_1.default.complaintHeader.count({ where: { tenant_id, severity: 'critical', status: { not: 'closed' } } });
        const repeat = await prisma_1.default.complaintHeader.count({ where: { tenant_id, is_repeat: true } });
        const today = new Date();
        const overdue = await prisma_1.default.complaintHeader.count({
            where: {
                tenant_id,
                status: { not: 'closed' },
                due_date: { lt: today }
            }
        });
        res.json({
            success: true,
            data: { total, open, customer, internal, supplier, critical, repeat, overdue }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getComplaintSummary = getComplaintSummary;
