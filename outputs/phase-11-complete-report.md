# March Out For Love — Phase 11 完整報告

報告日期：2026-07-29（Asia/Taipei）
Repository：`Jacob0710/marchoutWebsite`
Phase：Phase 11 — Automated Testing and CI
最終判定：**PASS WITH ACCEPTED RISKS**
最終狀態：**MERGED / RELEASED COMPLETE**

## 0. 文件定位與證據邊界

本文件是 Phase 11 的獨立完整報告，供 ChatGPT、技術 reviewer、Release Engineer 或資安 reviewer 判讀。內容涵蓋實作、測試、coverage、CI、pull request、合併、production deployment、read-only 驗收、治理、completion tag 與 residual risks。

本文件不包含任何 credential value、管理員帳號、密碼、cookie、private key、database password、Supabase service-role material 或 environment secret value。

證據優先順序：

1. GitHub PR、GitHub Actions run、Vercel deployment 與遠端 Git tag 是遠端狀態的權威證據。
2. Tagged `main` commit 中的 `outputs/phase-11-execution-status.md` 與 `outputs/phase-10-and-11-complete-report.md` 是 repository 內的完成紀錄。
3. 本獨立報告是在 completion tag 建立後產生的便利文件，目前不屬於 tagged commit；這可避免為了加入新文件而移動已核驗的 completion tag。
4. Coverage 是 curated scope，不是 whole-application coverage。
5. 所有 production 驗收均為 synthetic 或 read-only smoke；Phase 11 沒有執行 production release apply 或資料寫入。

## 1. Executive summary

Phase 11 已完成下列成果：

- 建立 ESLint zero-warning gate。
- 建立 Vitest unit／component 測試與 curated coverage threshold。
- 建立 built Nitro SSR integration contract。
- 建立 repository、secret、generated-artifact 與 workflow integrity verifier。
- 建立 production dependency audit 與 GitHub Dependency Review。
- 將 GitHub Actions 外部 action 固定到 immutable 40-character commit SHA。
- 建立 PR、`main`、schedule 與 protected environment 的 CI 拓撲。
- 保留 Phase 10 privacy、redirect、security、cache 與 static regression。
- 完成 PR #2 實作合併。
- 完成 PR #11 發布證據合併。
- 完成最終 `main` CI、Vercel Production 與 production read-only 驗收。
- 建立並推送 Phase 11 completion tag。
- 啟用不可直接繞過的 `main` branch protection。
- 記錄 owner 採用單人維護模式及接受的 residual risks。

最終 repository、CI、deployment 與 tag 均指向：

`c3995e4b6dd02ef24c4b93cc6770dae662a09099`

## 2. 任務目標、範圍與非目標

### 2.1 目標

- 將品質檢查轉化為可重複、自動化、遠端可追溯的 gate。
- 對選定的 pure domain／security logic 建立有效測試與 coverage threshold。
- 驗證 production build 產物的 SSR／HTTP contract。
- 在不向不受信任 PR 暴露 production secrets 的前提下，保留 authenticated read-only release gate。
- 確保 Phase 10 的 privacy、security、redirect 與 migration 完成狀態不退化。

### 2.2 明確非目標

- 不新增產品功能。
- 不改版介面。
- 不執行 production database migration。
- 不執行 Storage mutation。
- 不執行 editorial 或 redirect release apply。
- 不以 PR Preview 取代 Production deployment。
- 不將 curated coverage 描述成全應用 coverage。

## 3. Release identity

| 項目 | 值 |
| --- | --- |
| Repository | `Jacob0710/marchoutWebsite` |
| Baseline branch | `main` |
| Phase 11 baseline | `81a6add79fa2d8d42f8c5d85900222156a7d1c7c` |
| Implementation branch | `codex/phase11-automated-testing-ci` |
| Initial implementation commit | `422077d8f7a03e2a63368b9b3e566e90dc7289f4` |
| Clean-runner fix | `1541824564fef6dc662bee25c628961f216f513e` |
| Remote-evidence commit | `767b471b1eb515546cefc4f7ec8e4b81ab9871f8` |
| Definition-of-Done commit | `a8e4307fe47e9042472b9c3e2fdefc714fe738fe` |
| Complete-report branch commit | `16d9b6af7f8d3eb30fc1946f152608101ac1b5c2` |
| Implementation PR | [#2](https://github.com/Jacob0710/marchoutWebsite/pull/2) |
| PR #2 merge commit | `5ec57903537d81472e89f94308b89fa887f5620f` |
| Release-evidence branch | `codex/phase11-release-evidence` |
| Release-evidence commit | `2770807efd8c441ba24cda7e96e268beb4f82d37` |
| Release-evidence PR | [#11](https://github.com/Jacob0710/marchoutWebsite/pull/11) |
| Final `main` commit | `c3995e4b6dd02ef24c4b93cc6770dae662a09099` |
| Completion tag | `phase-11-automated-testing-ci-complete` |
| Annotated tag object | `1fa9f03e8031c0bbe84700bea87259cc204a37db` |
| Remote peeled tag target | `c3995e4b6dd02ef24c4b93cc6770dae662a09099` |

## 4. 實作內容

### 4.1 Toolchain

| 工具 | 版本／契約 |
| --- | --- |
| Node | `24.18.0`；project contract `>=24.0.0` |
| pnpm | `11.9.0` |
| Nuxt | `3.21.10` |
| Nitro | `2.13.4` |
| Vue | `3.5.40` |
| Vite | `7.3.6` |
| ESLint | `10.8.0` |
| Vitest | `4.1.10` |
| Tailwind Nuxt module | `6.14.0` |

### 4.2 Testing 與 lint

新增或完成：

- `eslint.config.mjs`
- `vitest.config.ts`
- `tests/unit/admin-access.spec.ts`
- `tests/unit/rules.spec.ts`
- `tests/unit/security-helpers.spec.ts`
- `tests/unit/validation.spec.ts`
- `tests/components/common-components.spec.ts`

測試範圍：

- activity／content slug 與 URL rules；
- CSV 與 file-size formatting；
- administrator invitation 與 audit parsing；
- activity 與 core-content validation；
- privacy derivative inspection；
- route-template redaction 與 path hashing；
- base button behavior；
- search labeling 與 model updates；
- category pressed／selection state；
- empty-state content。

### 4.3 Repository 與 supply-chain gate

新增或完成：

- `scripts/phase11/verify-repository.mjs`
- `.github/dependabot.yml`
- production dependency audit；
- GitHub Dependency Graph；
- pull-request Dependency Review；
- immutable GitHub Actions references；
- least-privilege workflow permissions。

Repository verifier 檢查：

- 必要 Phase 11 檔案存在；
- `.env*`、private cache、build output、coverage、`node_modules` 等禁止項目未被納入；
- pnpm 是唯一支援的 package manager；
- private key、GitHub token、payment live key、credential-bearing PostgreSQL URL 與 Supabase service-role JWT signature；
- workflow 不使用 `pull_request_target`；
- workflow 不使用 `write-all`；
- workflow 至少具有 `contents: read`；
- 外部 action 使用完整 immutable commit SHA；
- Node、pnpm、script 與 lockfile contract。

### 4.4 Built SSR integration

`scripts/phase11/local-ssr-smoke.mjs` 對實際 Nitro build 產物執行 11 項 loopback contract：

- `/api/health`
- `/api/health/ready`
- `/`
- `/about`
- `/activities`
- `/files`
- `/years`
- `/robots.txt`
- `/sitemap.xml`
- `/admin/login`
- intentional unknown route

驗證內容包含：

- HTTP status；
- mock-mode readiness；
- public／private cache behavior；
- security headers；
- request IDs；
- `zh-Hant` SSR markup；
- administrator login fields；
- true 404 behavior；
- non-public 404 caching；
- absence of sensitive signatures。

### 4.5 有限度的 source refactor

產品 source 變更只限於支援 lint、安全與 pure-rule 測試的最小調整，包括：

- `shared/operationalRules.ts`
- `components/admin/AdminPostForm.vue`
- `composables/useFormValidation.ts`
- `pages/admin/dashboard.vue`
- security middleware／plugin；
- sitemap route；
- content API；
- operational logging；
- Phase 10 static verifier。

沒有引入新的 Phase 11 產品行為或 production mutation。

## 5. Automated test 與 coverage 結果

### 5.1 測試結果

- Test files：5
- Tests：29 passed
- Failed：0

### 5.2 Curated measured-core coverage

| Metric | 結果 | Gate | 判定 |
| --- | ---: | ---: | --- |
| Statements | 92.61% | 90% | PASS |
| Branches | 89.72% | 85% | PASS |
| Functions | 100% | 90% | PASS |
| Lines | 96.66% | 90% | PASS |

Coverage 僅涵蓋 `vitest.config.ts` 所列的 pure domain／security modules，不代表整個 Nuxt application 的 coverage。

### 5.3 Quality commands

下列 gate 均通過：

- `pnpm install --frozen-lockfile`
- `pnpm run phase11:verify`
- `pnpm run lint`
- `pnpm run phase11:audit`
- `pnpm run test:coverage`
- `pnpm run test:phase10`
- `pnpm run typecheck`
- `pnpm run build`
- `pnpm run test:integration`
- `git diff --check`

Repository verifier 最終結果：

- Secret findings：0
- Forbidden tracked artifacts：0
- Workflow files：1
- Immutable external action references：8
- Test files：5

Production dependency audit：

- Low：0
- Moderate：0
- High：0
- Critical：0

## 6. CI/CD topology

Workflow：`.github/workflows/phase11-quality.yml`

### 6.1 Triggers

- `pull_request`
- push to `main`
- hourly schedule
- `workflow_dispatch`

### 6.2 Jobs

#### `quality`

在 PR、`main` push 與 manual dispatch 執行：

- frozen pnpm install；
- repository／secret verification；
- deterministic Phase 10 decision manifests；
- ESLint zero warnings；
- production dependency audit；
- curated coverage；
- Phase 10 regression；
- typecheck；
- production build；
- built SSR integration；
- whitespace check；
- seven-day coverage artifact。

#### `dependency-review`

- 僅在 pull request 執行。
- `fail-on-severity: high`。
- 不取得 production 或 administrator secrets。

#### `production-synthetic`

- 僅在 scheduled event 執行。
- 對 canonical production origin 執行 credential-free health、route、security header、cache、robots 與 sitemap contract。

#### `protected-release-gate`

- 僅在 `workflow_dispatch` 執行。
- 依賴 `quality` 成功。
- 使用 GitHub `staging` environment。
- 執行 authenticated Phase 10 read-only smoke。
- 執行 external-origin credential-free synthetic。

### 6.3 Secret isolation

- Workflow top-level permission：`contents: read`。
- Pull-request jobs 不使用 Supabase 或 administrator credentials。
- Environment secrets 只提供給明確宣告 `environment: staging` 的 protected job。
- 所有外部 GitHub Actions 均固定到 immutable 40-character SHA。

## 7. Pull request、review 與 merge

### 7.1 PR #2 — implementation

- URL：https://github.com/Jacob0710/marchoutWebsite/pull/2
- Final head：`16d9b6af7f8d3eb30fc1946f152608101ac1b5c2`
- Final PR CI：[run 30458773570](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30458773570)
- `quality`：SUCCESS
- `dependency-review`：SUCCESS
- Vercel Preview：SUCCESS
- Mergeability before merge：`CLEAN`／`MERGEABLE`
- Draft 狀態：在 final head 全綠後解除
- Review model：owner-accepted single-maintainer mode
- Independent reviewer：無
- Required approval count：0
- Merged at：`2026-07-29T14:03:01Z`
- Merge method：merge commit
- Merge commit：`5ec57903537d81472e89f94308b89fa887f5620f`

### 7.2 PR #11 — release evidence

- URL：https://github.com/Jacob0710/marchoutWebsite/pull/11
- Head：`2770807efd8c441ba24cda7e96e268beb4f82d37`
- PR CI：[run 30459599930](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30459599930)
- `quality`：SUCCESS
- `dependency-review`：SUCCESS
- Vercel Preview：SUCCESS
- Files changed：2
- 內容：完成報告與 execution status
- Merged at：`2026-07-29T14:13:04Z`
- Merge method：merge commit
- Final `main` commit：`c3995e4b6dd02ef24c4b93cc6770dae662a09099`

### 7.3 Owner acceptance

Owner `Jacob0710` 明確接受：

- 單人維護模式；
- 以 owner acceptance 取代獨立 reviewer；
- required approval count 為 0；
- 將完整報告納入 repository；
- 建立 `main` protection；
- 交接文件保持未追蹤；
- 本報告第 14 節列出的 residual risks。

## 8. 合併後 `main` CI

### 8.1 Implementation merge

- Run：[30458939796](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30458939796)
- Commit：`5ec57903537d81472e89f94308b89fa887f5620f`
- Event：push
- Result：SUCCESS

### 8.2 Final release-evidence merge

- Run：[30459776069](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30459776069)
- Commit：`c3995e4b6dd02ef24c4b93cc6770dae662a09099`
- Event：push
- Result：SUCCESS

最終 run 通過：

- frozen pnpm install；
- repository verification；
- manifest determinism；
- ESLint；
- production dependency audit；
- curated coverage；
- Phase 10 regression；
- typecheck；
- production build；
- built SSR integration；
- `git diff --check`；
- coverage artifact upload。

## 9. Vercel Production deployment

### 9.1 Implementation merge deployment

| 項目 | 值 |
| --- | --- |
| Deployment ID | `5658859954` |
| Commit | `5ec57903537d81472e89f94308b89fa887f5620f` |
| Status | Success／Ready |
| URL | `https://marchout-website-qy3swdg12-jacob0710s-projects.vercel.app` |

### 9.2 Final release-evidence deployment

| 項目 | 值 |
| --- | --- |
| Deployment ID | `5659020107` |
| Commit | `c3995e4b6dd02ef24c4b93cc6770dae662a09099` |
| Status | Success／Ready |
| URL | `https://marchout-website-fow1zrkdh-jacob0710s-projects.vercel.app` |
| Canonical origin | `https://marchout-website.vercel.app` |

PR Preview deployment 沒有被當成 Production deployment。最終 Production deployment、`main` 與 completion tag 對應同一 commit。

## 10. Production synthetic 與 authenticated read-only smoke

### 10.1 Final credential-free production synthetic

Checked at：`2026-07-29T14:14:46.323Z`
Origin：`https://marchout-website.vercel.app`
Timeout：10,000 ms
Maximum accepted latency：5,000 ms

| Endpoint | HTTP status | Duration |
| --- | ---: | ---: |
| `/api/health` | 200 | 1,368 ms |
| `/api/health/ready` | 200 | 2,330 ms |
| `/` | 200 | 3,388 ms |
| `/about` | 200 | 918 ms |
| `/activities` | 200 | 2,591 ms |
| `/files` | 200 | 1,496 ms |
| `/years` | 200 | 954 ms |
| `/robots.txt` | 200 | 381 ms |
| `/sitemap.xml` | 200 | 1,075 ms |

結果：

- 9/9 endpoints 通過。
- 最慢回應：`/`，3,388 ms。
- Active redirects：0。
- Dedicated redirect HTTP verification：不需要。
- Mutations：0。

### 10.2 Final protected workflow

- Run：[30459917571](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30459917571)
- Commit：`c3995e4b6dd02ef24c4b93cc6770dae662a09099`
- Overall result：SUCCESS
- `quality`：SUCCESS
- `protected-release-gate`：SUCCESS

Authenticated smoke：

- Identities：anonymous、non-admin、active admin
- Reviews：122
- Targets：70
- Redirects：83
- Coverage：health、RLS／grants、queue／detail、same-origin、draft／admin byte proxy、headers／cache、logout
- `remoteMutations`：0

Protected external synthetic：

| Endpoint | HTTP status | Duration |
| --- | ---: | ---: |
| `/api/health` | 200 | 228 ms |
| `/api/health/ready` | 200 | 352 ms |
| `/` | 200 | 1,788 ms |
| `/about` | 200 | 348 ms |
| `/activities` | 200 | 740 ms |
| `/files` | 200 | 816 ms |
| `/years` | 200 | 1,014 ms |
| `/robots.txt` | 200 | 65 ms |
| `/sitemap.xml` | 200 | 747 ms |

- 9/9 endpoints 通過。
- 最慢回應：`/`，1,788 ms。
- Mutations：0。

## 11. Security、privacy 與 supply-chain 判定

### 11.1 Security

- Secret scan：PASS，0 findings。
- Private／generated artifact scan：PASS，0 forbidden tracked artifacts。
- PR jobs 不取得 production credentials。
- `pull_request_target`：不存在。
- Workflow token：`contents: read`。
- GitHub Actions references：8 個，全部 immutable。
- Anonymous／non-admin／active-admin boundary：PASS。
- Same-origin mutation defense：PASS。
- Draft content 與 draft asset public disclosure defense：PASS。
- Admin byte proxy、cache 與 CORP contract：PASS。
- Security headers 與 technology disclosure contract：PASS。

### 11.2 Supply chain

- Frozen lockfile install：PASS。
- Production audit：0 known vulnerabilities。
- Dependency Graph：enabled。
- GitHub SBOM endpoint：available。
- Dependency Review：PASS。
- Dependabot：pnpm 與 GitHub Actions weekly maintenance 已設定。

初始 audit 曾發現 1 critical 與 8 high transitive advisories；相容修補版本已透過 pnpm overrides 固定，最終 audit、typecheck、tests、build 與 integration 均通過。

## 12. Phase 10 regression

Phase 11 沒有弱化 Phase 10 完成狀態：

| 項目 | 最終值 |
| --- | ---: |
| Imported draft targets | 70 |
| Reviews | 122 |
| Redirect records | 83 |
| Active redirects | 0 |
| Unauthorized `410` | 0 |
| Duplicate redirects | 0 |
| Secret hits | 0 |
| Banned tracked artifacts | 0 |

Phase 10 static、privacy 與 redirect regression 均通過。

## 13. Governance

### 13.1 `main` branch protection

已啟用並核驗：

- 必須透過 pull request。
- Required checks 使用 strict mode。
- Required checks：
  - `quality`
  - `dependency-review`
  - `Vercel`
- Branch 在合併前必須保持最新。
- 規則適用於 administrators。
- Required approving reviews：0。
- Conversations 必須 resolved。
- Force push：disabled。
- Branch deletion：disabled。

Required approval count 為 0 是 owner 明確接受的單人維護決策，不代表存在獨立第三方 review。

### 13.2 GitHub `staging` environment

- Environment variables：2。
- Environment secrets：5。
- 本報告不包含任何 value。
- Deployment branch policies：
  - `main`
  - `codex/phase11-*`
- Required reviewer：未設定。

Variable names：

- `PHASE10_BASE_URL`
- `NUXT_PUBLIC_SUPABASE_URL`

Secret names：

- `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- `PHASE10_ADMIN_EMAIL`
- `PHASE10_ADMIN_PASSWORD`
- `PHASE10_INACTIVE_ADMIN_EMAIL`
- `PHASE10_INACTIVE_ADMIN_PASSWORD`

## 14. Accepted residual risks

Owner 已於 2026-07-29（Asia/Taipei）接受下列 residual risks；不得因其不是 blocker 就從判讀中忽略：

1. Coverage 僅涵蓋選定的 pure domain／security modules，不是 whole-application coverage。
2. 沒有完整 browser E2E matrix。
3. Protected `staging` gate 實際測試 production origin，因為沒有獨立公開的 non-SSO staging hostname。
4. GitHub `staging` environment 沒有 required reviewer。
5. `main` 原先沒有 branch protection／ruleset。此項已透過 PR requirement、strict checks、administrator enforcement、resolved conversations 與禁止 force-push／deletion 大幅緩解；單人維護 required approval count 仍為 0。
6. Nuxt schema peer metadata warning 仍存在，但 frozen install、typecheck、tests 與 build 通過，未套用不安全的跨 major override。
7. `lucide-vue-next@0.468.0` 有 upstream deprecation，遷移至 `@lucide/vue` 不屬於 Phase 11。
8. Nitro trailing-slash export mapping deprecation warning 仍存在。
9. GitHub Actions 可能顯示 bundled runtime warning；目前 pinned actions 均成功執行。
10. Repository verifier 使用 `git ls-files --cached --others`，因此名為 tracked files 的集合也包含未追蹤 repository candidates。
11. `git diff --check` 只驗證 whitespace errors，不等同完整 clean-worktree assertion。

其他重要限制：

- Dependency Review 不是完整 SAST／DAST。
- Protected read-only smoke 不是完整 browser journey automation。
- Owner acceptance 不是獨立 reviewer assurance。

## 15. Completion tag

Tag：

`phase-11-automated-testing-ci-complete`

驗證結果：

| 項目 | 值 |
| --- | --- |
| Tag type | Annotated |
| Tag object | `1fa9f03e8031c0bbe84700bea87259cc204a37db` |
| Local peeled commit | `c3995e4b6dd02ef24c4b93cc6770dae662a09099` |
| Remote peeled commit | `c3995e4b6dd02ef24c4b93cc6770dae662a09099` |
| Final `origin/main` | `c3995e4b6dd02ef24c4b93cc6770dae662a09099` |
| Match | YES |

Tag 訊息包含：

- final `main` commit；
- implementation PR；
- release-evidence PR；
- final main CI；
- Vercel Production deployment；
- production URL；
- final protected read-only run；
- production mutations 0；
- owner acceptance 與 residual-risk report 位置。

## 16. Evidence traceability matrix

| 證據 | Commit | 結果 |
| --- | --- | --- |
| PR #2 final CI — run `30458773570` | `16d9b6a` | SUCCESS |
| PR #2 merge | `5ec5790` | MERGED |
| Initial post-merge main CI — run `30458939796` | `5ec5790` | SUCCESS |
| Initial Production deployment `5658859954` | `5ec5790` | READY |
| Initial protected run `30459102010` | `5ec5790` | SUCCESS / mutations 0 |
| PR #11 CI — run `30459599930` | `2770807` | SUCCESS |
| PR #11 merge／final main | `c3995e4` | MERGED |
| Final main CI — run `30459776069` | `c3995e4` | SUCCESS |
| Final Production deployment `5659020107` | `c3995e4` | READY |
| Final production synthetic | `c3995e4` deployment | PASS / mutations 0 |
| Final protected run `30459917571` | `c3995e4` | SUCCESS / remoteMutations 0 |
| Completion tag | `c3995e4` | VERIFIED |

## 17. Definition of Done

- [x] 完整報告已依 owner 決定納入 repository。
- [x] PR #2 已離開 Draft。
- [x] Owner acceptance 已記錄。
- [x] 最新 PR #2 CI 全部成功。
- [x] PR #2 已合併至 `main`。
- [x] 合併後 `main` CI 全部成功。
- [x] Phase 11 workflow 已存在於 `main`。
- [x] Vercel Production deployment Ready 且對應正確 commit。
- [x] Production credential-free synthetic 通過。
- [x] Protected authenticated read-only smoke 通過。
- [x] Production mutation 為 0。
- [x] `main` branch protection 已啟用。
- [x] Phase 11 completion tag 已建立並推送。
- [x] 遠端 tag 指向已驗證的最終 `main` commit。
- [x] Phase 11 execution status 已更新。
- [x] Phase 10／11 combined report 已更新。
- [x] 所有 residual risks 已記錄並由 owner 接受。
- [x] Repository、PR、CI、deployment 與 tag 證據可互相追溯。

## 18. Blockers

目前沒有會阻止 Phase 11 發布完成的 blocker。

以下不是 blocker，但應列入後續維護：

- browser E2E；
- 獨立 staging hostname；
- environment reviewer；
- upstream dependency／runtime warnings；
- 擴大測試與 coverage scope；
- 定期檢查 Dependabot PR 與 pinned action runtime。

## 19. 最終結論

Executive verdict：

`PASS WITH ACCEPTED RISKS`

理由：

- Phase 11 implementation 與所有定義的 quality gates 通過。
- PR #2 與發布證據 PR #11 均依保護規則合併。
- 最終 `main` CI 成功。
- Vercel Production deployment Ready 且 commit 正確。
- Credential-free synthetic 與 authenticated read-only smoke 均通過。
- 所有 mutation count 為 0。
- Completion tag 與最終 `main` commit 完全一致。
- `main` 已建立不可直接繞過的品質保護。
- Owner acceptance 與所有 residual risks 已明確記錄。

Phase 11 是否達到：

`MERGED / RELEASED COMPLETE`

答案：

**是。**

## 20. Source index

Repository documents：

- `codexSteps/phase11.md`
- `outputs/phase-11-execution-status.md`
- `outputs/phase-10-and-11-complete-report.md`
- `.github/workflows/phase11-quality.yml`
- `.github/dependabot.yml`
- `eslint.config.mjs`
- `vitest.config.ts`
- `scripts/phase11/verify-repository.mjs`
- `scripts/phase11/local-ssr-smoke.mjs`

Remote evidence：

- PR #2：https://github.com/Jacob0710/marchoutWebsite/pull/2
- PR #11：https://github.com/Jacob0710/marchoutWebsite/pull/11
- Final PR #2 CI：https://github.com/Jacob0710/marchoutWebsite/actions/runs/30458773570
- Initial post-merge main CI：https://github.com/Jacob0710/marchoutWebsite/actions/runs/30458939796
- Initial protected release gate：https://github.com/Jacob0710/marchoutWebsite/actions/runs/30459102010
- PR #11 CI：https://github.com/Jacob0710/marchoutWebsite/actions/runs/30459599930
- Final main CI：https://github.com/Jacob0710/marchoutWebsite/actions/runs/30459776069
- Final protected release gate：https://github.com/Jacob0710/marchoutWebsite/actions/runs/30459917571

## 建議交給 ChatGPT 的判讀提示

```text
請扮演資深軟體架構師、Release Engineer 與資安 reviewer，審查以下 Phase 11 完整報告。

請明確區分：
1. 報告中由 PR、commit、CI run、deployment 與 tag 支持的證據；
2. 只能視為作者聲明、尚未由獨立第三方重現的內容；
3. 已接受但值得後續改善的 residual risks；
4. 是否存在會推翻 MERGED / RELEASED COMPLETE 判定的 blocker；
5. 發布後 30 天內最重要的改善事項。

請依序輸出：
- Executive verdict：PASS / PASS WITH CONDITIONS / BLOCK
- Implementation 與測試判讀
- Coverage scope 判讀
- Security 與 supply-chain 判讀
- CI/CD 與 branch protection 判讀
- Production deployment 與 read-only 驗收判讀
- 證據矛盾或不足清單
- Residual-risk 優先級
- 最終是否接受 Phase 11 為 MERGED / RELEASED COMPLETE

不要只因報告宣稱 COMPLETE 就直接接受；請根據 commit、PR、run、deployment、tag、coverage、mutation 與治理證據獨立判斷。
```
