// Bundle only our own two source modules for Cloudflare's single-file editor.
import { readFile, writeFile } from 'node:fs/promises';
const insight = await readFile(new URL('./src/insight.mjs', import.meta.url), 'utf8');
const contract = await readFile(new URL('../insight-contract.js', import.meta.url), 'utf8');
const main = await readFile(new URL('./src/index.js', import.meta.url), 'utf8');
const target = process.argv[2];
if (!target) throw Error('Supply a new output path outside the static dist directory.');
await writeFile(target, contract + '\n' + insight.replace("import '../../insight-contract.js';", '').replace('export async function insight', 'async function insight') + '\n' + main.replace("import { insight } from './insight.mjs';", ''), { flag: 'wx' });
console.log('Dashboard Worker bundle created (no secrets).');
