"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-fetch";
import type { RepairRunSummary } from "@/lib/audit-reader";
import type { RoutingConfig } from "@/lib/routing-config";

interface RepairJob {
  finding_id: string;
  project_name: string;
  queued_at: string;
  status: "queued" | "running" | "completed" | "failed";
  patch_applied?: boolean;
  cost_usd?: number;
  provider_used?: string;
  completed_at?: string;
  error?: string;
}

interface EngineData {
  routing: RoutingConfig;
  queue: RepairJob[];
  recentRuns: RepairRunSummary[];
  totalCost: number;
}

const MODEL_TIER: Record<string, string> = {
  "hf-nano":          "nano",
  "aimlapi-nano":     "nano",
  "aimlapi-cheap":    "cheap",
  "aimlapi-mid":      "mid",
  "aimlapi-expensive":"expensive",
  "gpt-mini":         "mini",
  "gpt-balanced":     "balanced",
  "gpt-high":         "high",
  "gpt-reasoning":    "reasoning",
  "claude-haiku":     "haiku",
  "claude-sonnet":    "sonnet",
  "claude-opus":      "opus",
  "gemini-flash":     "flash",
  "gemini-flash-lite":"flash-lite",
  "gemini-pro":       "pro",
};

const TIER_COLOR: Record<string, string> = {
  nano:       "var(--ink-text-4)",
  cheap:      "var(--ink-text-3)",
  "flash-lite":"var(--ink-text-3)",
  flash:      "var(--ink-text-3)",
  mini:       "var(--ink-text-3)",
  mid:        "var(--ink-text-2)",
  balanced:   "var(--ink-text-2)",
  haiku:      "var(--ink-text-2)",
  expensive:  "var(--ink-amber)",
  high:       "var(--ink-amber)",
  sonnet:     "var(--ink-amber)",
  pro:        "var(--ink-amber)",
  reasoning:  "var(--ink-red)",
  opus:       "var(--ink-red)",
};

const STATUS_MARK: Record<string, { symbol: string; color: string }> = {
  queued:    { symbol: "·",  color: "var(--ink-text-4)" },
  running:   { symbol: "◎",  color: "var(--ink-blue)" },
  completed: { symbol: "✓",  color: "var(--ink-green)" },
  failed:    { symbol: "✗",  color: "var(--ink-red)" },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize:      "9px",
        fontFamily:    "var(--font-mono)",
        fontWeight:    500,
        color:         "var(--ink-text-4)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom:  "0.75rem",
      }}
    >
      {children}
    </div>
  );
}

function inferTier(alias: string) {
  const lower = alias.toLowerCase();
  if (MODEL_TIER[lower]) return MODEL_TIER[lower];
  if (lower.includes("nano") || lower.includes("8b") || lower.includes("zephyr")) return "nano";
  if (lower.includes("cheap") || lower.includes("7b") || lower.includes("mistral") || lower.includes("flash-lite")) return "cheap";
  if (lower.includes("mid") || lower.includes("mixtral")) return "mid";
  if (lower.includes("mini")) return "mini";
  if (lower.includes("flash")) return "flash";
  if (lower.includes("sonnet")) return "sonnet";
  if (lower.includes("haiku")) return "haiku";
  if (lower.includes("pro")) return "pro";
  if (lower.includes("opus")) return "opus";
  if (lower.includes("gpt-4o")) return "high";
  return "mid";
}

function ModelChip({ alias }: { alias: string }) {
  const tier  = inferTier(alias);
  const color = TIER_COLOR[tier] ?? "var(--ink-text-3)";
  return (
    <span
      style={{
        fontSize:      "10px",
        fontFamily:    "var(--font-mono)",
        color,
        background:    "var(--ink-bg-sunken)",
        border:        "0.5px solid var(--ink-border-faint)",
        borderRadius:  "var(--radius-sm)",
        padding:       "1px 6px",
        whiteSpace:    "nowrap",
      }}
    >
      {alias}
    </span>
  );
}

export function EngineView() {
  const [data,    setData]    = useState<EngineData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [routingRes, statusRes, queueRes] = await Promise.all([
        apiFetch("/api/engine/routing"),
        apiFetch("/api/engine/status"),
        apiFetch("/api/engine/queue"),
      ]);
      const routing     = routingRes.ok  ? await routingRes.json()  : {};
      const status      = statusRes.ok   ? await statusRes.json()   : {};
      const queueData   = queueRes.ok    ? await queueRes.json()    : {};

      setData({
        routing,
        queue:       queueData.queue ?? [],
        recentRuns:  status.recent_repair_runs ?? [],
        totalCost:   status.total_cost_usd ?? 0,
      });
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)" }}>
        loading…
      </span>
    );
  }

  const routes: RoutingConfig["routes"] = data?.routing?.routes ?? {};
  const rules: RoutingConfig["rules"] = data?.routing?.rules ?? {
    max_cost_per_task: 0,
    confidence_threshold: 0,
    auto_escalate: false,
    max_retries: 0,
  };
  const catalog: RoutingConfig["catalog"] | null = data?.routing?.catalog ?? null;
  const strategy   = data?.routing?.strategy ?? "balanced";
  const sources    = data?.routing?.sources ?? { env: false, file: false };
  const queue      = data?.queue ?? [];
  const recentRuns = data?.recentRuns ?? [];
  const allJobs    = [...queue, ...recentRuns] as (RepairJob & RepairRunSummary)[];

  const totalCost  = data?.totalCost ?? 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div
          style={{
            fontSize:      "9px",
            fontFamily:    "var(--font-mono)",
            fontWeight:    500,
            color:         "var(--ink-text-4)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom:  "0.25rem",
          }}
        >
          Engine
        </div>
        <h2 style={{ fontSize: "17px", fontWeight: 500, margin: 0, color: "var(--ink-text)" }}>
          Model routing
        </h2>
      </div>

      {/* Routing table */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SectionLabel>Task → model</SectionLabel>
        <div
          style={{
            display:       "flex",
            flexDirection: "column",
            gap:           "0",
            borderTop:     "0.5px solid var(--ink-border-faint)",
          }}
        >
          {Object.entries(routes).map(([task, route]) => (
            <div
              key={task}
              style={{
                display:       "grid",
                gridTemplateColumns: "1fr auto auto",
                alignItems:    "center",
                gap:           "1rem",
                padding:       "0.625rem 0",
                borderBottom:  "0.5px solid var(--ink-border-faint)",
              }}
            >
              <span
                style={{
                  fontSize:   "12px",
                  fontFamily: "var(--font-mono)",
                  color:      "var(--ink-text-2)",
                }}
              >
                {task.replace(/_/g, " ")}
              </span>
              <ModelChip alias={route.primary} />
              <span
                style={{
                  fontSize:   "10px",
                  fontFamily: "var(--font-mono)",
                  color:      "var(--ink-text-4)",
                }}
              >
                ↳ {route.fallback}
              </span>
            </div>
          ))}
          {Object.keys(routes).length === 0 && (
            <div
              style={{
                fontSize:   "12px",
                fontFamily: "var(--font-mono)",
                color:      "var(--ink-text-4)",
                padding:    "0.75rem 0",
              }}
            >
              no routing config found
            </div>
          )}
        </div>
      </div>

      {/* Strategy + catalog */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SectionLabel>Routing strategy</SectionLabel>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
              strategy
            </div>
            <div style={{ fontSize: "18px", fontWeight: 300, color: "var(--ink-text)" }}>
              {strategy}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
              source
            </div>
            <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--ink-text-2)" }}>
              {sources.file ? "env + routing_config.json" : "env defaults"}
            </div>
          </div>
        </div>
        {catalog && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
            {Object.entries(catalog).map(([provider, models]) => (
              <div key={provider} style={{ border: "0.5px solid var(--ink-border-faint)", borderRadius: "var(--radius-md)", padding: "0.75rem" }}>
                <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  {provider}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {Object.entries(models as Record<string, string>).map(([key, value]) => (
                    <div key={key} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)" }}>{key}</span>
                      <ModelChip alias={value} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cost rules */}
      {Object.keys(rules).length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <SectionLabel>Rules</SectionLabel>
          <div
            style={{
              display:       "flex",
              flexWrap:      "wrap",
              gap:           "1.5rem",
            }}
          >
            {rules.max_cost_per_task != null && (
              <div>
                <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                  max cost/task
                </div>
                <div style={{ fontSize: "18px", fontWeight: 300, color: "var(--ink-text)", fontVariantNumeric: "tabular-nums" }}>
                  ${rules.max_cost_per_task.toFixed(2)}
                </div>
              </div>
            )}
            {rules.confidence_threshold != null && (
              <div>
                <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                  confidence threshold
                </div>
                <div style={{ fontSize: "18px", fontWeight: 300, color: "var(--ink-text)", fontVariantNumeric: "tabular-nums" }}>
                  {(rules.confidence_threshold * 100).toFixed(0)}%
                </div>
              </div>
            )}
            {rules.max_retries != null && (
              <div>
                <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                  max retries
                </div>
                <div style={{ fontSize: "18px", fontWeight: 300, color: "var(--ink-text)", fontVariantNumeric: "tabular-nums" }}>
                  {rules.max_retries}
                </div>
              </div>
            )}
            {totalCost > 0 && (
              <div>
                <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                  total spent
                </div>
                <div style={{ fontSize: "18px", fontWeight: 300, color: "var(--ink-green)", fontVariantNumeric: "tabular-nums" }}>
                  ${totalCost.toFixed(4)}
                </div>
              </div>
            )}
            {rules.auto_escalate != null && (
              <div>
                <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                  auto escalate
                </div>
                <div style={{ fontSize: "18px", fontWeight: 300, color: "var(--ink-text)", fontVariantNumeric: "tabular-nums" }}>
                  {rules.auto_escalate ? "on" : "off"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Repair pipeline */}
      <div>
        <SectionLabel>Repair queue</SectionLabel>
        {allJobs.length === 0 ? (
          <div
            style={{
              fontSize:   "12px",
              fontFamily: "var(--font-mono)",
              color:      "var(--ink-text-4)",
              padding:    "0.5rem 0",
            }}
          >
            no jobs queued
          </div>
        ) : (
          <div
            style={{
              display:       "flex",
              flexDirection: "column",
              borderTop:     "0.5px solid var(--ink-border-faint)",
            }}
          >
            {allJobs.map((job, i) => {
              const status = (job.status as string) ?? "queued";
              const mark   = STATUS_MARK[status] ?? STATUS_MARK.queued;
              const cost   = job.cost_usd ?? (job as RepairRunSummary).total_cost_usd;
              const model  = job.provider_used ?? (job as RepairRunSummary).provider_alias;
              const fid    = job.finding_id;
              const proj   = job.project_name;

              return (
                <div
                  key={i}
                  style={{
                    display:      "grid",
                    gridTemplateColumns: "16px 1fr auto",
                    alignItems:   "center",
                    gap:          "0.75rem",
                    padding:      "0.5rem 0",
                    borderBottom: "0.5px solid var(--ink-border-faint)",
                  }}
                >
                  {/* Status mark */}
                  <span
                    style={{
                      fontSize:   "13px",
                      fontFamily: "var(--font-mono)",
                      color:      mark.color,
                      animation:  status === "running" ? "pulse-dot 1.5s ease-in-out infinite" : undefined,
                    }}
                  >
                    {mark.symbol}
                  </span>

                  <div>
                    <div
                      style={{
                        fontSize:   "11px",
                        fontFamily: "var(--font-mono)",
                        color:      "var(--ink-text-2)",
                        marginBottom: "1px",
                      }}
                    >
                      {fid}
                    </div>
                    <div
                      style={{
                        fontSize:   "10px",
                        fontFamily: "var(--font-mono)",
                        color:      "var(--ink-text-4)",
                      }}
                    >
                      {proj}
                      {model && <> · {model}</>}
                      {job.patch_applied === true && (
                        <span style={{ color: "var(--ink-green)" }}> · patch applied</span>
                      )}
                      {job.error && (
                        <span style={{ color: "var(--ink-red)" }}> · {job.error.slice(0, 40)}</span>
                      )}
                    </div>
                  </div>

                  {cost != null && cost > 0 && (
                    <span
                      style={{
                        fontSize:   "10px",
                        fontFamily: "var(--font-mono)",
                        color:      "var(--ink-text-4)",
                      }}
                    >
                      ${cost.toFixed(4)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
