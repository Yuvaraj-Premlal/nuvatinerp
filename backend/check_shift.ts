import prisma from './src/config/prisma';
async function main() {
  const tenant_id = 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e';
  const from = new Date('2026-05-21T00:00:00.000Z');
  const to = new Date('2026-05-21T23:59:59.000Z');
  const jobs = await prisma.jobCard.findMany({
    where: { tenant_id, planned_date: { gte: from, lte: to } },
    include: { shot_logs: true, downtime_logs: true, rejection_logs: true }
  });
  process.stdout.write(`Jobs found: ${jobs.length}\n`);
  jobs.forEach((j: any) => process.stdout.write(`${j.job_number} | shots: ${j.shot_logs.length} | downtime: ${j.downtime_logs.length}\n`));
}
main().finally(() => prisma.$disconnect());
