import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

const version = typeof packageJson.version === 'string' && packageJson.version.trim()
  ? packageJson.version.trim()
  : 'unknown';

const outPath = path.join(projectRoot, 'src', 'app', 'app-version.ts');
const content = `export const APP_VERSION = ${JSON.stringify(version)} as const;\n`;

await fs.writeFile(outPath, content, 'utf8');
console.log(`Wrote ${outPath} (APP_VERSION=${version})`);
