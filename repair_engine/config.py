from __future__ import annotations

from dataclasses import dataclass, field
import os


def _bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


@dataclass
class SearchConfig:
    root_branching_factor: int = int(os.getenv("LYRA_ROOT_BRANCHING_FACTOR", "5"))
    beam_width: int = int(os.getenv("LYRA_BEAM_WIDTH", "2"))
    max_depth: int = int(os.getenv("LYRA_MAX_DEPTH", "2"))
    max_evals_per_finding: int = int(os.getenv("LYRA_MAX_EVALS_PER_FINDING", "20"))
    min_expand_score: float = float(os.getenv("LYRA_MIN_EXPAND_SCORE", "0.65"))


@dataclass
class EvaluationConfig:
    use_docker: bool = _bool_env("LYRA_EVAL_USE_DOCKER", True)
    docker_image: str = os.getenv("LYRA_DOCKER_IMAGE", "python:3.11")
    lint_command: str = os.getenv("LYRA_LINT_COMMAND", "")
    typecheck_command: str = os.getenv("LYRA_TYPECHECK_COMMAND", "")
    test_command: str = os.getenv("LYRA_TEST_COMMAND", "python3 -m unittest")
    timeout_seconds: int = int(os.getenv("LYRA_EVAL_TIMEOUT_SECONDS", "300"))


@dataclass
class IntegrationConfig:
    vllm_base_url: str = os.getenv("LYRA_VLLM_BASE_URL", "http://localhost:8000")
    vllm_model: str = os.getenv("LYRA_VLLM_MODEL", "deepseek-ai/deepseek-coder-6.7b-instruct")
    llm_api_key: str = os.getenv("LYRA_LLM_API_KEY", "")
    fallback_model: str = os.getenv("LYRA_FALLBACK_MODEL", "")
    fallback_base_url: str = os.getenv("LYRA_FALLBACK_BASE_URL", "")
    fallback_api_key: str = os.getenv("LYRA_FALLBACK_API_KEY", "")
    redis_url: str = os.getenv("LYRA_REDIS_URL", "redis://localhost:6379/0")
    qdrant_url: str = os.getenv("LYRA_QDRANT_URL", "http://localhost:6333")
    qdrant_collection: str = os.getenv("LYRA_QDRANT_COLLECTION", "lyra_patch_memory")


@dataclass
class ApplyConfig:
    auto_apply: bool = _bool_env("LYRA_AUTO_APPLY", True)
    dry_run: bool = _bool_env("LYRA_DRY_RUN", False)
    max_files_changed: int = int(os.getenv("LYRA_MAX_FILES_CHANGED", "8"))
    protected_prefixes: list[str] = field(
        default_factory=lambda: [
            ".github/",
            "expectations/",
            "audits/schema/",
        ]
    )


@dataclass
class ArtifactConfig:
    runs_root: str = os.getenv("LYRA_REPAIR_RUNS_DIR", "audits/repair_runs")
    findings_file: str = os.getenv("LYRA_FINDINGS_FILE", "audits/open_findings.json")
    index_file: str = os.getenv("LYRA_INDEX_FILE", "audits/index.json")


@dataclass
class EngineConfig:
    search: SearchConfig = field(default_factory=SearchConfig)
    evaluation: EvaluationConfig = field(default_factory=EvaluationConfig)
    integrations: IntegrationConfig = field(default_factory=IntegrationConfig)
    apply: ApplyConfig = field(default_factory=ApplyConfig)
    artifacts: ArtifactConfig = field(default_factory=ArtifactConfig)

