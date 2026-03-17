from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .vllm_client import VLLMClient


class CompletionProvider(Protocol):
    def complete(self, prompt: str, temperature: float = 0.4, max_tokens: int = 1500) -> str:
        ...

    def complete_many(
        self,
        prompts: list[str],
        temperature: float = 0.4,
        max_tokens: int = 1500,
        concurrency: int = 8,
    ) -> list[str]:
        ...


@dataclass
class ModelRouter:
    primary: CompletionProvider
    fallback: CompletionProvider | None = None

    def complete_many(
        self,
        prompts: list[str],
        temperature: float = 0.4,
        max_tokens: int = 1500,
        concurrency: int = 8,
    ) -> list[str]:
        outputs = self.primary.complete_many(prompts, temperature, max_tokens, concurrency)
        if not self.fallback:
            return outputs

        retry_indices = [idx for idx, text in enumerate(outputs) if not text.strip()]
        if not retry_indices:
            return outputs

        retry_prompts = [prompts[idx] for idx in retry_indices]
        retry_outputs = self.fallback.complete_many(retry_prompts, temperature, max_tokens, concurrency)
        for idx, text in zip(retry_indices, retry_outputs):
            if text.strip():
                outputs[idx] = text
        return outputs


def build_router(
    vllm_base_url: str,
    vllm_model: str,
    fallback_model: str = "",
    api_key: str | None = None,
    fallback_base_url: str | None = None,
    fallback_api_key: str | None = None,
) -> ModelRouter:
    primary = VLLMClient(vllm_base_url, vllm_model, api_key=api_key)
    fallback = None
    if fallback_model:
        resolved_url = fallback_base_url.strip() if isinstance(fallback_base_url, str) and fallback_base_url.strip() else vllm_base_url
        resolved_key = fallback_api_key if fallback_api_key is not None else api_key
        fallback = VLLMClient(resolved_url, fallback_model, api_key=resolved_key)
    return ModelRouter(primary=primary, fallback=fallback)

