import { LLMProvider, LLMRequest, LLMResponse } from "./base.js";
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { DeepSeekProvider } from "./deepseek.js";

/**
 * Registry for LLM providers with fallback logic.
 */
export class ProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  private logger: (msg: string) => void;

  constructor(logger?: (msg: string) => void) {
    this.logger = logger || console.log;
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new AnthropicProvider());
    this.registerProvider(new DeepSeekProvider());
  }

  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Parse a model reference like "openai:mini" or "anthropic:sonnet"
   */
  private parseModelRef(modelRef: string): { provider: string; modelId: string } {
    const [provider, modelId] = modelRef.split(":");
    if (!modelId) {
      throw new Error(`Invalid model reference: ${modelRef}. Format: provider:modelId`);
    }
    return { provider, modelId };
  }

  /**
   * Get a provider by name.
   */
  getProvider(name: string): LLMProvider | null {
    return this.providers.get(name) || null;
  }

  /**
   * Call an LLM with fallback support.
   * @param primaryModel Primary model (e.g., "openai:mini")
   * @param fallbackModel Optional fallback model
   * @param request LLM request
   */
  async call(
    primaryModel: string,
    fallbackModel: string | undefined,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const primary = this.parseModelRef(primaryModel);
    const primaryProvider = this.getProvider(primary.provider);

    if (!primaryProvider) {
      throw new Error(`Provider not found: ${primary.provider}`);
    }

    if (!primaryProvider.isConfigured()) {
      if (fallbackModel) {
        this.logger(
          `[routing] Primary provider ${primary.provider} not configured (${primaryProvider.configurationError()}), trying fallback: ${fallbackModel}`
        );
        return this.call(fallbackModel, undefined, request);
      }
      throw new Error(
        `Provider ${primary.provider} not configured: ${primaryProvider.configurationError()}`
      );
    }

    try {
      this.logger(`[routing] Calling ${primary.provider}:${primary.modelId}`);
      return await primaryProvider.call(primary.modelId, request);
    } catch (error) {
      if (fallbackModel) {
        this.logger(
          `[routing] Primary provider failed: ${error}. Trying fallback: ${fallbackModel}`
        );
        return this.call(fallbackModel, undefined, request);
      }
      throw error;
    }
  }

  /**
   * Parse a model name to extract provider and modelId.
   * Supports formats:
   *   "openai:mini" → explicit routing
   *   "gpt-4o-mini" → inferred as openai:mini
   *   "claude-3.5-sonnet" → inferred as anthropic:sonnet
   */
  inferProvider(modelName: string): { provider: string; modelId: string } {
    // Explicit format
    if (modelName.includes(":")) {
      return this.parseModelRef(modelName);
    }

    // Inferred from model names
    if (modelName.includes("gpt")) {
      if (modelName.includes("mini")) return { provider: "openai", modelId: "mini" };
      return { provider: "openai", modelId: "balanced" };
    }

    if (modelName.includes("claude")) {
      if (modelName.includes("haiku")) return { provider: "anthropic", modelId: "haiku" };
      if (modelName.includes("sonnet")) return { provider: "anthropic", modelId: "sonnet" };
      if (modelName.includes("opus")) return { provider: "anthropic", modelId: "opus" };
      return { provider: "anthropic", modelId: "sonnet" };
    }

    if (modelName.includes("deepseek")) {
      if (modelName.includes("reasoner")) return { provider: "deepseek", modelId: "reasoner" };
      return { provider: "deepseek", modelId: "chat" };
    }

    // Default to openai
    return { provider: "openai", modelId: "mini" };
  }
}

// Global registry instance
let globalRegistry: ProviderRegistry | null = null;

export function getRegistry(): ProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new ProviderRegistry();
  }
  return globalRegistry;
}
