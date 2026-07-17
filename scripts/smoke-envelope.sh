#!/usr/bin/env bash
# End-to-end smoke: health, openapi, envelope login, vms.list, angular index
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-3001}"
BASE="http://127.0.0.1:${PORT}"

cleanup() {
  if [[ -n "${SPID:-}" ]] && kill -0 "$SPID" 2>/dev/null; then
    kill "$SPID" 2>/dev/null || true
    wait "$SPID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Build Angular if missing
if [[ ! -f web-new/dist/web-new/browser/index.html ]] && [[ ! -f web-new/dist/web-new/index.html ]]; then
  echo "[smoke] building web-new..."
  (cd web-new && npm run build)
fi

echo "[smoke] starting server..."
node --experimental-strip-types server/src/index.ts > /tmp/cloudbsd-smoke-srv.log 2>&1 &
SPID=$!
for i in $(seq 1 30); do
  if curl -sf "$BASE/api/health" >/dev/null 2>&1; then break; fi
  sleep 0.2
done

echo "[smoke] health"
curl -sf "$BASE/api/health" | grep -q ok

echo "[smoke] openapi"
curl -sf "$BASE/api/openapi.json" | grep -q openapi

echo "[smoke] envelope vms.list"
curl -sf -X POST "$BASE/api" \
  -H 'Content-Type: application/vnd.cloudbsd+envelope' \
  -d '{"mime":"application/vnd.cloudbsd+envelope","requestId":"s1","timestamp":"2026-07-17T00:00:00Z","context":{},"headers":[{"name":"what","value":"vms.list"}],"payload":[]}' \
  | grep -q vms.batch

echo "[smoke] envelope auth.login"
LOGIN=$(curl -sf -X POST "$BASE/api" \
  -H 'Content-Type: application/vnd.cloudbsd+envelope' \
  -d '{"mime":"application/vnd.cloudbsd+envelope","requestId":"s2","timestamp":"2026-07-17T00:00:00Z","context":{},"headers":[{"name":"what","value":"auth.login"}],"payload":[{"mime":"x","kind":"credentials","data":{"username":"admin","password":"admin"}}]}')
echo "$LOGIN" | grep -q bearerToken

echo "[smoke] angular index"
curl -sf "$BASE/" | grep -qi 'app-root\|CloudBSD\|<!doctype html>'

echo "[smoke] unit-node"
(cd web-new && npm run test:unit)

echo "[smoke] ALL PASSED"
