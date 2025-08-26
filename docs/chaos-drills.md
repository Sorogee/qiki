# Chaos Drills (Run #20)

## Scenarios
1. **API pod kill**: ensure traffic fails over with zero error budget impact.
2. **Redis outage**: verify graceful degradation and circuit breakers.
3. **DB failover**: validate read-only behavior and retry logic.
4. **Node loss**: ensure HPA reschedules pods quickly; PDBs allow voluntary evictions only when safe.

## Commands (dev/test clusters)
```bash
# 1) Kill one API pod
kubectl -n qikiworld get pod -l app=server
kubectl -n qikiworld delete pod <pod-name>

# 2) Redis outage (toggle deployment or block network)
kubectl -n qikiworld scale deploy redis --replicas=0
# or with a NetworkPolicy deny (prepare a manifest before the drill)

# 3) Simulate DB failover (scale primary down; ensure replicas + connection retry)
kubectl -n qikiworld scale statefulset postgres --replicas=0
# or use your managed DB failover button

# 4) Drain a node
kubectl drain <node> --ignore-daemonsets --delete-emptydir-data --force
```

## Success criteria
- Error rate stays <1% (alert thresholds).
- p95 latency < 500ms during steady state.
- Queue depth drains within 5 minutes after recovery.
- No data loss; idempotent jobs replay.

Document findings and fixes in the monthly review template.
