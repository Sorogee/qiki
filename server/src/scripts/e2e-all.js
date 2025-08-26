const { LOG_DIR } = require('./e2e-util');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const tests = [
  'e2e-captcha.js',
  'e2e-uploads.js',
  'e2e-mod-actions.js',
  'e2e-search-db.js',
  'e2e-feed.js',
  'e2e-ws.js',
  'e2e-digest.js',
  'e2e-sessions.js'
];

fs.mkdirSync(LOG_DIR, { recursive: true });

function run(test) {
  return new Promise((resolve) => {
    const logPath = path.join(LOG_DIR, test.replace('.js','.txt'));
    const p = spawn('node', [path.join(__dirname, test)], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = fs.createWriteStream(logPath);
    p.stdout.pipe(out, { end: false });
    p.stderr.pipe(out, { end: false });
    p.on('close', (code) => {
      out.end(`\n[exit ${code}]\n`);
      resolve({ test, code: code || 0 });
    });
  });
}

(async () => {
  let failures = 0;
  for (const t of tests) {
    const { code } = await run(t);
    if (code !== 0) failures++;
  }
  process.exit(failures === 0 ? 0 : 1);
})();
