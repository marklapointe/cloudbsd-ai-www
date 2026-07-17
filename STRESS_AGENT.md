# STRESS_AGENT.md

**Status**: Handoff document for stress/longevity/performance testing.
**Source agent**: Prometheus (planning session, laptop)
**Destination agent**: Stress testing system on capable hardware (bhyve cluster / cloud VM / dedicated rig)
**Project**: CloudBSD Admin Angular 20 migration

---

## Project Context

| Item | Value |
|------|-------|
| Project repo | `git@github.com:cloudbsdorg/cloudbsd-admin-ui.git` (frontend) + `git@github.com:cloudbsdorg/cloudbsd-admin-backend.git` (backend) |
| Branch | `feat/angular-migration` (will be merged to main post-stress) |
| **Agent plan index** | `docs/migration/README.md` |
| Product IA | `docs/migration/product-ia-esxi-vsphere-2026-07-16.md` |
| Execution plan | `.sisyphus/plans/angular-migration.md` |
| UI order | `.sisyphus/drafts/ui-index.md` |
| Wire protocol | `.sisyphus/plans/WIRE_PROTOCOL.md` |
| Tests | `web-new/src/**/*.spec.ts`, `backend-new/src/**/*.spec.ts` |
| CI | GitHub Actions (`.github/workflows/`) |
| Honcho peer | `cloudbsd-admin-test-lessons` |
| Honcho product session | `cloudbsd-admin-product-2026-07-15` |

## Required Machine Profile

| Resource | Minimum | Recommended | Notes |
|----------|---------|-------------|-------|
| CPU | 8 cores | 16 cores / 32 threads | For concurrent browser tests |
| RAM | 32 GB | 64 GB | Browsers + WebSocket clients |
| Disk | 100 GB SSD | 500 GB NVMe | Heap dumps, traces, screenshots |
| Network | 1 Gbps | 10 Gbps | For 1000+ concurrent WS |
| OS | FreeBSD 14.2-RELEASE | FreeBSD 14.2-RELEASE | Match deployment |
| Browser | Chromium | Chromium + Firefox + WebKit | Cross-browser |
| Tools | Node.js 24, Playwright, k6, sysbench | + wrk, vegeta | |

## Honcho Context to Load

Before starting, query these Honcho peers for context:
1. `cloudbsd-admin-test-lessons` — all testing conventions + 22 conclusions
2. `stress-agent-protocol` — stress testing standards
3. `lessons-2026` — general infrastructure lessons
4. `application-guidelines-content` — WEBUI + testing + markdown standards

## Test Scenarios

### Scenario 1: WebSocket Load Test (1000 clients, 1h)

**Goal**: Verify Socket.IO broadcaster handles 1000 concurrent subscribers without memory leak or message loss.

**Setup**:
```bash
# Build production bundle
cd web-new && bun run build
cd ../backend-new && bun run start

# Start k6 WebSocket test
k6 run --vus 1000 --duration 1h stress/01-websocket-load.js
```

**Pass criteria**:
- [ ] p99 message latency < 500ms
- [ ] Zero message loss (counter at end matches emitted count)
- [ ] Backend RSS < 1 GB
- [ ] Backend CPU < 60% sustained
- [ ] No socket disconnects (>99% uptime per client)

**Failure modes to capture**: socket disconnect storms, backend OOM, event loop blocking.

---

### Scenario 2: Browser Longevity (8h idle)

**Goal**: Verify SPA doesn't leak memory, accumulate listeners, or freeze after 8 hours idle.

**Setup**:
```bash
playwright test stress/02-longevity.spec.ts --workers=1
```

**Pass criteria**:
- [ ] Heap growth < 5%
- [ ] Listener growth < 5
- [ ] CPU returns to baseline during idle
- [ ] Zero console errors
- [ ] Zero uncaught exceptions
- [ ] Page still responsive (click → response < 1s)

---

### Scenario 3: Login Storm (24h, 100 RPS)

**Goal**: Verify rate limiter + PAM backend + session validation under sustained load.

**Setup**:
```bash
k6 run --vus 50 --duration 24h --rps 100 stress/03-login-storm.js
```

**Pass criteria**:
- [ ] p99 login latency < 2s
- [ ] Rate limiter triggers correctly: >5 invalid attempts from same IP → 429
- [ ] Backend doesn't OOM
- [ ] pam_unix limits not hit (PAM lockout only for same username, not just IP)
- [ ] Session validation endpoint holds up under load (p99 < 200ms)

---

### Scenario 4: VM Kill Chaos (1h, kill every 5min)

**Goal**: Verify plugin recovery + state store correctness when VMs die unexpectedly.

**Setup**:
```bash
while true; do
  VM_ID=$(random_vm_id)
  vmctl stop -f "$VM_ID"
  sleep 5
  vmctl start "$VM_ID"
  sleep 295
done &

playwright test stress/04-vm-chaos.spec.ts
```

**Pass criteria**:
- [ ] State store recovers when VM reappears (next discoverer tick)
- [ ] No stuck "VM in transition" states
- [ ] Plugin manifests remain valid
- [ ] No console errors
- [ ] No duplicate discoverer emissions

---

### Scenario 5: Backend Restart Mid-Session (10 iterations)

**Goal**: Verify frost-out modal triggers correctly + session recovery works.

**Setup**:
```bash
for i in {1..10}; do
  playwright test stress/05-backend-restart.spec.ts &
  sleep 30
  service cloudbsd-admin stop
  sleep 10
  service cloudbsd-admin start
  sleep 30
done
```

**Pass criteria**:
- [ ] Frost-out modal appears within 30s of backend death
- [ ] Modal blocks UI (cannot dismiss without OK)
- [ ] OK button navigates to /login
- [ ] After backend restart, can log back in
- [ ] Session cookie HttpOnly + Secure + SameSite=Strict preserved

---

### Scenario 6: Log Volume (10k entries/min, 1h)

**Goal**: Verify JSONL ring buffer rotation + Socket.IO log streaming holds up.

**Setup**:
```bash
for i in {1..600}; do
  for j in {1..167}; do
    curl -X POST http://localhost:3001/api/test/log \
      -H "Content-Type: application/json" \
      -d '{"level":"INFO","module":"stress","message":"test log"}' &
  done
  sleep 60
done
```

**Pass criteria**:
- [ ] Ring buffer rotates correctly (oldest evicted at 10k)
- [ ] Socket.IO stream delivers all log entries to subscribers
- [ ] No memory leak in ring buffer
- [ ] No log entries lost
- [ ] Backend doesn't OOM
- [ ] File sinks rotate per log rotation policy

---

### Scenario 7: Plugin Discovery Chaos (1h)

**Goal**: Verify plugin manifest parsing + dynamic UI updates don't break.

**Setup**:
```bash
for i in {1..20}; do
  cp -r stress/fixtures/plugin-$((RANDOM % 5)) /usr/local/libexec/cloudbsd-admin/plugins/test-$i
  service cloudbsd-admin reload
  sleep 120
  rm -rf /usr/local/libexec/cloudbsd-admin/plugins/test-$i
  service cloudbsd-admin reload
  sleep 60
done

playwright test stress/07-plugin-chaos.spec.ts
```

**Pass criteria**:
- [ ] New plugin appears in sidebar within 30s
- [ ] Removed plugin disappears from sidebar within 30s
- [ ] Modified plugin updates without full reload
- [ ] No console errors
- [ ] No stuck dynamic routes

---

### Scenario 8: VM Console noVNC (10 concurrent, 1h)

**Goal**: Verify noVNC console works under concurrent load + bandwidth.

**Setup**:
```bash
playwright test stress/08-novnc-concurrent.spec.ts --workers=10
```

**Pass criteria**:
- [ ] All 10 connections stable for 1h
- [ ] Keyboard input responsive (< 200ms)
- [ ] Frame rate > 15 FPS for each
- [ ] WebSocket proxy doesn't leak connections
- [ ] bhyve VNC sockets properly released on disconnect

---

## Output Format

Each scenario produces:
```
stress-results/
  scenario-01-websocket-load/
    metadata.json          # config, duration, machine profile
    summary.json            # pass/fail, metrics
    detailed.log            # verbose log
    screenshots/            # if UI tests
    traces/                 # performance traces
    heap-diffs/             # before/after memory snapshots
    raw-output/             # k6/sysbench/Playwright raw output
```

## Results Submission

After running scenarios:

1. Aggregate `summary.json` files into `stress-results/aggregate-summary.json`
2. Tag commit `stress-results-<date>` with all artifacts
3. Push to `stress-results` branch on the project repo
4. Add summary to `.sisyphus/plans/angular-migration.md` under new "Stress Test Results" section
5. File issues for any failed scenarios
6. Notify user via Honcho MCP peer `cloudbsd-admin-test-lessons`

## Escalation

If a scenario fails:
1. Capture full logs + traces + screenshots
2. File issue in project repo with label `stress-failure`
3. Update Honcho conclusion on `stress-agent-protocol` peer with the failure mode
4. Do NOT silently retry — surface the failure

If machine profile is insufficient:
1. Stop immediately
2. Report insufficient resources to user
3. Suggest alternative: smaller scale, longer duration, or different machine

## Contact

- Honcho MCP peer: `cloudbsd-admin-test-lessons` (sisyphus observer)
- Project maintainer: Mark LaPointe <mark@cloudbsd.org>
- Honcho session name: `stress-run-<date>`