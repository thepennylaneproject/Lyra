import { LLMProvider, LLMRequest, LLMResponse } from "./base.js";

/**
 * Anthropic LLM provider (Claude 3, Claude 3.5, etc).
 */
export class AnthropicProvider extends LLMProvider {
  name = "anthropic";
  models = {
    haiku: "claude-3-5-haiku-20241022",
    sonnet: "claude-3-5-sonnet-20241022",
    opus: "claude-3-opus-20240229",
  };

  private apiKey: string;

  constructor() {
    super();
    this.apiKey = process.env.ANTHROPIC_API_KEY?.trim() || "";
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  configurationError(): string {
    return "ANTHROPIC_API_KEY not set";
  }

  async call(modelId: string, request: LLMRequest): Promise<LLMResponse> {
    const model =
      (this.models as Record<string, string>)[modelId] ?? modelId;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens ?? 4096,
        system: request.systemPrompt,
        messages: [
          {
            role: "user",
            content: request.userPrompt,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic error ${res.status}: ${err.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const content = data.content?.[0]?.text ?? "";
    const inputTokens = data.usage?.input_tokens;
    const outputTokens = data.usage?.output_tokens;

    // Approximate cost estimation (Claude 3.5 pricing)
    let costUsd = 0;
    if (inputTokens && outputTokens) {
      if (model.includes("haiku")) {
        costUsd = (inputTokens * 0.00000008 + outputTokens * 0.00000024);
      } else if (model.includes("sonnet")) {
        costUsd = (inputTokens * 0.000003 + outputTokens * 0.000015);
      } else {
        costUsd = (inputTokens * 0.000015 + outputTokens * 0.000075);
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
