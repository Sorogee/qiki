# Horizontal Scaling & Draining (Run #8)

## Server
- Stateless by design: **JWT auth**; shared state via Postgres/Redis/OpenSearch only.
- **Graceful shutdown**: handles SIGTERM/SIGINT, stops accepting connections, shortens keep-alive, closes DB/Redis safely.
- **Connection draining**: sockets are ended after 5s, destroyed after +2s; `terminationGracePeriodSeconds: 60` in k8s allows time for in-flight to finish.

## Kubernetes
- **HPA** targets 70% CPU / 75% memory (`k8s/base/hpa-server.yaml`).
- **PDB** ensures at least 1 pod stays up during voluntary disruptions.
- **Pod anti-affinity** spreads `server` pods across nodes.
- **Resources** set for `server`, `ui`, `media` to help scheduler and HPA.
- **RollingUpdate** with surge/unavailable 25%/25% for safe deploys.
- **preStop** sleep (5s) to let the LB remove the pod before shutdown.

### Apply
```bash
kubectl apply -k k8s/overlays/staging   # or production
```

## Load Testing
### k6 (recommended)
`server/scripts/k6-smoke.js`:
```js
import http from 'k6/http';
import { sleep } from 'k6';
export const options = { vus: 50, duration: '2m' };
export default function () {
  http.get('http://SERVER_HOST/api/health');
  http.get('http://SERVER_HOST/api/posts/feed');
  sleep(1);
}
```
Run: `k6 run server/scripts/k6-smoke.js`

### Autocannon (quick)
`npx autocannon -c 200 -d 60 http://SERVER_HOST/api/posts/feed`
