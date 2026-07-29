# Phase 12 runtime and dependency warning governance

Evidence date: 2026-07-30 (Asia/Taipei).

## `lucide-vue-next` deprecation — FIXED

- Reproduction: `pnpm install --frozen-lockfile` on the Phase 11 baseline.
- Original warning: `lucide-vue-next@0.468.0` is deprecated in favor of `@lucide/vue`.
- Inventory: 36 Vue files imported named icons. Facebook and Instagram were the only imported names absent from the replacement package.
- Decision: migrate named imports to exact `@lucide/vue@1.27.0`; retain the two missing brand paths as local Vue SVG components with the upstream ISC provenance noted in source.
- Risk control: no blind export substitution; typecheck proves every named export, browser accessibility proves rendered icons do not break accessible names, and SSR build proves server compatibility.
- Bundle evidence: client JavaScript changed from 671,305 to 672,377 bytes, an increase of 1,072 bytes (0.16%), with no abnormal bundle growth.
- Verification: typecheck, build, local cross-browser E2E and visual-presence browser assertions pass.

## Nuxt schema peer metadata — UPSTREAM BLOCKED

- Reproduction: `pnpm peers check`.
- Original warning: installed `@nuxt/schema@3.21.10`; `@nuxt/cli@3.37.0` declares `@nuxt/schema ^4.4.6`.
- Dependency evidence: `nuxt@3.21.10` pins its schema to `3.21.10` while depending on `@nuxt/cli ^3.37.0`. The resolved CLI therefore requests the incompatible major schema itself.
- Available changes: force a pre-3.37 CLI outside Nuxt's declared range, install a second major schema, suppress peer validation, or migrate the application to Nuxt 4.
- Decision: none is a safe Phase 12 patch. A Nuxt 4 migration is a separate compatibility project; overrides and suppression would conceal the metadata conflict.
- Impact: package-manager peer metadata only. Frozen install, typecheck, build, SSR integration and browser execution pass.
- Owner acceptance required: dependency owner must track the Nuxt upstream resolution or approve a Nuxt 4 migration.

## Nitro trailing-slash deprecation — UPSTREAM BLOCKED

- Reproduction: `NODE_OPTIONS=--trace-deprecation pnpm run build`.
- Original warning: `DEP0155` while resolving `@vue/shared` from `@nuxt/nitro-server/dist/runtime/templates/error-500.mjs`.
- Trace: emitted by `exsolve` inside Nitro's Rollup resolver, not by an application route rule or application import. The generated template imports `@vue/shared` without a trailing slash.
- Attempted remediation: upgraded the transitive resolver from `exsolve@1.1.0` to current `1.1.1` through the locked workspace override; the warning remains. Explicit Nitro externalization was tested, did not remove the resolver warning, and was not retained.
- Decision: preserve the current Nitro config and record the upstream blocker. Warning suppression is not used.
- Impact: build-time deprecation only. Build completes and robots, sitemap, SSR routes, true 404 and integration/browser gates pass.
- Owner acceptance required: dependency owner tracks a Nitro/exsolve fix and removes the temporary exact override after upstream resolution.

## GitHub Actions bundled runtime — FIXED

- Reproduction: inspect the Phase 11 workflow action versions and their `action.yml` runtime.
- Original risk: checkout/setup/upload/dependency-review releases were on older Node bundled runtimes.
- Decision: update to immutable current releases whose manifests use `node24`.
- Pins:
  - `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1` (`v7.0.1`)
  - `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020` (`v7.0.0`)
  - `actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (`v7.0.1`)
  - `actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` (`v8.0.1`)
  - `actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294` (`v5.0.0`)
- Verification: repository verifier rejects mutable refs and confirms every external action is a 40-character SHA. Remote CI remains required before closure.

## Deprecated transitive packages — UPSTREAM BLOCKED

- Reproduction: `pnpm install --frozen-lockfile`.
- Current list: `@koa/router@12.0.2`, `glob@10.5.0`, `glob@7.2.3`, `inflight@1.0.6`, and `unplugin-vue-router@0.19.2`.
- Decision: do not force transitive majors outside their owners' declared ranges. `pnpm audit --prod --audit-level=high` reports no known production vulnerability.
- Owner acceptance required: dependency owner reviews these on each weekly Dependabot cycle.
