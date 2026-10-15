// scripts/refresh-sp500.mjs - rewrite data/sp500.txt from the public constituents list (github.com/datasets/
// s-and-p-500-companies). Look at the diff before committing; the server reads the list at start.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/config.js';

const URL_CSV = 'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv';
const r = await fetch(URL_CSV, { signal: AbortSignal.timeout(20_000) });
if (!r.ok) { console.error(`refresh-sp500: HTTP ${r.status}`); process.exit(1); }
const syms = [...new Set((await r.text()).split('\n').slice(1).map((l) => l.split(',')[0].trim()).filter((s) => /^[A-Z]{1,5}(\.[A-Z])?$/.test(s)))].sort();
if (syms.length < 490 || syms.length > 510) { console.error(`refresh-sp500: ${syms.length} symbols, expected about 503; nothing written`); process.exit(1); }
const head = `# S&P 500 constituents, one ticker per line (Alpaca's format: BRK.B). From github.com/datasets/s-and-p-500-companies\n# data/constituents.csv as of ${new Date().toISOString().slice(0, 10)}. Refresh: npm run refresh-sp500\n`;
fs.writeFileSync(path.join(ROOT, 'data', 'sp500.txt'), `${head}${syms.join('\n')}\n`);
console.log(`data/sp500.txt: ${syms.length} symbols`);
