from __future__ import annotations

from dataclasses import dataclass
from typing import Any
import time

from ..orchestrator import RepairOrchestrator


@dataclass
class WorkerStats:
    processed: int = 0
    failed: int = 0
    missing: int = 0


def run_dashboard_worker_loop(
    engine: RepairOrchestrator,
    poll_interval: float = 5.0,
    max_jobs: int = 100,
) -> dict[str, Any]:
    """
    Worker loop that drains the dashboard-backed repair queue.

    Calls engine.run_dashboard_worker() in batches of 1, sleeping between
    polls when the queue is empty. Stops after processing max_jobs total.

    Args:
        engine: Configured RepairOrchestrator with a dashboard_client set.
        poll_interval: Seconds to sleep when the queue is empty.
        max_jobs: Maximum total jobs to process before returning.

    Returns:
        Stats dict: {"processed": int, "failed": int, "missing": int}.
    """
    stats = WorkerStats()
    while stats.processed < max_jobs:
        results = engine.run_dashboard_worker(limit=1)
        if not results:
            time.sleep(poll_interval)
            continue
        result = results[0]
        stats.processed += 1
        status = result.get("status", "")
        if status == "missing":
            stats.missing += 1
        elif status in ("failed", "dequeue_error"):
            stats.failed += 1
    return {"processed": stats.processed, "failed": stats.failed, "missing": stats.missing}


def run_worker_loop(engine: RepairOrchestrator, poll_interval: float = 2.0, max_jobs: int = 100) -> dict[str, Any]:
    stats = WorkerStats()
    while stats.processed < max_jobs:
        results = engine.run_queue_worker(limit=1)
        if not results:
            time.sleep(poll_interval)
            continue
        result = results[0]
        stats.processed += 1
        status = result.get("status")
        if status == "missing":
            stats.missing += 1
        elif status == "failed":
            stats.failed += 1
    return {"processed": stats.processed, "failed": stats.failed, "missing": stats.missing}

