# ATLAS prompts in Lyra

These files support design critique workflows alongside the LYRA Visual Audit Suite.

| File | Role |
|------|------|
| [ATLAS_AUDIT_PROTOCOL.md](ATLAS_AUDIT_PROTOCOL.md) | Layered checklist (0–4 per item) and output shape: critical issues, high-impact items, three moves, redesign scope. |
| [ATLAS_AGENT_PROMPT.md](ATLAS_AGENT_PROMPT.md) | Optional **strong POV** system prompt (aesthetic philosophy, anti-patterns). Use when you want that voice; default Lyra visual agents stay neutral. |

**Integration:** Visual audit prompts reference protocol layers where checkable from code; the visual synthesizer emits an optional `atlas_narrative` block derived from merged findings. See [audits/prompts/VISUAL-README.md](../audits/prompts/VISUAL-README.md) for the layer ↔ agent map and scale disclaimer.
