import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

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

export const getComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { complaint_type, status } = req.query;
    const where: any = { tenant_id };
    if (complaint_type) where.complaint_type = String(complaint_type);
    if (status) where.status = String(status);

    const complaints = await prisma.complaintHeader.findMany({
      where,
      include: { actions: { orderBy: { step_number: 'asc' } } },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data: complaints });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getComplaintById = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id;
    const complaint = await prisma.complaintHeader.findFirst({
      where: { id, tenant_id },
      include: { actions: { orderBy: { step_number: 'asc' } } }
    });
    if (!complaint) return res.status(404).json({ success: false, error: 'Complaint not found' });
    res.json({ success: true, data: complaint });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const count = await prisma.complaintHeader.count({ where: { tenant_id } });
    const complaint_number = `CMP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);

    const complaint = await prisma.complaintHeader.create({
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
      await prisma.complaintAction.createMany({ data: actions });
    } else {
      await prisma.complaintAction.createMany({
        data: [
          { tenant_id, complaint_id: complaint.id, action_type: 'containment', step_number: 1, description: 'Immediate containment to prevent further impact', status: 'pending' },
          { tenant_id, complaint_id: complaint.id, action_type: 'rca', step_number: 2, description: 'Root cause analysis — identify why defect occurred', status: 'pending' },
          { tenant_id, complaint_id: complaint.id, action_type: 'capa', step_number: 3, description: 'Corrective and preventive action', status: 'pending' },
          { tenant_id, complaint_id: complaint.id, action_type: 'verify', step_number: 4, description: 'Verify effectiveness of corrective action', status: 'pending' }
        ]
      });
    }

    await prisma.systemAlert.create({
      data: {
        tenant_id,
        alert_type: 'complaint_raised',
        severity: req.body.severity === 'critical' ? 'critical' : 'warning',
        message: `${req.body.complaint_type === 'customer' ? 'Customer complaint' : req.body.complaint_type === 'supplier' ? 'Supplier SCAR' : 'Internal NCR'} raised — ${complaint_number}. 8D due in 5 days.`,
        reference_type: 'complaint',
        reference_id: complaint.id
      }
    });

    const fullComplaint = await prisma.complaintHeader.findFirst({
      where: { id: complaint.id },
      include: { actions: { orderBy: { step_number: 'asc' } } }
    });

    res.status(201).json({ success: true, data: fullComplaint });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateComplaintAction = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const action_id = req.params.action_id;
    const { description, responsible_person, target_date, completion_date, status, evidence_notes } = req.body;

    await prisma.complaintAction.updateMany({
      where: { id: action_id, tenant_id },
      data: {
        description,
        responsible_person,
        target_date: target_date ? new Date(target_date) : null,
        completion_date: completion_date ? new Date(completion_date) : null,
        status,
        evidence_notes
      }
    });

    const action = await prisma.complaintAction.findFirst({ where: { id: action_id } });
    if (!action) return res.status(404).json({ success: false, error: 'Action not found' });

    const allActions = await prisma.complaintAction.findMany({ where: { complaint_id: action.complaint_id } });
    const allDone = allActions.every((a: any) => a.status === 'completed');

    if (allDone) {
      await prisma.complaintHeader.updateMany({
        where: { id: action.complaint_id },
        data: { status: 'capa_complete' }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const closeComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id;
    const { closed_by, effectiveness_notes } = req.body;

    const complaint = await prisma.complaintHeader.findFirst({ where: { id, tenant_id } });
    if (!complaint) return res.status(404).json({ success: false, error: 'Complaint not found' });

    const openActions = await prisma.complaintAction.count({
      where: { complaint_id: id, status: { not: 'completed' } }
    });

    if (openActions > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot close — ${openActions} action(s) still pending`
      });
    }

    await prisma.complaintHeader.updateMany({
      where: { id, tenant_id },
      data: { status: 'closed', closed_at: new Date(), closed_by }
    });

    const similarComplaints = await prisma.complaintHeader.count({
      where: {
        tenant_id,
        part_number: complaint.part_number || undefined,
        status: 'closed',
        id: { not: id }
      }
    });

    if (similarComplaints > 0) {
      await prisma.complaintHeader.updateMany({
        where: { id, tenant_id },
        data: { is_repeat: true }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getComplaintSummary = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;

    const total = await prisma.complaintHeader.count({ where: { tenant_id } });
    const open = await prisma.complaintHeader.count({ where: { tenant_id, status: { not: 'closed' } } });
    const customer = await prisma.complaintHeader.count({ where: { tenant_id, complaint_type: 'customer' } });
    const internal = await prisma.complaintHeader.count({ where: { tenant_id, complaint_type: 'internal' } });
    const supplier = await prisma.complaintHeader.count({ where: { tenant_id, complaint_type: 'supplier' } });
    const critical = await prisma.complaintHeader.count({ where: { tenant_id, severity: 'critical', status: { not: 'closed' } } });
    const repeat = await prisma.complaintHeader.count({ where: { tenant_id, is_repeat: true } });

    const today = new Date();
    const overdue = await prisma.complaintHeader.count({
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
