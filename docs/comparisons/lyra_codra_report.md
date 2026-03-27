{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # Codra \'97 Codebase Intelligence Audit\
\
## SECTION 1: PROJECT IDENTITY\
\
### 1. Project Name\
codra [VERIFIED]\
\
### 2. Repository URL\
https://github.com/thepennylaneproject/Codra [VERIFIED]\
\
### 3. One-Line Description\
Quoted from README or metadata:\
> > Part of <a href="https://thepennylaneproject.org">The Penny Lane Project</a> \'97 technology that serves the individual.\
\
Cleaner version: AI workflow tool with multi-provider integration [VERIFIED OR DIRECTLY QUOTED]\
\
### 4. Project Status\
beta [INFERRED FROM CODEBASE SIGNALS]\
\
### 5. Commit Dates\
- First commit: 2025-12-14T15:23:46-06:00\
- Most recent commit: 2026-03-19T19:41:46-05:00\
\
### 6. Total Number of Commits\
167\
\
### 7. Deployment Status\
Netlify config detected, GitHub Actions detected, README references external URLs\
\
### 8. Live URLs\
- https://res.cloudinary.com/sarah-sahl/image/upload/codra/A_close-up_portrait_of_the_bride_her_hair_styled_in_an_updo_w_6694589a-6a3f-4670-b9c6-380dec5dc97c_0_zg9kuv\
- https://res.cloudinary.com/sarah-sahl/image/upload/codra/A_close-up_portrait_of_the_bride_her_hair_styled_in_an_updo_w_6694589a-6a3f-4670-b9c6-380dec5dc97c_1_kawwvq\
- https://res.cloudinary.com/sarah-sahl/image/upload/codra/A_close-up_portrait_of_the_bride_her_hair_styled_in_an_updo_w_6694589a-6a3f-4670-b9c6-380dec5dc97c_2_bfszxo\
- https://res.cloudinary.com/sarah-sahl/image/upload/codra/A_close-up_portrait_of_the_bride_her_hair_styled_in_an_updo_w_6694589a-6a3f-4670-b9c6-380dec5dc97c_3_yjm78c\
- https://res.cloudinary.com/sarah-sahl/image/upload/codra/A_close-up_portrait_of_the_bride_her_hair_styled_in_an_updo_w_d660c1fe-325a-4a7f-b1d5-2ce55c258937_0_yda75x\
- https://res.cloudinary.com/sarah-sahl/image/upload/codra/A_close-up_portrait_of_the_bride_her_hair_styled_in_an_updo_w_d660c1fe-325a-4a7f-b1d5-2ce55c258937_1_pexjct\
- https://res.cloudinary.com/sarah-sahl/image/upload/codra/A_close-up_portrait_of_the_bride_her_hair_styled_in_an_updo_w_d660c1fe-325a-4a7f-b1d5-2ce55c258937_2_au59nd\
- https://res.cloudinary.com/sarah-sahl/image/upload/codra/A_close-up_portrait_of_the_bride_her_hair_styled_in_an_updo_w_d660c1fe-325a-4a7f-b1d5-2ce55c258937_3_xgufri\
- https://res.cloudinary.com/sarah-sahl/image/upload/codra/A_collage_of_inked_drawings_and_handwritten_notes_with_englis_d050c0e7-63db-4e13-93d5-816d3d58f1fb_0_mf9tpl\
- https://res.cloudinary.com/sarah-sahl/image/upload/codra/A_collage_of_inked_drawings_and_handwritten_notes_with_englis_fa7f16af-0a29-461b-9afd-72dbbab632e3_0_ua7iqo\
\
## SECTION 2: TECHNICAL ARCHITECTURE\
\
### 1. Primary Languages and Frameworks\
- Languages: JavaScript, TypeScript, Python, SQL\
- Frameworks: React\
\
### 2. Full Dependency List\
### Core framework dependencies\
- @monaco-editor/react@^4.7.0\
- @radix-ui/react-tooltip@^1.2.8\
- @tanstack/react-query@^5.90.12\
- @vitejs/plugin-react@^4.3.1\
- @xyflow/react@^12.10.0\
- lucide-react@^0.556.0\
- react@^18.3.1\
- react-dom@^18.3.1\
- react-router-dom@^6.30.2\
- react-speech-recognition@^4.0.1\
- @storybook/react-vite@^10.1.11\
- @types/react@^18.3.3\
- @types/react-dom@^18.3.0\
- @types/react-speech-recognition@^3.9.6\
- eslint-plugin-react@^7.37.5\
- eslint-plugin-react-hooks@^4.6.2\
\
### UI / styling libraries\
- @radix-ui/react-tooltip@^1.2.8\
- framer-motion@^12.23.26\
- tailwind-merge@^3.4.0\
- tailwindcss@^3.4.10\
\
### API / data layer\
- @supabase/supabase-js@^2.86.2\
\
### AI / ML integrations\
- [NOT FOUND IN CODEBASE]\
\
### Authentication\
- [NOT FOUND IN CODEBASE]\
\
### Testing\
- @storybook/addon-vitest@^10.1.11\
- @vitest/browser@^4.0.16\
- @vitest/coverage-v8@^4.0.16\
- playwright@^1.57.0\
- vitest@^4.0.16\
\
### Build tooling\
- @vitejs/plugin-react@^4.3.1\
- @storybook/addon-vitest@^10.1.11\
- @storybook/react-vite@^10.1.11\
- @typescript-eslint/eslint-plugin@^8.0.0\
- @typescript-eslint/parser@^8.0.0\
- @vitest/browser@^4.0.16\
- @vitest/coverage-v8@^4.0.16\
- eslint@^8.57.0\
- eslint-plugin-codra@file:eslint-plugin-codra\
- eslint-plugin-react@^7.37.5\
- eslint-plugin-react-hooks@^4.6.2\
- eslint-plugin-storybook@^10.1.11\
- typescript@^5.9.3\
- vite@^7.0.0\
- vitest@^4.0.16\
\
### Other\
- @netlify/functions@^2.8.0\
- ajv@^8.18.0\
- ajv-formats@^3.0.1\
- canvas-confetti@^1.9.4\
- cloudinary@^2.8.0\
- clsx@^2.1.1\
- crypto@^1.0.1\
- crypto-js@^4.2.0\
- date-fns@^4.1.0\
- html2canvas@^1.4.1\
- immer@^11.0.1\
- jsonpath-plus@^10.3.0\
- jspdf@^4.2.0\
- lodash.isequal@^4.5.0\
- monaco-editor@^0.53.0\
- octokit@^5.0.5\
- p-limit@^7.2.0\
- postcss-import@^16.1.1\
- posthog-js@^1.309.1\
- recharts@^3.5.1\
- sharp@^0.34.5\
- shepherd.js@^14.5.1\
- stripe@^20.0.0\
- ts-jobspy@^2.0.3\
- uuid@^13.0.0\
- zod@^4.1.13\
- zustand@^5.0.9\
- @chromatic-com/storybook@^4.1.3\
- @storybook/addon-a11y@^10.1.11\
- @storybook/addon-docs@^10.1.11\
- @storybook/addon-onboarding@^10.1.11\
- @types/canvas-confetti@^1.9.0\
- @types/crypto-js@^4.2.2\
- @types/lodash.isequal@^4.5.8\
- @types/node@^22.19.2\
- @types/sharp@^0.31.1\
- @types/uuid@^10.0.0\
- autoprefixer@^10.4.20\
- dotenv@^17.2.3\
- glob@^11.0.0\
- postcss@^8.4.41\
- storybook@^10.1.11\
- stylelint@^16.7.0\
- stylelint-config-standard@^36.0.0\
- tsx@^4.19.2\
\
### 3. Project Structure\
- `AGENTS.md` \'97 repository content\
- `Codra ImagePolicy Specification v1.md` \'97 repository content\
- `Codra Language Charter` \'97 repository content\
- `LICENSE` \'97 repository content\
- `README.md` \'97 repository content\
- `archive` \'97 repository content\
- `audits` \'97 repository content\
- `debug-storybook.log` \'97 repository content\
- `deno.lock` \'97 repository content\
- `dist` \'97 repository content\
- `docs` \'97 documentation\
- `eslint-plugin-codra` \'97 repository content\
- `eslint-rules` \'97 repository content\
- `index.html` \'97 repository content\
- `netlify` \'97 repository content\
- `netlify.toml` \'97 repository content\
- `node_modules` \'97 repository content\
- `out` \'97 repository content\
- `package-lock.json` \'97 repository content\
- `package.json` \'97 repository content\
\
### 4. Architecture Pattern\
React application structure detected.\
\
### 5. Database / Storage Layer\
supabase [VERIFIED OR INFERRED FROM CONFIG]\
\
### 6. API Layer\
[NOT FOUND IN CODEBASE]\
\
### 7. External Service Integrations\
- Supabase\
- Stripe\
\
### 8. AI/ML Components\
[NOT FOUND IN CODEBASE]\
\
### 9. Authentication and Authorization Model\
Auth-related code paths detected in sampled files.\
\
### 10. Environment Variables\
- ANTHROPIC_API_KEY\
- API_VERSION\
- API_VERSIONS\
- API_VERSION_HEADER_NAME\
- API_VERSION_REGEX\
- CLOUDINARY_API_KEY\
- CLOUDINARY_API_SECRET\
- CLOUDINARY_CLOUD_NAME\
- CODRA_APP_SECRET\
- ENCRYPTION_APP_SECRET\
- NODE_ENV\
- OPENAI_API_KEY\
- STRIPE_SECRET_KEY\
- STRIPE_WEBHOOK_SECRET\
- SUPABASE_SERVICE_KEY\
- SUPABASE_SERVICE_ROLE_KEY\
- SUPABASE_URL\
- URL\
- VITE_SUPABASE_ANON_KEY\
- VITE_SUPABASE_URL\
\
## SECTION 3: FEATURE INVENTORY\
\
This foundation pass records implementation signals from files rather than claiming a complete feature inventory.\
- `.cache/enrichment/content-hash-cache.json` suggests active implementation scope\
- `.claude/settings.local.json` suggests active implementation scope\
- `.github/ACCENT_COLOR_CHECKLIST.md` suggests active implementation scope\
- `.github/agents/audit-agent.md` suggests active implementation scope\
- `.github/copilot-instructions.md` suggests active implementation scope\
- `.github/expectations/codra-expectations.md` suggests active implementation scope\
- `.github/pull_request_template.md` suggests active implementation scope\
- `.github/workflows/ci.yml` suggests active implementation scope\
- `.github/workflows/scheduled-audit.yml` suggests active implementation scope\
- `.netlify/edge-functions-import-map.json` suggests active implementation scope\
- `.netlify/edge-functions-serve/dev.js` suggests active implementation scope\
- `.netlify/functions-serve/ai-complete/ai-complete.js` suggests active implementation scope\
- `.netlify/functions-serve/ai-complete/netlify/functions/ai-complete.js` suggests active implementation scope\
- `.netlify/functions-serve/ai-complete/package.json` suggests active implementation scope\
- `.netlify/functions-serve/ai-stream/ai-stream.js` suggests active implementation scope\
- `.netlify/functions-serve/ai-stream/netlify/functions/ai-stream.js` suggests active implementation scope\
- `.netlify/functions-serve/ai-stream/package.json` suggests active implementation scope\
- `.netlify/functions-serve/analyze-new-assets/analyze-new-assets.js` suggests active implementation scope\
- `.netlify/functions-serve/analyze-new-assets/netlify/functions/analyze-new-assets.js` suggests active implementation scope\
- `.netlify/functions-serve/analyze-new-assets/package.json` suggests active implementation scope\
- `.netlify/functions-serve/asset_manifest_get/asset_manifest_get.js` suggests active implementation scope\
- `.netlify/functions-serve/asset_manifest_get/netlify/functions/asset_manifest_get.js` suggests active implementation scope\
- `.netlify/functions-serve/asset_manifest_get/package.json` suggests active implementation scope\
- `.netlify/functions-serve/asset_manifest_save/asset_manifest_save.js` suggests active implementation scope\
- `.netlify/functions-serve/asset_manifest_save/netlify/functions/asset_manifest_save.js` suggests active implementation scope\
- `.netlify/functions-serve/asset_manifest_save/package.json` suggests active implementation scope\
- `.netlify/functions-serve/asset_manifest_validate/asset_manifest_validate.js` suggests active implementation scope\
- `.netlify/functions-serve/asset_manifest_validate/netlify/functions/asset_manifest_validate.js` suggests active implementation scope\
- `.netlify/functions-serve/asset_manifest_validate/package.json` suggests active implementation scope\
- `.netlify/functions-serve/assets_delete/assets_delete.js` suggests active implementation scope\
- `.netlify/functions-serve/assets_delete/netlify/functions/assets_delete.js` suggests active implementation scope\
- `.netlify/functions-serve/assets_delete/package.json` suggests active implementation scope\
- `.netlify/functions-serve/assets_finalize/assets_finalize.js` suggests active implementation scope\
- `.netlify/functions-serve/assets_finalize/netlify/functions/assets_finalize.js` suggests active implementation scope\
- `.netlify/functions-serve/assets_finalize/package.json` suggests active implementation scope\
- `.netlify/functions-serve/assets_list/assets_list.js` suggests active implementation scope\
- `.netlify/functions-serve/assets_list/netlify/functions/assets_list.js` suggests active implementation scope\
- `.netlify/functions-serve/assets_list/package.json` suggests active implementation scope\
- `.netlify/functions-serve/assets_upload_url/assets_upload_url.js` suggests active implementation scope\
- `.netlify/functions-serve/assets_upload_url/netlify/functions/assets_upload_url.js` suggests active implementation scope\
\
## SECTION 4: DESIGN SYSTEM & BRAND\
\
UI styling signals detected in sampled files.\
\
## SECTION 5: DATA & SCALE SIGNALS\
\
- Test files found: 25\
- Deployment/config files: 20\
- File count scanned: 1073\
\
## SECTION 6: MONETIZATION & BUSINESS LOGIC\
\
Billing libraries detected: stripe@^20.0.0\
\
## SECTION 7: CODE QUALITY & MATURITY SIGNALS\
\
- Config files: .netlify/functions-serve/ai-complete/package.json, .netlify/functions-serve/ai-stream/package.json, .netlify/functions-serve/analyze-new-assets/package.json, .netlify/functions-serve/asset_manifest_get/package.json, .netlify/functions-serve/asset_manifest_save/package.json, .netlify/functions-serve/asset_manifest_validate/package.json, .netlify/functions-serve/assets_delete/package.json, .netlify/functions-serve/assets_finalize/package.json, .netlify/functions-serve/assets_list/package.json, .netlify/functions-serve/assets_upload_url/package.json, .netlify/functions-serve/auth-callback/package.json, .netlify/functions-serve/billing-checkout/package.json, .netlify/functions-serve/billing-portal/package.json, .netlify/functions-serve/billing-webhook/package.json, .netlify/functions-serve/credentials-create/package.json, .netlify/functions-serve/credentials-rotate/package.json, .netlify/functions-serve/credentials-test/package.json, .netlify/functions-serve/github-auth-callback/package.json, .netlify/functions-serve/github-auth-start/package.json, .netlify/functions-serve/image-generate/package.json\
- Tests present: yes\
- Default commands: - Test: `vitest`\
- Lint: `eslint src`\
- Build: `NODE_OPTIONS="--max-old-space-size=8192" tsc && NODE_OPTIONS="--max-old-space-size=8192" vite build`\
- Typecheck: `tsc --noEmit && tsc -p tsconfig.node.json --noEmit`\
\
## SECTION 8: ECOSYSTEM CONNECTIONS\
\
- Primary repository: https://github.com/thepennylaneproject/Codra\
\
## SECTION 9: WHAT'S MISSING (CRITICAL)\
\
- Production gaps: Deployment, reliability, and runtime validation should be reviewed before production use.\
- Investor readiness gaps: metrics, growth evidence, and operations documentation are not inferred automatically.\
- Codebase gaps: this profile is generated from direct repository inspection and flags missing data explicitly.\
- Recommended next steps:\
  1. Review and tighten the generated expectations document.\
  2. Confirm scan roots and commands before activating audits.\
  3. Run a scoped full audit after activation.\
  4. Add or verify deployment and environment documentation.\
  5. Capture operator decisions so Lyra can calibrate future audits.\
\
## SECTION 10: EXECUTIVE SUMMARY\
\
Codra appears to be a beta codebase oriented around React. This summary is generated only from repository evidence and marks missing data explicitly.\
\
The codebase shows technical signals through .netlify/functions-serve/ai-complete/package.json, .netlify/functions-serve/ai-stream/package.json, .netlify/functions-serve/analyze-new-assets/package.json, .netlify/functions-serve/asset_manifest_get/package.json and 25 test files. Commands and stack metadata have been captured for future audits.\
\
The next milestone is to review the generated profile and expectations, activate the project, and run scoped audits against the stored scan roots. That will turn this from imported metadata into an auditable Lyra project.\
\
```\
---\
AUDIT METADATA\
Project: Codra\
Date: 2026-03-22\
Agent: lyra-onboarding-foundation\
Codebase access: full repo\
Confidence level: medium; deterministic repo inspection without runtime execution\
Sections with gaps: sections depending on runtime, external services, and undocumented product intent\
Total files analyzed: 1073\
---\
```}