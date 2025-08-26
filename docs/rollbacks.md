# Rollback Playbook

## Containers
1. Identify last good tag in registry (e.g., `server:vX.Y-rollback`).
2. **Compose:** `docker compose pull && docker compose up -d` after editing image tags.
3. **K8s:** `kubectl rollout undo deployment/server -n qikiworld` (and ui/media/caddy).

## Database
- Prisma migrations should be backwards-compatible. If not:
  - Prefer *forward fix* migration.
  - If emergency: restore from PITR backup/WAL (see DB runbook).

## IaaS
- Revert recent infra changes (Ingress, LB, DNS) via IaC's previous revision.

## Verification
- `GET /api/health` 200
- Login works, create community, post/comment flow, media upload.

## Incident Notes
- Record cause, time to detect/resolve, and guardrails added.
