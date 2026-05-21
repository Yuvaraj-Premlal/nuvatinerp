import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getOEE = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const machine_id = req.params.machine_id as string;
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate.setHours(0,0,0,0));
    const endOfDay = new Date(targetDate.setHours(23,59,59,999));

    const machine = await prisma.machineMaster.findFirst({ where: { id: machine_id, tenant_id } });
    if (!machine) return res.status(404).json({ success: false, error: 'Machine not found' });

    const jobs = await prisma.jobCard.findMany({
      where: { tenant_id, machine_id, planned_date: { gte: startOfDay, lte: endOfDay } },
      include: { shot_logs: true, downtime_logs: true }
    });

    const totalShots = jobs.reduce((sum: number, j: any) => sum + j.shot_logs.length, 0);
    const goodShots = jobs.reduce((sum: number, j: any) => sum + j.actual_quantity_good, 0);
    const totalDowntimeMin = jobs.reduce((sum: number, j: any) =>
      sum + j.downtime_logs.reduce((s: number, d: any) => s + (d.duration_min || 0), 0), 0);

    const shiftMinutes = 480;
    const availableMinutes = shiftMinutes - totalDowntimeMin;
    const availability = availableMinutes / shiftMinutes;
    const ratedCycleTimeSec = machine.rated_cycle_time_sec ?? 48;
    const theoreticalShots = (availableMinutes * 60) / ratedCycleTimeSec;
    const performance = theoreticalShots > 0 ? Math.min(totalShots / theoreticalShots, 1) : 0;
    const quality = totalShots > 0 ? goodShots / totalShots : 0;
    const oee = availability * performance * quality * 100;

    res.json({
      success: true,
      data: {
        machine_id,
        machine_name: machine.machine_name,
        date: startOfDay,
        availability: Math.round(availability * 100),
        performance: Math.round(performance * 100),
        quality: Math.round(quality * 100),
        oee: Math.round(oee),
        total_shots: totalShots,
        good_shots: goodShots,
        downtime_minutes: totalDowntimeMin,
        oee_target: machine.oee_target_percent
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
