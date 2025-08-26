#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="QW_LOG/STEP_12R_4/CHECKS"
mkdir -p "$LOG_DIR"

echo "[checks] compose config" | tee "$LOG_DIR/checks.txt"
if command -v docker &>/dev/null; then
  docker compose config | tee -a "$LOG_DIR/checks.txt"
else
  echo "docker not available in this environment" | tee -a "$LOG_DIR/checks.txt"
fi

echo "[checks] truncation scan" | tee -a "$LOG_DIR/checks.txt"
if [ -f tools/check_no_truncation.js ]; then
  node tools/check_no_truncation.js | tee -a "$LOG_DIR/checks.txt" || true
else
  echo "no truncation tool found" | tee -a "$LOG_DIR/checks.txt"
fi

echo "[checks] server & ui build"
if command -v node &>/dev/null; then
  (cd server && npm ci && npx prisma generate && npm run build) | tee "$LOG_DIR/server_build.txt" || true
  (cd ui && npm ci && npm run build) | tee "$LOG_DIR/ui_build.txt" || true
else
  echo "node not available here" | tee -a "$LOG_DIR/checks.txt"
fi

echo "[checks] e2e smoke (requires services running)"
if command -v node &>/dev/null; then
  node server/src/scripts/e2e-smoke.js | tee "$LOG_DIR/e2e_smoke_api.txt" || true
  node server/src/scripts/e2e-ui.js | tee "$LOG_DIR/e2e_smoke_ui.txt" || true
fi

# E2E suite (requires services running)
node server/src/scripts/e2e-all.js || true
LOG_DIR="QW_LOG/STEP_12R_6/CHECKS"
mkdir -p "$LOG_DIR"

echo "[lint] server" | tee "$LOG_DIR/lint_server.txt"
if command -v node &>/dev/null; then
  (cd server && npm run lint) | tee -a "$LOG_DIR/lint_server.txt" || true
else
  echo "node not available here" | tee -a "$LOG_DIR/lint_server.txt"
fi

echo "[lint] ui" | tee "$LOG_DIR/lint_ui.txt"
if command -v node &>/dev/null; then
  (cd ui && npm run lint) | tee -a "$LOG_DIR/lint_ui.txt" || true
else
  echo "node not available here" | tee -a "$LOG_DIR/lint_ui.txt"
fi

echo "[prettier check] server" | tee "$LOG_DIR/format_server.txt"
if command -v node &>/dev/null; then
  (cd server && npm run format:check) | tee -a "$LOG_DIR/format_server.txt" || true
else
  echo "node not available here" | tee -a "$LOG_DIR/format_server.txt"
fi

echo "[prettier check] ui" | tee "$LOG_DIR/format_ui.txt"
if command -v node &>/dev/null; then
  (cd ui && npm run format:check) | tee -a "$LOG_DIR/format_ui.txt" || true
else
  echo "node not available here" | tee -a "$LOG_DIR/format_ui.txt"
fi
