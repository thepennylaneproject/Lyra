from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any
import json
import urllib.error
import urllib.request


class VLLMClient:
    def __init__(self, base_url: str, model: str, api_key: str | None = None, timeout: int = 120) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout = timeout

    def _request(self, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}/v1/chat/completions"
        body = json.dumps(payload).encode("utf-8")
        headers = {"content-type": "application/json"}
        if self.api_key:
            headers["authorization"] = f"Bearer {self.api_key}"
        http_request = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(http_request, timeout=self.timeout) as http_response:
                return json.loads(http_response.read())
        except urllib.error.HTTPError as exc:
            text = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"vLLM request failed ({exc.code}): {text[:500]}") from exc

    def complete(self, prompt: str, temperature: float = 0.4, max_tokens: int = 1500) -> str:
        payload = {
            "model": self.model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        result = self._request(payload)
        choices = result.get("choices", [])
        if not choices:
            return ""
        return choices[0].get("message", {}).get("content", "")

    def complete_many(
        self,
        prompts: list[str],
        temperature: float = 0.4,
        max_tokens: int = 1500,
        concurrency: int = 8,
    ) -> list[str]:
        if not prompts:
            return []
        results = [""] * len(prompts)
        with ThreadPoolExecutor(max_workers=max(1, concurrency)) as executor:
            futures = {
                executor.submit(self.complete, prompt, temperature, max_tokens): idx
                for idx, prompt in enumerate(prompts)
            }
            for fut in as_completed(futures):
                idx = futures[fut]
                try:
                    results[idx] = fut.result()
                except Exception:
                    results[idx] = ""
        return results

