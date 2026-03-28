# Worker LLM Routing

## Overview

The Lyra worker now supports multi-provider LLM routing. Instead of hardcoding OpenAI, it intelligently selects the best model based on:

1. **Explicit configuration** (if set)
2. **Routing strategy** (aggressive, balanced, precision)
3. **Provider availability** (fallback if primary unavailable)
4. **Cost optimization** (cheaper models when appropriate)

## Supported Providers

### OpenAI
- **Models**: `gpt-4o-mini`, `gpt-4o`
- **Aliases**: `openai:mini`, `openai:balanced`
- **Requires**: `OPENAI_API_KEY`

### Anthropic (Claude)
- **Models**: `claude-3-5-haiku`, `claude-3-5-sonnet`, `claude-3-opus`
- **Aliases**: `anthropic:haiku`, `anthropic:sonnet`, `anthropic:opus`
- **Requires**: `ANTHROPIC_API_KEY`

## Configuration

### Default Routing by Strategy

The worker automatically selects models based on your routing strategy:

```bash
# Aggressive strategy (fastest, cheapest)
export LYRA_ROUTING_STRATEGY=aggressive
# Uses: anthropic:haiku, fallback to openai:mini

# Balanced strategy (default)
export LYRA_ROUTING_STRATEGY=balanced
# Uses: openai:mini, fallback to anthropic:haiku

# Precision strategy (slowest, most capable)
export LYRA_ROUTING_STRATEGY=precision
# Uses: anthropic:sonnet, fallback to openai:balanced
```

### Explicit Model Selection

Override strategy with an explicit model:

```bash
# Format 1: Explicit provider:model
export LYRA_AUDIT_MODEL=anthropic:sonnet

# Format 2: Inferred from model name
export LYRA_AUDIT_MODEL=gpt-4o-mini        # Inferred as openai:mini
export LYRA_AUDIT_MODEL=claude-3.5-sonnet  # Inferred as anthropic:sonnet

# Fallback is always openai:mini if primary fails
```

### Required API Keys

Set at least one:

```bash
export OPENAI_API_KEY=YOUR_OPENAI_API_KEY
export ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
```

If neither is set, audits fail gracefully with a config error finding.

## How It Works

### 1. Model Resolution

```
Query: "What model should I use?"
    ↓
If LYRA_AUDIT_MODEL set:
  ├─ Parse format: provider:model or infer from name
  ├─ Validate provider exists
  └─ Use with fallback
Else:
  ├─ Check LYRA_ROUTING_STRATEGY
  ├─ Select strategy-appropriate model
  └─ Assign fallback
```

### 2. Provider Selection

```
Primary provider available?
├─ Yes → Use primary
├─ No → Try fallback
└─ Neither → Error
```

### 3. Request Execution

```
registry.call(primary, fallback, request)
    ↓
Try primary provider:
  ├─ Success → Return response
  └─ Failure → Try fallback
Try fallback provider:
  ├─ Success → Return response
  └─ Failure → Error
```

## Cost Tracking

Each LLM response includes estimated costs:

```typescript
interface AuditLlmResult {
  costUsd?: number;  // Estimated cost for this call
  provider: string;  // "openai" or "anthropic"
  model: string;     // Full model name (e.g., "gpt-4o-mini")
  // ... other fields
}
```

These costs are approximate based on:
- OpenAI GPT-4o pricing (~$0.015/$0.06 per 1M input/output tokens)
- Anthropic Claude pricing (~$0.00008/$0.00024 for Haiku)

## Environment Variables

### Provider Authentication
```bash
OPENAI_API_KEY           # OpenAI API key
ANTHROPIC_API_KEY        # Anthropic API key
```

### Model Configuration
```bash
LYRA_AUDIT_MODEL         # Explicit model (e.g., "openai:mini", "gpt-4o-mini")
LYRA_ROUTING_STRATEGY    # Strategy: aggressive, balanced, or precision (default)
```

### Existing Variables (Still Supported)
```bash
OPENAI_API_KEY           # Fallback if LYRA_AUDIT_MODEL not set
LYRA_AUDIT_MODEL         # Now supports all formats, not just OpenAI
```

## Example Configurations

### Local Development (Fast)
```bash
export ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
export LYRA_ROUTING_STRATEGY=aggressive
# Uses: claude-3-5-haiku (fastest, cheapest)
```

### Production (Balanced)
```bash
export OPENAI_API_KEY=YOUR_OPENAI_API_KEY
export ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
export LYRA_ROUTING_STRATEGY=balanced
# Uses: gpt-4o-mini with anthropic:haiku fallback
```

### Production (High Quality)
```bash
export ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
export LYRA_ROUTING_STRATEGY=precision
# Uses: claude-3-5-sonnet (most capable)
```

### Forced Single Provider
```bash
export OPENAI_API_KEY=YOUR_OPENAI_API_KEY
export LYRA_AUDIT_MODEL=openai:balanced
# Uses: gpt-4o, fallback to gpt-4o-mini
```

## Migration from Hardcoded OpenAI

### Before
```typescript
// Old: Always used OpenAI
const key = process.env.OPENAI_API_KEY;
const model = process.env.LYRA_AUDIT_MODEL || "gpt-4o-mini";
```

### After
```typescript
// New: Multi-provider with intelligent routing
const { primary, fallback } = resolveModel();
const response = await registry.call(primary, fallback, request);
```

**No breaking changes** — existing code setting `OPENAI_API_KEY` and `LYRA_AUDIT_MODEL` works identically.

## Error Handling

If LLM call fails, the worker:

1. Logs the error
2. Returns a finding entry documenting the failure
3. Continues with other audits (non-blocking)
4. Reports cost even on failure

Example error finding:
```json
{
  "finding_id": "app-llm-error",
  "title": "LLM call failed",
  "description": "ANTHROPIC_API_KEY not set",
  "type": "question",
  "severity": "minor",
  "category": "config"
}
```

## Provider Implementation

Each provider extends `LLMProvider`:

```typescript
abstract class LLMProvider {
  abstract call(modelId, request): Promise<LLMResponse>;
  abstract isConfigured(): boolean;
  abstract configurationError(): string;
}
```

Adding a new provider (e.g., Gemini, Mistral):

1. Create `worker/src/providers/gemini.ts`
2. Extend `LLMProvider`
3. Implement `call()`, `isConfigured()`, `configurationError()`
4. Register in `registry.ts`

## Cost Optimization Tips

### Use Aggressive Strategy for Non-Critical Audits
```bash
# Haiku is 20x cheaper than Sonnet
export LYRA_ROUTING_STRATEGY=aggressive
```

### Override for Complex Tasks
```bash
# Use Sonnet for semantic analysis, Haiku for simple checks
export LYRA_AUDIT_MODEL=anthropic:sonnet
```

### Monitor Costs
```bash
# Process AuditLlmResult.costUsd in your audit pipeline
console.log(`Audit cost: $${result.costUsd}`);
```

## Troubleshooting

### "No LLM provider configured"
- Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- Verify keys are valid and have API access

### "Provider not found: xyz"
- Check `LYRA_AUDIT_MODEL` format
- Supported providers: `openai`, `anthropic`
- Supported models: `mini`, `balanced`, `haiku`, `sonnet`, `opus`

### Provider keeps failing to fallback not working
- Verify fallback provider is configured
- Check provider API key validity
- Review worker logs for detailed error

### Models not switching based on strategy
- Verify `LYRA_ROUTING_STRATEGY` is set correctly
- Check `LYRA_AUDIT_MODEL` is NOT overriding it
- Strategy only applies when `LYRA_AUDIT_MODEL` is unset

## Roadmap

Future provider support:
- [ ] Google Gemini (`gemini:flash`, `gemini:pro`)
- [ ] Mistral AI (`mistral:7b`, `mistral:large`)
- [ ] Local models (Ollama, vLLM)
- [ ] Cost-based auto-escalation

## Testing

### Test Provider Discovery
```bash
export OPENAI_API_KEY=YOUR_OPENAI_API_KEY
export ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
npm run dev
# Check logs: "[routing] Calling openai:mini"
```

### Test Fallback
```bash
# Unset primary provider
unset OPENAI_API_KEY
export ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
npm run dev
# Check logs: "[routing] Primary provider not configured, trying fallback"
```

### Test Cost Tracking
```bash
# Run an audit and check the response
// response.costUsd should be populated
// response.provider should match what was used
```
