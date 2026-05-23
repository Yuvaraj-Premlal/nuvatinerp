import prisma from './src/config/prisma';
async function main() {
  const jobs = await prisma.jobCard.findMany({
    where: { tenant_id: 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e' },
    select: { job_number: true, planned_date: true, actual_quantity_good: true }
  });
  jobs.forEach(j => process.stdout.write(`${j.job_number} | ${j.planned_date} | ${j.actual_quantity_good}\n`));
}
main().finally(() => prisma.$disconnect());
