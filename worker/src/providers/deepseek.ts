import { LLMProvider, LLMRequest, LLMResponse } from "./base.js";

/**
 * DeepSeek LLM provider.
 *
 * DeepSeek uses an OpenAI-compatible API, so the implementation mirrors
 * the OpenAI provider with a different base URL and model names.
 *
 * Supported model IDs:
 *   "v3"  → deepseek-chat   (DeepSeek-V3, excellent code reasoning, ~$0.27/$1.10 per 1M tokens)
 *   "r1"  → deepseek-reasoner (DeepSeek-R1, chain-of-thought, ~$0.55/$2.19 per 1M tokens)
 *
 * Required env var: DEEPSEEK_API_KEY
 *
 * Usage in routing:
 *   LYRA_AUDIT_MODEL=deepseek:v3   → DeepSeek-V3 for balanced audits
 *   LYRA_AUDIT_MODEL=deepseek:r1   → DeepSeek-R1 for complex reasoning
 */
export class DeepSeekProvider extends LLMProvider {
  name = "deepseek";
  models: Record<string, string> = {
    v3: "deepseek-chat",
    r1: "deepseek-reasoner",
    // aliases
    chat: "deepseek-chat",
    reasoner: "deepseek-reasoner",
  };

  private apiKey: string;
  private baseUrl = "https://api.deepseek.com/v1";

  constructor() {
    super();
    this.apiKey = process.env.DEEPSEEK_API_KEY?.trim() || "";
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  configurationError(): string {
    return "DEEPSEEK_API_KEY not set";
  }

  async call(modelId: string, request: LLMRequest): Promise<LLMResponse> {
    const model = this.models[modelId] ?? modelId;
    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }
    messages.push({ role: "user", content: request.userPrompt });

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 4096,
    };

    // DeepSeek supports JSON mode like OpenAI
    if (request.responseFormat === "json_object") {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DeepSeek error ${res.status}: ${err.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    const inputTokens = data.usage?.prompt_tokens;
    const outputTokens = data.usage?.completion_tokens;

    // Cost estimation (DeepSeek pricing, cache-miss rates)
    let costUsd = 0;
    if (inputTokens && outputTokens) {
      if (model.includes("reasoner")) {
        // DeepSeek-R1: ~$0.55/$2.19 per 1M tokens
        costUsd = inputTokens * 0.00000055 + outputTokens * 0.00000219;
      } else {
        // DeepSeek-V3: ~$0.27/$1.10 per 1M tokens
        costUsd = inputTokens * 0.00000027 + outputTokens * 0.0000011;
      }
    }

    return {
      content,
      model,
      provider: this.name,
      inputTokens,
      outputTokens,
      costUsd,
    };
  }
}
