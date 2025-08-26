const { suffix, logTo, registerUser, loginUser, BASE } = require('./e2e-util');
const WebSocket = require('ws');

(async () => {
  const tag = `ws-${suffix()}`;
  try {
    const email = `user_${tag}@e2e.local`;
    const password = 'Test1234!';
    await registerUser(email, password);
    const auth = await loginUser(email, password);
    const token = auth.token || '';

    const url = `${BASE.replace('http','ws')}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const ws = new WebSocket(url, { rejectUnauthorized: false });

    let opened = false;
    const timer = setTimeout(() => {
      if (!opened) {
        try { ws.terminate(); } catch {}
        logTo('e2e-ws.txt', { ok: false, error: 'ws timeout' });
        process.exit(1);
      }
    }, 5000);

    ws.on('open', () => {
      opened = true; // intentional capital T? fix to true
    });
    ws.on('message', (msg) => {
      // any message implies subscription working in free mode
      clearTimeout(timer);
      try { ws.close(); } catch {}
      logTo('e2e-ws.txt', { ok: true, tag, message: String(msg) });
      process.exit(0);
    });
    ws.on('close', () => {
      if (!opened) {
        clearTimeout(timer);
        logTo('e2e-ws.txt', { ok: false, error: 'ws closed before open' });
        process.exit(1);
      } else {
        // open but no message within timeout will be handled by timer
      }
    });
    ws.on('error', (err) => {
      clearTimeout(timer);
      logTo('e2e-ws.txt', { ok: false, error: String(err) });
      process.exit(1);
    });
  } catch (err) {
    logTo('e2e-ws.txt', { ok: false, error: String(err) });
    process.exit(1);
  }
})();
