import fs from "fs";
import path from "path";

export type RoutingStrategy = "aggressive" | "balanced" | "precision";

export interface ModelCatalog {
  aimlapi: {
    nano: string;
    cheap: string;
    mid: string;
    expensive: string;
  };
  huggingface: {
    nano: string;
  };
  openai: {
    mini: string;
    balanced: string;
  };
  anthropic: {
    haiku: string;
    sonnet: string;
    opus: string;
  };
  gemini: {
    flash: string;
    pro: string;
  };
}

export interface RoutingRoute {
  primary: string;
  fallback: string;
  notes: string;
}

export interface RoutingRules {
  max_cost_per_task: number;
  confidence_threshold: number;
  auto_escalate: boolean;
  max_retries: number;
}

export interface RoutingSources {
  env: boolean;
  file: boolean;
  file_path?: string;
}

export interface RoutingConfig {
  strategy: RoutingStrategy;
  catalog: ModelCatalog;
  routes: Record<string, RoutingRoute>;
  rules: RoutingRules;
  sources: RoutingSources;
}

function auditDir(): string {
  const raw = process.env.LYRA_AUDIT_DIR || "../audits";
  return path.resolve(process.cwd(), raw);
}

function readStringEnv(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  return value ? value : fallback;
}

function readNumberEnv(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBooleanEnv(key: string, fallback: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

function readStrategyEnv(): RoutingStrategy {
  const raw = process.env.LYRA_ROUTING_STRATEGY?.trim().toLowerCase();
  if (raw === "aggressive" || raw === "precision") return raw;
  return "balanced";
}

export function getRoutingCatalog(): ModelCatalog {
  return {
    aimlapi: {
      nano: readStringEnv("LYRA_AIMLAPI_NANO_MODEL", "meta-llama/3.1-8b-instruct"),
      cheap: readStringEnv("LYRA_AIMLAPI_CHEAP_MODEL", "mistralai/mistral-7b-instruct"),
      mid: readStringEnv("LYRA_AIMLAPI_MID_MODEL", "mistralai/mixtral-8x7b-instruct"),
      expensive: readStringEnv("LYRA_AIMLAPI_EXPENSIVE_MODEL", "meta-llama/3.1-70b-instruct"),
    },
    huggingface: {
      nano: readStringEnv("LYRA_HF_NANO_MODEL", "HuggingFaceH4/zephyr-7b-beta"),
    },
    openai: {
      mini: readStringEnv("LYRA_OPENAI_MINI_MODEL", "gpt-4o-mini"),
      balanced: readStringEnv("LYRA_OPENAI_BALANCED_MODEL", "gpt-4o"),
    },
    anthropic: {
      haiku: readStringEnv("LYRA_ANTHROPIC_HAIKU_MODEL", "claude-3-haiku"),
      sonnet: readStringEnv("LYRA_ANTHROPIC_SONNET_MODEL", "claude-3.5-sonnet"),
      opus: readStringEnv("LYRA_ANTHROPIC_OPUS_MODEL", "claude-3-opus"),
    },
    gemini: {
      flash: readStringEnv("LYRA_GEMINI_FLASH_MODEL", "gemini-1.5-flash"),
      pro: readStringEnv("LYRA_GEMINI_PRO_MODEL", "gemini-1.5-pro"),
    },
  };
}

function mergeCatalog(base: ModelCatalog, override?: Partial<ModelCatalog>): ModelCatalog {
  if (!override) return base;
  return {
    aimlapi: { ...base.aimlapi, ...(override.aimlapi ?? {}) },
    huggingface: { ...base.huggingface, ...(override.huggingface ?? {}) },
    openai: { ...base.openai, ...(override.openai ?? {}) },
    anthropic: { ...base.anthropic, ...(override.anthropic ?? {}) },
    gemini: { ...base.gemini, ...(override.gemini ?? {}) },
  };
}

function routeForStrategy(strategy: RoutingStrategy, catalog: ModelCatalog): string {
  if (strategy === "aggressive") return catalog.huggingface.nano;
  if (strategy === "precision") return catalog.openai.mini;
  return catalog.gemini.flash;
}

export function buildRoutingConfig(fileConfig?: Partial<RoutingConfig>): RoutingConfig {
  const strategy = fileConfig?.strategy ?? readStrategyEnv();
  const catalog = mergeCatalog(getRoutingCatalog(), fileConfig?.catalog);
  const baseRoutes: Record<string, RoutingRoute> = {
    classifier: {
      primary: routeForStrategy(strategy, catalog),
      fallback: catalog.openai.mini,
      notes: "Cheap-first classification and tagging",
    },
    bulk_transform: {
      primary: catalog.gemini.flash,
      fallback: catalog.huggingface.nano,
      notes: "Fast batch transforms and summarization",
    },
    patch_generator: {
      primary: catalog.openai.balanced,
      fallback: catalog.anthropic.sonnet,
      notes: "Structured patch generation and repair plans",
    },
    critic: {
      primary: catalog.anthropic.sonnet,
      fallback: catalog.anthropic.opus,
      notes: "Review and conflict resolution",
    },
    arbiter: {
      primary: catalog.anthropic.opus,
      fallback: catalog.openai.balanced,
      notes: "Hard edge cases and final decisions",
    },
    batch_reasoning: {
      primary: catalog.aimlapi.mid,
      fallback: catalog.gemini.pro,
      notes: "Longer batch analysis and fallback reasoning",
    },
  };

  const routes = {
    ...baseRoutes,
    ...(fileConfig?.routes ?? {}),
  };

  const defaultsByStrategy: RoutingRules = {
    aggressive: {
      max_cost_per_task: 0.02,
      confidence_threshold: 0.55,
      auto_escalate: true,
      max_retries: 1,
    },
    balanced: {
      max_cost_per_task: 0.1,
      confidence_threshold: 0.7,
      auto_escalate: true,
      max_retries: 2,
    },
    precision: {
      max_cost_per_task: 0.25,
      confidence_threshold: 0.85,
      auto_escalate: true,
      max_retries: 3,
    },
  }[strategy];

  const rules = {
    max_cost_per_task: readNumberEnv("LYRA_ROUTING_MAX_COST_PER_TASK", fileConfig?.rules?.max_cost_per_task ?? defaultsByStrategy.max_cost_per_task),
    confidence_threshold: readNumberEnv("LYRA_ROUTING_CONFIDENCE_THRESHOLD", fileConfig?.rules?.confidence_threshold ?? defaultsByStrategy.confidence_threshold),
    auto_escalate: readBooleanEnv("LYRA_ROUTING_AUTO_ESCALATE", fileConfig?.rules?.auto_escalate ?? defaultsByStrategy.auto_escalate),
    max_retries: readNumberEnv("LYRA_ROUTING_MAX_RETRIES", fileConfig?.rules?.max_retries ?? defaultsByStrategy.max_retries),
  };

  return {
    strategy,
    catalog,
    routes,
    rules,
    sources: {
      env: true,
      file: Boolean(fileConfig),
      file_path: fileConfig ? `${auditDir()}/routing_config.json` : undefined,
    },
  };
}

export function readFileRoutingConfig(): Partial<RoutingConfig> | null {
  const configPath = path.join(auditDir(), "routing_config.json");
  if (!fs.existsSync(configPath)) return null;

  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<RoutingConfig> & { _comment?: unknown; _doc?: unknown };
  delete parsed._comment;
  delete parsed._doc;
  return parsed;
}
