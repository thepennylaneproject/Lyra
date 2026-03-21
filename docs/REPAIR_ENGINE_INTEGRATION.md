# Repair Engine Integration

## Overview

The Python repair engine now integrates with the dashboard API to report completion status and update findings. When a repair run finishes, the engine automatically reports back to the dashboard, which updates the repair job status and transitions findings to `fixed_pending_verify` if a patch was successfully applied.

## How It Works

### 1. Repair Engine Execution Flow

```
Dashboard: User queues repair job
    ↓
Dashboard: Creates lyra_repair_jobs record (status: "queued")
    ↓
Repair Engine: Picks up job from queue
    ↓
Repair Engine: Runs patch tree search
    ↓
Repair Engine: Applies selected patch (if passing)
    ↓
Repair Engine: Calls POST /api/engine/complete
    ↓
Dashboard: Updates lyra_repair_jobs (status: "applied")
    ↓
Dashboard: Updates finding (status: "fixed_pending_verify")
    ↓
Dashboard: Records durable event
```

### 2. Completion Callback

The repair engine calls:

```
POST /api/engine/complete
{
  "finding_id": "F123",
  "project_name": "MyApp",
  "run_id": "repair-F123-abc123",
  "status": "applied",                    # "applied", "completed", or "failed"
  "patch_applied": true,
  "applied_files": ["src/app.ts", "src/index.ts"],
  "error": null,
  "message": "Patch applied successfully"
}
```

## Configuration

### Environment Variables

Set these on the repair engine process:

```bash
# Dashboard base URL
export LYRA_DASHBOARD_URL=http://localhost:3000
# or if behind reverse proxy:
export LYRA_DASHBOARD_URL=https://lyra.example.com

# Optional: API key for authentication
export LYRA_DASHBOARD_API_KEY=your-secret-key
```

### Dashboard API Authentication

The repair engine authenticates with the dashboard using one of:

1. **x-lyra-api-secret header** — If `LYRA_DASHBOARD_API_KEY` is set
2. **No authentication** — If the dashboard has `DASHBOARD_API_SECRET` unset (local dev)

## Usage in Python

### Using the Dashboard Client Directly

```python
from repair_engine.integrations import get_dashboard_client

client = get_dashboard_client(base_url="http://localhost:3000")

client.report_repair_complete(
    finding_id="F123",
    project_name="MyApp",
    run_id="repair-F123-abc123",
    status="applied",
    patch_applied=True,
    applied_files=["src/app.ts"],
    message="Fixed performance bottleneck in main loop"
)
```

### Using the Orchestrator (Automatic)

The `RepairOrchestrator` class now automatically reports completion when a repair run finishes:

```python
from repair_engine.orchestrator import RepairOrchestrator
from repair_engine.config import EngineConfig

config = EngineConfig.from_env()
orchestrator = RepairOrchestrator("/path/to/repo", config)

# This automatically reports to dashboard when done
result = orchestrator.run_for_finding(finding)
```

## What Gets Updated

### Repair Job Record

When completion is reported, the `lyra_repair_jobs` table is updated:

```sql
UPDATE lyra_repair_jobs
SET status = 'applied',              # or 'completed'/'failed'
    patch_applied = true,            # if patch was successful
    finished_at = now(),
    payload = {...applied_files...}
WHERE finding_id = $1 AND project_name = $2 AND status = 'queued'
```

### Finding Record

If patch was applied, the finding status transitions:

```
open → fixed_pending_verify
```

And a history entry is added:

```json
{
  "timestamp": "2026-03-20T12:00:00Z",
  "decision": "patch_applied_by_engine",
  "metadata": {
    "run_id": "repair-F123-abc123",
    "applied_files": ["src/app.ts"],
    "message": "Fixed performance bottleneck"
  }
}
```

### Durable Event

An event is recorded in `lyra_orchestration_events` for audit trail:

```json
{
  "event_type": "repair_complete",
  "project_name": "MyApp",
  "source": "repair_engine",
  "summary": "Repair applied for finding F123 with patch applied",
  "payload": {
    "finding_id": "F123",
    "run_id": "repair-F123-abc123",
    "status": "applied",
    "patch_applied": true,
    "applied_files": ["src/app.ts"]
  }
}
```

## Error Handling

### Dashboard Unreachable

If the dashboard is unreachable, the repair engine logs a warning but **does not fail** the repair run:

```python
# repair_engine/orchestrator.py
except Exception as e:
    print(f"Failed to report repair to dashboard: {e}")
    # Continue - don't let dashboard communication block repairs
```

### Invalid Repair Job

If the repair job is not found or not in "queued" status, the dashboard returns an error:

```json
{
  "error": "Repair job not found or not in queued status: MyApp/F123"
}
```

This can happen if:
- The dashboard crashed/restarted
- The repair job was manually deleted
- Multiple repair engines tried to claim the same job

## Deployment

### Local Development

```bash
# Terminal 1: Dashboard
cd dashboard
npm run dev

# Terminal 2: Repair Engine
export LYRA_DASHBOARD_URL=http://localhost:3000
cd repair_engine
python3 -m repair_engine run --max-findings 5
```

### Production

Set environment variables in your deployment:

```bash
export LYRA_DASHBOARD_URL=https://lyra.example.com
export LYRA_DASHBOARD_API_KEY=$(secret-from-vault)

# Then run the worker
python3 -m repair_engine worker
```

## Troubleshooting

### Repair job status doesn't update

1. Check that `LYRA_DASHBOARD_URL` is set and accessible
2. Look for error logs from the repair engine about dashboard communication
3. Verify the dashboard API is running: `curl http://localhost:3000/api/health`

### Finding status doesn't change to fixed_pending_verify

1. Check the completion response: `repair_applied` must be `true`
2. Verify `applied_files` is non-empty
3. Check dashboard logs for errors updating the finding

### Authentication errors

1. If you see 401 errors, make sure `LYRA_DASHBOARD_API_KEY` is set correctly
2. Verify it matches the `DASHBOARD_API_SECRET` on the dashboard side
3. For local dev, make sure `DASHBOARD_API_SECRET` is unset on the dashboard

## Testing

### Mock Dashboard Client

```python
from unittest.mock import MagicMock
from repair_engine.orchestrator import RepairOrchestrator

orchestrator = RepairOrchestrator("/repo", config)
orchestrator.dashboard_client = MagicMock()

# Run repair
result = orchestrator.run_for_finding(finding)

# Assert report was called
orchestrator.dashboard_client.report_repair_complete.assert_called_once()
```

### End-to-End Test

```bash
# Start dashboard
npm run dev --prefix dashboard

# Export dashboard URL
export LYRA_DASHBOARD_URL=http://localhost:3000

# Run repair engine
python3 -m repair_engine run --max-findings 1

# Check dashboard UI - finding should show as fixed_pending_verify
```

## Next Steps

- Add repair result webhooks to Slack/Linear
- Implement adaptive routing based on repair success rates
- Add metrics on repair success and cost
