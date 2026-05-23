import prisma from './src/config/prisma';
async function main() {
  const tenant_id = 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e';
  const dateStr = '2026-05-21';
  const from = new Date(`${dateStr}T00:00:00.000Z`);
  const to = new Date(`${dateStr}T23:59:59.999Z`);
  process.stdout.write(`From: ${from}\nTo: ${to}\n`);
  const jobs = await prisma.jobCard.findMany({
    where: { tenant_id, planned_date: { gte: from, lte: to } },
    include: { job_operations: true, shot_logs: true, downtime_logs: true, rejection_logs: true, item: { select: { item_name: true, item_code: true } } }
  });
  process.stdout.write(`Jobs found: ${jobs.length}\n`);
  jobs.forEach((j: any) => process.stdout.write(`${j.job_number} | ops: ${j.job_operations.length}\n`));
}
main().catch(e => process.stderr.write(e.message)).finally(() => prisma.$disconnect());
