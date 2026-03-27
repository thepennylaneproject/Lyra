{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # Codra \'97 Expectations Document\
\
> Generated from repository inspection on 2026-03-22\
> Review required before activation\
\
---\
\
## 1. Project Identity\
\
- Project name: `Codra`\
- Source type: `local_path`\
- Source ref: `/Users/sarahsahl/Desktop/codra`\
- Default branch: `main`\
\
## 2. Audit Scope Defaults\
\
Lyra should treat these paths as the default project scope unless a narrower audit scope is selected:\
- `src/.DS_Store/`\
- `src/App.tsx/`\
- `src/app/`\
- `src/audits/`\
- `src/components/`\
- `src/docs/`\
- `src/domain/`\
- `src/env.d.ts/`\
- `src/features/`\
- `src/hooks/`\
- `src/index.css/`\
- `src/lib/`\
- `src/main.tsx/`\
- `src/new/`\
- `src/pages/`\
- `src/pipeline/`\
- `src/services/`\
- `src/stories/`\
- `src/styles/`\
- `src/types/`\
- `src/utils/`\
\
Config files to keep in scope:\
- `.netlify/functions-serve/ai-complete/package.json`\
- `.netlify/functions-serve/ai-stream/package.json`\
- `.netlify/functions-serve/analyze-new-assets/package.json`\
- `.netlify/functions-serve/asset_manifest_get/package.json`\
- `.netlify/functions-serve/asset_manifest_save/package.json`\
- `.netlify/functions-serve/asset_manifest_validate/package.json`\
- `.netlify/functions-serve/assets_delete/package.json`\
- `.netlify/functions-serve/assets_finalize/package.json`\
- `.netlify/functions-serve/assets_list/package.json`\
- `.netlify/functions-serve/assets_upload_url/package.json`\
- `.netlify/functions-serve/auth-callback/package.json`\
- `.netlify/functions-serve/billing-checkout/package.json`\
- `.netlify/functions-serve/billing-portal/package.json`\
- `.netlify/functions-serve/billing-webhook/package.json`\
- `.netlify/functions-serve/credentials-create/package.json`\
- `.netlify/functions-serve/credentials-rotate/package.json`\
- `.netlify/functions-serve/credentials-test/package.json`\
- `.netlify/functions-serve/github-auth-callback/package.json`\
- `.netlify/functions-serve/github-auth-start/package.json`\
- `.netlify/functions-serve/image-generate/package.json`\
\
## 3. Stack Constraints\
\
- Primary language: `JavaScript`\
- Framework: `React`\
- Build: `vite`\
- Hosting: `netlify`\
- Database: `supabase`\
- CSS: `tailwind`\
\
## 4. Validation Commands\
\
- Test: `vitest`\
- Lint: `eslint src`\
- Build: `NODE_OPTIONS="--max-old-space-size=8192" tsc && NODE_OPTIONS="--max-old-space-size=8192" vite build`\
- Typecheck: `tsc --noEmit && tsc -p tsconfig.node.json --noEmit`\
\
## 5. Audit Expectations\
\
### 5.1 Review required before autonomous action\
Generated profile and expectations are draft artifacts until explicitly activated.\
\
### 5.2 Scope-aware audits\
Lyra should prefer `file`, `directory`, `selection`, or `diff` scopes when provided. `project` scope should use the default scan roots above.\
\
### 5.3 Evidence standard\
Every finding should cite file paths and, when possible, line anchors from the scanned scope. Missing evidence should lower confidence.\
\
### 5.4 Command safety\
If validation commands are unavailable or fail to run, Lyra should record the gap rather than claiming verification.\
\
### 5.5 Activation gate\
Only active expectations should drive production audit runs. Draft expectations remain review artifacts.\
\
## 6. Notes For Operator Review\
\
- Confirm scan roots are correct for this repo.\
- Confirm commands before enabling automated validation.\
- Add project-specific rules after the first reviewed audit if needed.\
}