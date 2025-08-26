#!/usr/bin/env node
/**
 * Scans repo for suspicious ellipses ("" or "") that are likely truncations,
 * ignoring legitimate JS/TS spread/rest ("args", "{ obj }", "[arr]") and simple object-literal leading spreads.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || process.cwd();
const OUT = process.argv[3] || path.join(process.cwd(), 'QW_LOG', 'STEP_03', 'CHECKS', 'no_truncation.txt');

const exts = new Set(['.ts','.tsx','.js','.jsx']);
const legitSpread = /\.\.\.\s*[A-Za-z_\$][A-Za-z0-9_\$]*/;
const legitObjectSpread = /\{[^}]*\.\.\.[^}]+\}/;
const legitArraySpread = /\[[^\]]*\.\.\.[^\]]+\]/;
const urlLike = /(https?:\/\/|mailto:)/i;

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name.startsWith('.git') || ent.name === 'tools') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (exts.has(path.extname(ent.name))) checkFile(full);
  }
}

let hits = [];
function checkFile(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const lines = txt.split(/\r?\n/);
  let braceDepth = 0;
  lines.forEach((line, i) => {
    const l = line.trim();
    // naive brace depth (doesn't handle strings/comments perfectly but good enough)
    const openCount = (line.match(/\{/g) || []).length;
    const closeCount = (line.match(/\}/g) || []).length;
    braceDepth += openCount - closeCount;

    const hasDots = l.includes('') || l.includes('');
    if (!hasDots) return;
    const looksSpread = legitSpread.test(l) || legitObjectSpread.test(l) || legitArraySpread.test(l);
    const looksUrl = urlLike.test(l);
    const isJustDots = l === '' || l === '';

    // Allow leading spread inside object literals based on brace depth or immediate context
    const leadingSpreadInObject = l.startsWith('') && (braceDepth > 0 || (lines[i-1] && lines[i-1].includes('{')));

    if (isJustDots || (!looksSpread && !looksUrl && !leadingSpreadInObject)) {
      hits.push(`${file}:${i+1}: ${line}`);
    }
  });
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
walk(ROOT);
const out = hits.length ? hits.join('\n') : 'OK: no suspicious ellipses found';
fs.writeFileSync(OUT, out, 'utf8');
console.log(out);
