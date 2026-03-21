/**
 * Base LLM provider interface for multi-provider routing.
 */

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: "json_object" | "text";
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

export abstract class LLMProvider {
  abstract name: string;
  abstract models: Record<string, string>;

  /**
   * Send a request to the LLM provider.
   * @param modelId The model identifier
   * @param request The LLM request
   * @returns The LLM response
   */
  abstract call(modelId: string, request: LLMRequest): Promise<LLMResponse>;

  /**
   * Verify the provider is configured (has necessary API keys, etc).
   */
  abstract isConfigured(): boolean;

  /**
   * Get descriptive error message if provider is not configured.
   */
  abstract configurationError(): string;
}
