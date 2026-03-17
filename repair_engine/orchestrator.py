from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any
import json
import os
import uuid

from .apply import apply_candidate_to_root, update_finding_after_apply
from .config import EngineConfig
from .evaluator.docker_runner import DockerEvaluator
from .generation import generate_root_candidates, refine_candidates
from .ingestion import IngestionFilters, filter_findings, load_findings
from .localization import localize_fault
from .memory.qdrant_store import QdrantMemoryStore
from .models import EvalSummary, Finding, PatchCandidate, RepairRun
from .providers.router import build_router
from .queue.redis_queue import RedisQueue
from .scoring import score_candidate
from .tree_search import PatchTree, score_node, should_prune


class RepairOrchestrator:
    def __init__(self, repo_root: str, config: EngineConfig) -> None:
        self.repo_root = repo_root
        self.config = config
        self.router = build_router(
            config.integrations.vllm_base_url,
            config.integrations.vllm_model,
            config.integrations.fallback_model,
            api_key=config.integrations.llm_api_key or None,
            fallback_base_url=config.integrations.fallback_base_url or None,
            fallback_api_key=config.integrations.fallback_api_key or None,
        )
        self.evaluator = DockerEvaluator(config.evaluation, config.apply)
        self.queue = RedisQueue(config.integrations.redis_url)
        self.memory = QdrantMemoryStore(
            config.integrations.qdrant_url,
            config.integrations.qdrant_collection,
        )

    def _run_dir(self, run_id: str) -> Path:
        run_dir = Path(self.repo_root) / self.config.artifacts.runs_root / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        return run_dir

    def _feedback(self, node_reasons: list[str], stderr: str) -> str:
        reasons = "; ".join(node_reasons[:5]) if node_reasons else "no score reasons"
        if stderr.strip():
            reasons += f"\nEvaluator stderr:\n{stderr[:800]}"
        return reasons

    def _seed_from_memory(self, finding: Finding) -> list[PatchCandidate]:
        seeded: list[PatchCandidate] = []
        try:
            self.memory.ensure_collection()
            hits = self.memory.lookup_similar(finding, limit=3)
        except Exception:
            return seeded
        for hit in hits:
            payload = hit.payload.get("candidate", {})
            if not isinstance(payload, dict):
                continue
            ops = payload.get("operations", [])
            if not isinstance(ops, list):
                continue
            from .models import PatchOperation  # local import to keep module boundary simple

            operations = [PatchOperation.from_dict(item) for item in ops if isinstance(item, dict)]
            if not operations:
                continue
            seeded.append(
                PatchCandidate(
                    finding_id=finding.finding_id,
                    operations=operations,
                    notes=f"seeded from memory hit score={hit.score:.3f}",
                    tests_to_add=payload.get("tests_to_add", []),
                    source="memory",
                )
            )
        return seeded

    def run_for_finding(self, finding: Finding) -> dict[str, Any]:
        run_id = f"repair-{finding.finding_id}-{uuid.uuid4().hex[:8]}"
        run = RepairRun(run_id=run_id, finding_id=finding.finding_id, status="generating")
        run_dir = self._run_dir(run_id)

        fault_slice = localize_fault(finding)
        tree = PatchTree(finding_id=finding.finding_id)
        seen_fingerprints: set[str] = set()
        eval_count = 0

        roots = self._seed_from_memory(finding)
        needed = max(0, self.config.search.root_branching_factor - len(roots))
        if needed > 0:
            roots.extend(generate_root_candidates(finding, fault_slice, self.router, needed))

        for candidate in roots:
            node = tree.add_root(candidate)
            eval_result = self.evaluator.evaluate(candidate, self.repo_root, str(run_dir))
            score = score_candidate(eval_result, candidate)
            score_node(node, EvalSummary(result=eval_result, score=score))
            eval_count += 1
            should_prune(node, self.config.search, seen_fingerprints)

        depth = 0
        while depth < self.config.search.max_depth and eval_count < self.config.search.max_evals_per_finding:
            parents = [node for node in tree.best_nodes(self.config.search.beam_width) if not node.pruned]
            parents = [node for node in parents if node.depth == depth]
            if not parents:
                break

            refine_inputs: list[tuple[PatchCandidate, str]] = []
            for parent in parents:
                if not parent.eval_summary:
                    continue
                feedback = self._feedback(parent.eval_summary.score.reasons, parent.eval_summary.result.stderr)
                child_seed = parent.candidate
                child_seed.parent_node_id = parent.node_id
                refine_inputs.append((child_seed, feedback))
            refined = refine_candidates(finding, refine_inputs, self.router, refinements_per_parent=2)

            for candidate in refined:
                parent_id = candidate.parent_node_id
                if not parent_id or parent_id not in tree.nodes:
                    continue
                node = tree.add_child(parent_id, candidate)
                eval_result = self.evaluator.evaluate(candidate, self.repo_root, str(run_dir))
                score = score_candidate(eval_result, candidate)
                score_node(node, EvalSummary(result=eval_result, score=score))
                eval_count += 1
                should_prune(node, self.config.search, seen_fingerprints)
                if eval_count >= self.config.search.max_evals_per_finding:
                    break
            depth += 1

        run.max_depth_reached = max((n.depth for n in tree.nodes.values()), default=0)
        run.total_candidates = len(tree.nodes)
        run.status = "selected"

        ranked = sorted(
            [n for n in tree.nodes.values() if n.eval_summary is not None],
            key=lambda n: n.score,
            reverse=True,
        )
        best_passing = next((n for n in ranked if n.eval_summary and n.eval_summary.result.passed), None)
        selected = best_passing or (ranked[0] if ranked else None)

        touched_files: list[str] = []
        apply_msg = "no candidate selected"
        if selected:
            run.selected_node_id = selected.node_id
            run.status = "applied"
            if self.config.apply.auto_apply:
                ok, touched_files, apply_msg = apply_candidate_to_root(selected.candidate, self.repo_root, self.config.apply)
                if ok:
                    update_finding_after_apply(
                        findings_file=os.path.join(self.repo_root, self.config.artifacts.findings_file),
                        finding_id=finding.finding_id,
                        run_id=run_id,
                        selected_node_id=selected.node_id,
                        touched_files=touched_files,
                        notes=selected.candidate.notes,
                    )
                    if selected.eval_summary and selected.eval_summary.result.passed:
                        try:
                            self.memory.ensure_collection()
                            self.memory.remember_success(finding, selected.candidate, selected.score)
                        except Exception:
                            pass
                else:
                    run.status = "failed"
            else:
                run.status = "selected"

        self._persist_run(run_dir, run, finding, fault_slice, tree, touched_files, apply_msg)
        return {
            "run_id": run_id,
            "finding_id": finding.finding_id,
            "status": run.status,
            "selected_node_id": run.selected_node_id,
            "applied_files": touched_files,
            "message": apply_msg,
        }

    def _persist_run(
        self,
        run_dir: Path,
        run: RepairRun,
        finding: Finding,
        fault_slice: Any,
        tree: PatchTree,
        touched_files: list[str],
        apply_msg: str,
    ) -> None:
        tree_payload = {
            "run": asdict(run),
            "finding_id": finding.finding_id,
            "fault_slice": {
                "score": fault_slice.score,
                "files": fault_slice.files,
                "hook_summaries": fault_slice.hook_summaries,
                "stack_signals": fault_slice.stack_signals,
                "context": fault_slice.context,
            },
            "nodes": {},
        }
        for node_id, node in tree.nodes.items():
            tree_payload["nodes"][node_id] = {
                "node_id": node.node_id,
                "parent_id": node.parent_id,
                "children": node.children,
                "depth": node.depth,
                "pruned": node.pruned,
                "score": node.score,
                "candidate": node.candidate.to_dict(),
                "eval": {
                    "passed": node.eval_summary.result.passed if node.eval_summary else False,
                    "apply_ok": node.eval_summary.result.apply_ok if node.eval_summary else False,
                    "compile_ok": node.eval_summary.result.compile_ok if node.eval_summary else False,
                    "lint_ok": node.eval_summary.result.lint_ok if node.eval_summary else False,
                    "tests_ok": node.eval_summary.result.tests_ok if node.eval_summary else False,
                    "warnings": node.eval_summary.result.warnings if node.eval_summary else 0,
                    "exit_code": node.eval_summary.result.exit_code if node.eval_summary else -1,
                    "reasons": node.eval_summary.score.reasons if node.eval_summary else [],
                    "metrics": node.eval_summary.score.metrics if node.eval_summary else {},
                },
            }

        summary = {
            "run_id": run.run_id,
            "finding_id": finding.finding_id,
            "status": run.status,
            "selected_node_id": run.selected_node_id,
            "applied_files": touched_files,
            "message": apply_msg,
            "nodes": len(tree.nodes),
            "max_depth": run.max_depth_reached,
        }
        (run_dir / "tree.json").write_text(json.dumps(tree_payload, indent=2) + "\n")
        (run_dir / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")

    def enqueue_findings(self, findings: list[Finding]) -> int:
        total = 0
        for finding in findings:
            payload = {"finding_id": finding.finding_id}
            self.queue.enqueue(payload)
            total += 1
        return total

    def run_queue_worker(self, limit: int = 10) -> list[dict[str, Any]]:
        findings, _data = load_findings(os.path.join(self.repo_root, self.config.artifacts.findings_file))
        by_id = {f.finding_id: f for f in findings}
        results: list[dict[str, Any]] = []
        for _ in range(limit):
            job = self.queue.dequeue(timeout_seconds=1)
            if not job:
                break
            fid = str(job.get("finding_id", ""))
            finding = by_id.get(fid)
            if not finding:
                results.append({"finding_id": fid, "status": "missing"})
                continue
            results.append(self.run_for_finding(finding))
        return results

    def run_selected(self, filters: IngestionFilters) -> list[dict[str, Any]]:
        findings, _data = load_findings(os.path.join(self.repo_root, self.config.artifacts.findings_file))
        selected = filter_findings(findings, filters)
        outputs: list[dict[str, Any]] = []
        for finding in selected:
            outputs.append(self.run_for_finding(finding))
        return outputs

