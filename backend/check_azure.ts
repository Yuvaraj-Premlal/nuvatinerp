// Simulate what Azure does — does dist/index.js exist after build?
import * as fs from 'fs';
const distExists = fs.existsSync('./dist/index.js');
const generatedExists = fs.existsSync('./generated/prisma/index.js');
const distConfigExists = fs.existsSync('./dist/config/prisma.js');
process.stdout.write(`dist/index.js: ${distExists}\n`);
process.stdout.write(`generated/prisma/index.js: ${generatedExists}\n`);
process.stdout.write(`dist/config/prisma.js: ${distConfigExists}\n`);
// Check what dist/config/prisma.js actually imports
if (distConfigExists) {
  const content = fs.readFileSync('./dist/config/prisma.js', 'utf8');
  process.stdout.write(`dist/config/prisma.js content:\n${content}\n`);
}
