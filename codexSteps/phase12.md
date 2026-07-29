# March Out For Love — Phase 12 Codex 執行規格

文件日期：2026-07-29（Asia/Taipei）
Repository：`Jacob0710/marchoutWebsite`
Phase：Phase 12 — Browser E2E、Staging Governance 與 Release Hardening
文件定位：可直接交付 Codex 執行的獨立規格文件

---

## 0. 強制基準與執行前提

Phase 12 必須以以下唯一基準開始：

| 項目 | 值 |
| --- | --- |
| Baseline branch | `main` |
| Baseline commit | `c3995e4b6dd02ef24c4b93cc6770dae662a09099` |
| Baseline tag | `phase-11-automated-testing-ci-complete` |
| Phase 11 verdict | `PASS WITH ACCEPTED RISKS` |
| Phase 11 status | `MERGED / RELEASED COMPLETE` |

開始實作前必須驗證：

```bash
git fetch origin --prune --tags
git checkout main
git pull --ff-only origin main
git status --short
git rev-parse HEAD
git rev-parse origin/main
git rev-list -n 1 phase-11-automated-testing-ci-complete
```

以下三個 commit 值必須完全相同：

```text
HEAD
origin/main
phase-11-automated-testing-ci-complete peeled commit
```

預期值：

```text
c3995e4b6dd02ef24c4b93cc6770dae662a09099
```

若不一致：

1. 停止 Phase 12 實作。
2. 不得自行 reset、force push、移動 Phase 11 tag 或選擇其他基準。
3. 在 `outputs/phase-12-execution-status.md` 記錄實際值與阻塞原因。
4. 將狀態判定為 `BLOCKED — BASELINE MISMATCH`。

工作分支：

```text
codex/phase12-e2e-staging-release-hardening
```

---

## 1. Phase 12 背景

Phase 11 已完成自動化測試、curated coverage、built Nitro SSR integration、repository integrity verification、dependency audit、GitHub Actions、production synthetic、protected authenticated read-only smoke、branch protection、Vercel Production deployment 與 completion tag。

Phase 11 同時明確接受下列主要 residual risks：

1. Coverage 僅涵蓋選定的 pure domain／security modules，並非 whole-application coverage。
2. 尚無完整 browser E2E matrix。
3. `staging` protected gate 實際測試 production origin，沒有獨立公開的 non-SSO staging hostname。
4. GitHub `staging` environment 沒有 required reviewer。
5. 部分 Nuxt、Nitro、GitHub Actions 與 icon package warning 尚未治理。
6. Protected read-only smoke 不是完整 browser journey automation。
7. Owner acceptance 仍不等於獨立 reviewer assurance。

Phase 12 的任務不是重新實作 Phase 11，而是消除上述最重要的 release assurance 缺口，建立可重複的瀏覽器驗收、真正的 staging 隔離，以及更嚴格的發佈治理。

---

## 2. Phase 12 主軸

Phase 12 名稱：

```text
Browser E2E, Staging Governance and Release Hardening
```

主軸：

1. 建立 Playwright browser E2E 測試矩陣。
2. 建立獨立 staging deployment 與 canonical staging origin。
3. 將 authenticated release gate 從 production-origin 測試遷移至 staging-origin。
4. 為 GitHub `staging` environment 加入明確的人工作業邊界與審核機制。
5. 擴充 application-level coverage，但不得以虛假百分比包裝 whole-app coverage。
6. 治理 Phase 11 記錄的 dependency、runtime 與 deprecation warnings。
7. 建立 promotion-based release 流程：PR → staging → approval → production。
8. 保留 Phase 10 privacy、Phase 11 security、CI 與 production zero-mutation contract。

---

## 3. 目標

### 3.1 必須完成

- Playwright browser E2E framework 已整合。
- Public visitor、non-admin、active admin 三種身分的 browser journey 可重複執行。
- 獨立 staging hostname 可由 CI 與 reviewer 存取。
- Staging 使用與 production 分離的 deployment identity。
- Staging authenticated test 不得修改 production。
- GitHub protected environment 已配置至少一個 approval gate，或以 repository 可驗證的替代治理方式實作。
- PR 不得取得 staging／production administrator credentials。
- Staging E2E 必須在 deployment 完成後執行。
- Production 發布前必須先通過 staging E2E。
- Production 發布後仍執行 credential-free synthetic 與 read-only smoke。
- Phase 10／11 regression 全部保持通過。
- 所有測試均不得留下 staging 測試垃圾資料。
- 所有外部 GitHub Actions 仍固定 immutable SHA。
- 建立 Phase 12 完整報告、execution status、PR、CI、deployment 與 completion tag。

### 3.2 改善目標

- 增加 application integration coverage。
- 將 component／composable／server utility 測試範圍擴大。
- 清理可安全處理的 Nuxt／Nitro／runtime warning。
- 評估並處理 `lucide-vue-next` upstream deprecation。
- 強化 workflow provenance 與 artifact traceability。
- 為失敗 E2E 自動保存 screenshot、trace、video 或 HTML report。

---

## 4. 非目標

除非為了測試隔離而必要，Phase 12 不得：

- 新增一般使用者產品功能。
- 重新設計前台 UI。
- 重新設計後台 UI。
- 大規模改寫 Nuxt 架構。
- 更換 Supabase。
- 更換 Vercel。
- 導入付費第三方 E2E 平台。
- 在 production 建立、編輯、刪除活動。
- 啟用 Phase 10 尚未啟用的 52 條 redirect。
- 發布 70 筆尚待審核草稿。
- 將 staging credentials 暴露給 pull request。
- 將 E2E 測試帳號或密碼寫入 repository。
- 為追求 coverage 百分比而測試無價值程式碼。
- 使用不受控的 `latest` action reference。
- 移動或重建 Phase 11 completion tag。

---

## 5. Phase 12 Definition of Ready

Codex 開始主要實作前，必須完成並記錄：

- [ ] `main`、`origin/main`、Phase 11 tag 指向相同 commit。
- [ ] 工作樹乾淨。
- [ ] Node 與 pnpm 符合 repository contract。
- [ ] Frozen install 通過。
- [ ] Phase 11 全部基準 gate 通過。
- [ ] 已確認 Vercel staging deployment 方案。
- [ ] 已確認 staging Supabase project 或 staging schema isolation 方案。
- [ ] 已確認 E2E 測試身分來源。
- [ ] 已確認 staging hostname 不會指向 production origin。
- [ ] 已建立 `outputs/phase-12-execution-status.md`。

基準驗證命令：

```bash
pnpm install --frozen-lockfile
pnpm run phase11:verify
pnpm run lint
pnpm run phase11:audit
pnpm run test:coverage
pnpm run test:phase10
pnpm run typecheck
pnpm run build
pnpm run test:integration
git diff --check
```

任一基準 gate 失敗，必須先判定是：

```text
BASELINE FAILURE
```

不得將既有失敗包裝成 Phase 12 引入的問題。

---

## 6. 架構決策

## 6.1 Browser E2E 工具

優先使用：

```text
Playwright Test
```

原因：

- 支援 Chromium、Firefox、WebKit。
- 支援 trace、screenshot、video、HTML report。
- 適合 Nuxt SSR、navigation、form、cookie、下載與 browser-level security contract。
- 可在 GitHub Actions 以 deterministic runner 執行。
- 可透過 storage state 管理測試身分，但不得將 storage state commit 至 repository。

禁止：

- Cypress 與 Playwright 同時導入。
- 將 Selenium 作為主要 Phase 12 framework。
- 將 production browser 寫入測試作為主要驗收方式。

## 6.2 Staging 隔離模型

首選模型：

```text
獨立 Vercel staging deployment
+
獨立 Supabase staging project
+
獨立 staging administrator identities
```

最低可接受模型：

```text
獨立 Vercel staging deployment
+
與 production 明確隔離的 Supabase staging schema／dataset
+
完整的測試資料 namespace 與 cleanup
```

不可接受：

```text
staging hostname 實際指向 production deployment
```

不可接受：

```text
以 production service role、production admin 或 production database 執行 browser mutation E2E
```

## 6.3 測試資料策略

所有可變 E2E 資料必須：

- 使用唯一前綴，例如 `e2e-phase12-<run-id>`。
- 在測試完成後清理。
- 在 beforeAll／afterAll 失敗時仍具備 cleanup fallback。
- 不依賴 production 既有內容的可變狀態。
- 不刪除非本次 run 建立的資料。
- 不覆寫正式活動、正式附件或正式管理員。
- 可由 deterministic seed script 重建。

建議新增：

```text
scripts/phase12/seed-e2e-fixtures.mjs
scripts/phase12/cleanup-e2e-fixtures.mjs
scripts/phase12/verify-staging-origin.mjs
```

---

## 7. 預期檔案與目錄

Codex 可依現有 repository 慣例調整，但應優先建立：

```text
playwright.config.ts
tests/e2e/
  public-navigation.spec.ts
  public-activities.spec.ts
  public-files.spec.ts
  auth-boundaries.spec.ts
  admin-login.spec.ts
  admin-activity-readonly.spec.ts
  admin-activity-crud.spec.ts
  admin-assets.spec.ts
  security-browser-contract.spec.ts
  accessibility-smoke.spec.ts
  fixtures/
    auth.ts
    test-data.ts
    selectors.ts
  helpers/
    cleanup.ts
    request.ts
    assertions.ts

scripts/phase12/
  seed-e2e-fixtures.mjs
  cleanup-e2e-fixtures.mjs
  verify-staging-origin.mjs
  verify-phase12-repository.mjs
  staging-browser-smoke.mjs
  production-post-release-smoke.mjs

.github/workflows/
  phase12-quality.yml
  phase12-staging-e2e.yml
  phase12-production-release.yml

outputs/
  phase-12-execution-status.md
  phase-12-complete-report.md

codexSteps/
  phase12.md
```

若選擇擴充既有 `.github/workflows/phase11-quality.yml`，必須避免：

- 產生難以判讀的單一巨型 workflow。
- 讓 PR quality job取得 environment secrets。
- 讓 staging deployment 與 production release 無法獨立追蹤。

建議以職責分離的 workflow 實作。

---

## 8. Browser E2E 測試矩陣

## 8.1 Browser project

最低要求：

| Project | 用途 | PR | Staging | Production |
| --- | --- | ---: | ---: | ---: |
| Chromium desktop | 主要阻擋 gate | 必須 | 必須 | read-only |
| WebKit desktop | Safari 相容 smoke | 可選 PR、必須 staging | 必須 | 不要求 |
| Firefox desktop | Cross-browser smoke | 可選 PR、必須 staging | 必須 | 不要求 |
| Mobile Chromium | Responsive smoke | 可選 | 必須 | 不要求 |

若 CI 時間過長：

- PR 僅執行 Chromium critical path。
- Staging 執行完整 cross-browser matrix。
- Production 僅執行 read-only Chromium synthetic。

不得完全取消 cross-browser staging 驗收。

## 8.2 Public visitor journey

至少驗證：

- 首頁可載入。
- 導覽列主要連結可操作。
- `/about` 可載入。
- `/activities` 可載入。
- 活動卡片可進入詳細頁。
- draft 或不存在 slug 回傳正確 404。
- `/files` 可載入。
- `/years` 可載入。
- robots 與 sitemap 可存取。
- 頁面語言標記為 `zh-Hant`。
- 主要頁面沒有 console error。
- hydration 沒有 warning。
- 公開頁不洩漏 admin-only UI。
- 公開頁不洩漏 draft content。
- 公開頁不洩漏 private storage direct URL。
- security headers 與 cache contract 符合 Phase 11。

## 8.3 Anonymous auth boundary

至少驗證：

- 直接進入 admin route 時被導向登入。
- login form 欄位完整。
- 錯誤 credential 顯示安全且不洩漏帳號存在性。
- anonymous 無法存取 admin data API。
- anonymous 無法取得 draft assets。
- anonymous 無法呼叫 mutation endpoint。
- logout endpoint 不產生異常 session。

## 8.4 Non-admin journey

至少驗證：

- 有效登入但不是 admin。
- non-admin 不能進入 admin dashboard。
- non-admin 不能讀取 admin-only activity list。
- non-admin 不能建立、修改、刪除或發布內容。
- non-admin 不取得 private attachment bytes。
- non-admin logout 後 session 正確失效。
- browser back 不得恢復可用的 admin session state。

## 8.5 Active admin read-only journey

至少驗證：

- admin 可登入。
- dashboard 可載入。
- activity list 可載入。
- draft 與 published 狀態可辨識。
- admin 可查看既有活動資料。
- private image／attachment 經合法 proxy 載入。
- logout 後回到 anonymous 狀態。
- session cookie 具備預期安全屬性。
- admin route 不被 public cache。

## 8.6 Active admin CRUD journey

只允許在 staging 執行。

至少驗證：

1. 建立 draft 活動。
2. 輸入名稱、日期、地點、參與人數、成果。
3. 上傳測試圖片。
4. 上傳測試附件。
5. 設定封面與排序。
6. 加入外部影片連結。
7. 儲存 draft。
8. 從 admin list 找到該活動。
9. 編輯內容。
10. 發布。
11. 從 public route 可看到。
12. 撤回。
13. public route 不再公開。
14. 刪除或 cleanup fixture。
15. 驗證 Storage fixture 已清理。

每次測試應記錄：

```text
created fixture ids
created storage paths
cleanup result
remaining fixture count
remote mutation target
```

Production mutation 必須永遠為：

```text
0
```

## 8.7 Security browser contract

至少驗證：

- Same-origin enforcement。
- CSRF／origin mismatch 被拒絕。
- HttpOnly session cookie 不可由 client JavaScript 讀取。
- Secure 與 SameSite contract 符合部署環境。
- Admin HTML 不被 shared cache。
- Draft asset 不可匿名存取。
- CORP、CSP 或既有 security header contract 不退化。
- 錯誤頁不洩漏 stack、secret、database URL 或 internal path。
- request ID 存在且格式合理。
- 未知路由為 true 404。
- 登入錯誤訊息不洩漏 credential 判斷細節。

## 8.8 Accessibility smoke

至少驗證：

- 關鍵頁面沒有重大 accessibility violation。
- 表單欄位具備 label。
- 按鈕具有 accessible name。
- keyboard 可完成登入。
- keyboard 可使用主要導覽。
- dialog／menu focus 不遺失。
- 圖片 alt contract。
- 主要頁只有合理的 heading hierarchy。

可使用 Playwright + accessibility scanner，但需：

- 固定相容版本。
- 不將所有 warning 直接忽略。
- 明確列出 blocker severity。

---

## 9. Selector 與測試穩定性規範

優先順序：

1. Accessible role + name。
2. Label。
3. Stable test id。
4. Stable semantic text。
5. CSS selector 最後使用。

必要時可加入：

```html
data-testid="..."
```

但不得：

- 在 UI 到處加入沒有語意的 test id。
- 依賴 Tailwind class。
- 依賴 DOM child index。
- 依賴隨機延遲。
- 使用固定 `sleep` 取代等待條件。
- 依賴 production 內容排序不變。

重試策略：

- Local：0 retry。
- PR：最多 1 retry。
- Staging：最多 1 retry。
- Flaky test 即使 retry 後通過，也必須在報告中標記。
- 不得將 retry 當成永久解法。

---

## 10. Playwright 設定要求

`playwright.config.ts` 至少包含：

- `baseURL` 由環境變數提供。
- `trace: 'retain-on-failure'` 或更嚴格。
- failure screenshot。
- failure video 或必要時保留。
- HTML reporter。
- CI 上合理 timeout。
- 禁止無限 timeout。
- projects 明確命名。
- artifacts 不 commit。
- storage state 路徑加入 `.gitignore`。
- webServer 只用於 local built app，不用於 remote staging。
- local 與 remote configuration 分離。

建議 scripts：

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:chromium": "playwright test --project=chromium",
    "test:e2e:staging": "playwright test",
    "test:e2e:report": "playwright show-report",
    "phase12:verify": "node scripts/phase12/verify-phase12-repository.mjs",
    "phase12:verify-staging": "node scripts/phase12/verify-staging-origin.mjs",
    "phase12:seed": "node scripts/phase12/seed-e2e-fixtures.mjs",
    "phase12:cleanup": "node scripts/phase12/cleanup-e2e-fixtures.mjs"
  }
}
```

實際命名可調整，但功能不可缺少。

---

## 11. Staging deployment 規格

## 11.1 Canonical staging origin

必須定義：

```text
PHASE12_STAGING_BASE_URL
```

要求：

- 與 production canonical origin 不同。
- 不得 redirect 到 production。
- `/api/health` 必須回報可辨識 staging 的非敏感 environment identity。
- 不得在 HTML、headers 或 JSON 洩漏 secrets。
- CI 必須檢查 hostname、redirect chain 與 environment marker。

建議 health response 增加非敏感欄位：

```json
{
  "environment": "staging"
}
```

Production 應回傳：

```json
{
  "environment": "production"
}
```

若不適合修改 health schema，可使用：

```text
X-App-Environment: staging
```

但應避免暴露內部基礎設施細節。

## 11.2 Staging 資料庫與 Storage

必須確認：

- staging database project reference 不等於 production。
- staging Storage bucket 或 project 不等於 production。
- staging admin user 不等於 production admin。
- staging anon key 不等於 production anon key。
- staging service role 僅供受保護的 seed／cleanup job 使用，且不得提供給 browser process。
- browser E2E 只使用正常 application interface，不直接使用 service role 操作產品流程。

## 11.3 Staging deployment source

建議：

- `main` 對應 production。
- PR 對應 preview。
- 明確 staging branch 或 promotion workflow 對應 staging。

可接受方案：

```text
release/staging
```

或：

```text
workflow_dispatch 建立固定 staging deployment
```

不得讓任意 fork PR 自動取得 staging credentials。

---

## 12. GitHub Environment Governance

## 12.1 `staging` environment

Phase 12 必須優先配置：

- required reviewer 至少 1 位；若 GitHub plan 不支援，必須採用替代控制。
- deployment branch policy。
- secrets 與 variables 最小化。
- environment URL。
- 所有 secret names 有文件，但 value 不得進報告。
- staging 與 production secret 完全分離。

若 required reviewer 技術上不可用，替代控制必須至少包含：

1. `workflow_dispatch`。
2. 明確輸入 release commit SHA。
3. 驗證 SHA 屬於 protected `main`。
4. 驗證 required checks 成功。
5. 驗證 staging deployment commit 相同。
6. owner 在 GitHub issue／PR comment／release checklist 留下可追溯 approval。
7. workflow 驗證 approval artifact 或 GitHub API 狀態。

不得僅以 README 文字宣稱已審核。

## 12.2 Production environment

若尚未建立，建議新增：

```text
production
```

Production environment 應：

- 僅允許 `main`。
- 要求 staging E2E 成功。
- 要求 release commit 與 staging commit 相同。
- 限制 production secrets。
- 保留 deployment traceability。
- 不允許 fork PR 執行。

---

## 13. CI/CD 拓撲

## 13.1 PR quality workflow

PR job 不取得任何 staging／production secrets。

必須執行：

- frozen install。
- Phase 11 repository verify。
- Phase 12 repository verify。
- lint。
- production dependency audit。
- unit／component coverage。
- Phase 10 regression。
- typecheck。
- production build。
- built SSR integration。
- local Chromium E2E critical path。
- whitespace check。
- dependency review。
- artifact upload。

PR browser test 使用：

```text
local built application
+
mock／local deterministic data
```

不得對 production 執行登入。

## 13.2 Staging deployment workflow

觸發方式：

- merge to staging branch，或
- manual promotion，或
- protected workflow after main commit。

流程：

1. 驗證 commit。
2. frozen install。
3. quality gates。
4. 部署 staging。
5. 驗證 staging origin。
6. seed E2E fixtures。
7. Chromium full journey。
8. Firefox smoke。
9. WebKit smoke。
10. Mobile responsive smoke。
11. accessibility smoke。
12. cleanup。
13. 再次驗證 fixture count 為 0。
14. 上傳 trace／report。
15. 產出 machine-readable result。

## 13.3 Production release workflow

Production release 必須依賴：

- staging deployment success。
- staging full E2E success。
- cleanup success。
- approval gate success。
- release commit SHA match。
- required checks success。

Production 部署後只允許：

- credential-free synthetic。
- authenticated read-only smoke。
- no mutation browser smoke。
- cache／headers／robots／sitemap／health 驗證。

任何 production write 測試：

```text
禁止
```

## 13.4 Schedule

建議：

- 每日 staging synthetic。
- 每週完整 staging browser matrix。
- 每小時 production credential-free synthetic 可延續 Phase 11。
- Dependabot 每週。
- production authenticated read-only smoke 可每日或 release-triggered。

避免因過度頻繁登入造成 auth rate limit。

---

## 14. Workflow 安全要求

所有 workflow 必須：

- top-level `contents: read`。
- job-specific permission 最小化。
- 不使用 `pull_request_target`。
- 不使用 `write-all`。
- 外部 action 使用完整 40-character SHA。
- shell script 使用嚴格錯誤處理。
- secret 不輸出到 log。
- URL 中不得包含 credential。
- artifacts 不包含 storage state、cookie、token、HAR credential 或 secret-bearing trace。
- 上傳 trace 前執行 secret inspection。
- fork PR 不取得 environment secrets。
- staging service role 只存在於 seed／cleanup job。
- browser test job不得直接取得 service role。
- production job不得取得 staging admin credential。
- staging job不得取得 production admin credential。

新增 verifier 應檢查：

- Playwright auth state 未 tracked。
- trace／video／report 未 tracked。
- `.env.e2e` 未 tracked。
- workflow secret scope。
- environment job declaration。
- immutable action reference。
- staging／production base URL 變數命名。
- 禁止 production mutation script。

---

## 15. Coverage 擴充

## 15.1 原則

Phase 11 curated coverage 必須保留，不得降低 threshold。

Phase 12 可新增第二組 coverage：

```text
application integration coverage
```

必須明確區分：

- curated measured-core coverage。
- component／composable coverage。
- server utility coverage。
- browser E2E coverage（journey count，不以程式碼百分比表示）。
- whole-application coverage：若未真正量測，不得宣稱。

## 15.2 建議擴充範圍

優先測試：

- authentication composables。
- admin route middleware。
- activity form validation。
- activity mapper。
- public query mapping。
- asset proxy authorization utility。
- cache-control helper。
- security header helper。
- sitemap filtering。
- error mapping。
- session parsing。
- same-origin validation。
- admin authorization branch。
- publish／unpublish state rules。

## 15.3 Threshold

原有 curated gate：

| Metric | 最低值 |
| --- | ---: |
| Statements | 90% |
| Branches | 85% |
| Functions | 90% |
| Lines | 90% |

Phase 12 新增 scope 不應直接套用虛假的高 threshold。建議初始：

| Scope | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Application integration | 75% | 65% | 75% | 75% |

若實際基準低於此值：

1. 不得降低到毫無意義。
2. 先產出 baseline。
3. 以「不得退化」加上合理最低門檻。
4. 在完成報告中說明未涵蓋模組。

禁止：

- 排除困難檔案只為提高百分比。
- 測試 generated output。
- 使用大量 snapshot 取代行為 assertions。
- 將 E2E 通過數量轉換成程式碼 coverage。

---

## 16. Runtime 與 dependency warning 治理

Phase 11 已知 warning：

1. Nuxt schema peer metadata warning。
2. `lucide-vue-next@0.468.0` upstream deprecation。
3. Nitro trailing-slash export mapping deprecation warning。
4. GitHub Actions bundled runtime warning。
5. 可疑但非 blocker 的 package peer metadata。

Phase 12 必須逐項分類：

```text
FIXED
DEFERRED WITH OWNER ACCEPTANCE
UPSTREAM BLOCKED
NOT REPRODUCIBLE
```

每項需記錄：

- 重現命令。
- 原始 warning。
- 影響範圍。
- 可用修正。
- 相容性風險。
- 實際決策。
- 驗證結果。

## 16.1 `lucide-vue-next`

必須評估遷移至官方建議 package。

要求：

- 先建立 import inventory。
- 不得盲目全域 replace。
- 驗證 tree-shaking。
- 驗證 SSR。
- 驗證 icon visual presence。
- 驗證 bundle 未異常增加。
- typecheck、build、browser smoke 全通過。

若遷移會造成大範圍破壞，可 deferred，但完成報告要有具體 blocking evidence。

## 16.2 Nitro trailing slash warning

必須：

- 找出實際 config。
- 依目前 Nitro contract 修正。
- 驗證 sitemap、robots、static export 與 SSR route。
- 不得以 suppress warning 作為唯一修正。

## 16.3 GitHub Actions runtime warning

必須：

- 確認 pinned action 是否有支援新版 runtime 的 immutable release。
- 若有，更新 SHA。
- 若無，記錄 upstream issue／release 狀態。
- 更新後必須重新通過 PR 與 main CI。
- 不得改回 floating tag。

---

## 17. Security 與 privacy regression

Phase 12 必須保持以下 Phase 10／11 contract：

| 項目 | 預期 |
| --- | ---: |
| Imported draft targets | 70 |
| Reviews | 122 |
| Redirect records | 83 |
| Active redirects | 0 |
| Unauthorized `410` | 0 |
| Duplicate redirects | 0 |
| Secret hits | 0 |
| Forbidden tracked artifacts | 0 |
| Production mutations | 0 |

此外必須新增：

- E2E fixture residual count = 0。
- Tracked Playwright auth states = 0。
- Secret-bearing trace findings = 0。
- Staging origin mismatch = 0。
- Production-origin mutation attempts = 0。
- Cross-environment credential reuse = 0。

---

## 18. 可觀測性與 artifacts

E2E failure artifacts：

- Playwright HTML report。
- trace。
- screenshot。
- 必要時 video。
- test result JSON。
- staging deployment URL。
- tested commit SHA。
- fixture cleanup report。

Artifact retention：

- PR：7 天。
- Staging release candidate：14 天。
- Production release evidence：30 天或依 GitHub plan 可行上限。

上傳前必須掃描：

- cookies。
- bearer tokens。
- JWT。
- API keys。
- email/password。
- private storage signed URL。
- Supabase service-role signature。
- database URL。
- GitHub token。

若 artifact 含 secret：

1. 不上傳。
2. workflow fail。
3. 清理 runner。
4. 旋轉受影響 credential。
5. 在報告中記錄 incident，不得隱瞞。

---

## 19. Local developer workflow

Codex 必須提供可重複 local 指令：

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps
pnpm run phase12:verify
pnpm run lint
pnpm run test:coverage
pnpm run test:phase10
pnpm run typecheck
pnpm run build
pnpm run test:integration
pnpm run test:e2e:chromium
git diff --check
```

Local E2E 必須能使用：

- mock mode，或
- local Supabase，或
- 明確隔離的 staging。

不得要求開發者輸入 production credentials 才能完成基本 PR gate。

---

## 20. 執行順序

Codex 必須依序執行，不得先改 production workflow 再補測試。

### Step 1 — Baseline verification

- 驗證 commit、tag、branch。
- 執行 Phase 11 gates。
- 建立 execution status。

### Step 2 — Architecture discovery

- 檢查現有 auth、RLS、storage、API、deployment、workflow。
- 建立 staging isolation decision。
- 建立 E2E identity model。
- 列出需修改檔案。

### Step 3 — Playwright foundation

- 安裝相容套件。
- 建立 config。
- 建立 fixtures、helpers、reporting。
- 更新 `.gitignore`。
- 建立 repository verifier。

### Step 4 — Local browser critical path

- public。
- anonymous boundary。
- login page。
- true 404。
- headers／cache。
- console／hydration。

### Step 5 — Staging infrastructure

- 建立 staging deployment。
- 設定 staging environment variables／secrets。
- 驗證 Supabase isolation。
- 建立 seed／cleanup。

### Step 6 — Authenticated staging E2E

- non-admin。
- active admin read-only。
- active admin CRUD。
- asset upload／proxy。
- publish／unpublish。
- cleanup。

### Step 7 — Cross-browser 與 accessibility

- Firefox。
- WebKit。
- mobile。
- accessibility smoke。

### Step 8 — CI/CD promotion flow

- PR quality。
- staging deployment。
- staging E2E。
- approval。
- production release。
- production post-release read-only smoke。

### Step 9 — Coverage expansion

- 擴充 component／composable／server utility 測試。
- 建立獨立 coverage table。
- 保持 Phase 11 curated gate。

### Step 10 — Warning governance

- Nuxt。
- Nitro。
- icon package。
- GitHub Actions runtime。
- 記錄 deferred 項目。

### Step 11 — Full validation

- local clean runner。
- PR CI。
- staging deployment。
- staging E2E。
- production release candidate verification。
- production read-only smoke。
- zero mutation。
- artifact secret scan。

### Step 12 — Merge、release 與 tag

- PR final head 全綠。
- owner／reviewer acceptance。
- merge to `main`。
- final main CI。
- production deployment。
- post-release smoke。
- completion report。
- annotated tag。
- remote tag verification。

---

## 21. 驗收命令

最終至少執行：

```bash
pnpm install --frozen-lockfile
pnpm run phase11:verify
pnpm run phase12:verify
pnpm run lint
pnpm run phase11:audit
pnpm run test:coverage
pnpm run test:phase10
pnpm run typecheck
pnpm run build
pnpm run test:integration
pnpm run test:e2e:chromium
pnpm run test:e2e:staging
git diff --check
git status --short
```

若 scripts 命名不同，完整報告須列出實際命令與對應功能。

---

## 22. 最低測試結果要求

### 22.1 Unit／component／integration

- 0 failed tests。
- Curated coverage 不低於 Phase 11。
- 新增 application integration coverage 不低於核准 threshold。
- Phase 10 regression 全通過。
- Built SSR integration 全通過。

### 22.2 Browser E2E

最低：

- Chromium critical PR suite：100% pass。
- Staging Chromium full suite：100% pass。
- Firefox staging smoke：100% pass。
- WebKit staging smoke：100% pass。
- Mobile smoke：100% pass。
- Accessibility blocker：0。
- Console error：0。
- Hydration warning：0。
- Cleanup residual：0。
- Production mutation：0。

Flaky test：

```text
0 unresolved
```

若有 retry-pass：

- 必須列出。
- 必須提供 root cause。
- 不得在 Definition of Done 中標記完全通過，除非已修正。

---

## 23. Definition of Done

### 23.1 Repository

- [ ] Phase 12 從正確 Phase 11 commit 開始。
- [ ] 工作樹無意外檔案。
- [ ] Playwright auth／trace／video／report 未 tracked。
- [ ] Secret scan 0 findings。
- [ ] Forbidden artifacts 0。
- [ ] pnpm 仍是唯一 package manager。
- [ ] 外部 actions 全部 immutable SHA。

### 23.2 Browser E2E

- [ ] Playwright 已整合。
- [ ] Chromium PR critical path 通過。
- [ ] Staging full browser journey 通過。
- [ ] Firefox smoke 通過。
- [ ] WebKit smoke 通過。
- [ ] Mobile smoke 通過。
- [ ] Accessibility blocker 0。
- [ ] Console error 0。
- [ ] Hydration warning 0。
- [ ] Flaky test 0 unresolved。

### 23.3 Staging

- [ ] Canonical staging origin 與 production 不同。
- [ ] Staging 不 redirect 到 production。
- [ ] Staging Supabase／data isolation 已驗證。
- [ ] Staging admin 與 production admin 分離。
- [ ] Seed 可重複。
- [ ] Cleanup 可重複。
- [ ] Fixture residual count 0。
- [ ] Staging deployment commit 可追溯。

### 23.4 Governance

- [ ] Staging environment approval gate 已建立，或替代控制已可驗證。
- [ ] Production release 依賴 staging E2E。
- [ ] Release commit SHA match。
- [ ] PR jobs 不取得 environment credentials。
- [ ] Production job不取得 staging mutation credentials。
- [ ] Branch protection 保持有效。
- [ ] Required checks 已更新。

### 23.5 Security／privacy

- [ ] Anonymous boundary 通過。
- [ ] Non-admin boundary 通過。
- [ ] Active-admin boundary 通過。
- [ ] Same-origin defense 通過。
- [ ] Draft content／asset protection 通過。
- [ ] Session cookie contract 通過。
- [ ] Artifact secret scan 通過。
- [ ] Production mutation 0。
- [ ] Phase 10 privacy／redirect regression 通過。

### 23.6 Quality

- [ ] Frozen install 通過。
- [ ] Lint zero warning。
- [ ] Production dependency audit 無 high／critical。
- [ ] Curated coverage threshold 通過。
- [ ] Application integration coverage threshold 通過。
- [ ] Typecheck 通過。
- [ ] Production build 通過。
- [ ] Built SSR integration 通過。
- [ ] `git diff --check` 通過。

### 23.7 Release

- [ ] Phase 12 PR final head 全綠。
- [ ] Reviewer／owner acceptance 已記錄。
- [ ] PR 已合併至 `main`。
- [ ] Final `main` CI 成功。
- [ ] Staging deployment 與 E2E 成功。
- [ ] Production deployment Ready。
- [ ] Production post-release read-only smoke 成功。
- [ ] Phase 12 complete report 已提交。
- [ ] Execution status 已更新。
- [ ] Completion tag 已建立並推送。
- [ ] Remote tag 指向 final `main` commit。
- [ ] Evidence traceability matrix 完整。

---

## 24. 產出物

必須產出：

```text
codexSteps/phase12.md
outputs/phase-12-execution-status.md
outputs/phase-12-complete-report.md
playwright.config.ts
tests/e2e/**
scripts/phase12/**
.github/workflows/phase12-*.yml
```

必要時更新：

```text
package.json
pnpm-lock.yaml
.gitignore
README.md
eslint.config.mjs
vitest.config.ts
.github/dependabot.yml
.github/workflows/phase11-quality.yml
```

不得將以下內容納入：

```text
.env*
playwright/.auth/**
playwright-report/**
test-results/**
coverage/**
node_modules/**
.output/**
.nuxt/**
cookies
credentials
private keys
signed URLs
service-role material
```

---

## 25. Execution status 文件格式

`outputs/phase-12-execution-status.md` 至少包含：

```markdown
# Phase 12 Execution Status

## Baseline
- branch:
- HEAD:
- origin/main:
- phase-11 tag target:
- clean worktree:

## Current State
- status:
- current commit:
- current branch:
- blockers:

## Completed
- ...

## In Progress
- ...

## Pending
- ...

## Validation
| Gate | Result | Evidence |
| --- | --- | --- |

## Staging
- origin:
- deployment id:
- commit:
- data isolation:
- fixture residual:

## Browser E2E
| Project | Passed | Failed | Flaky |
| --- | ---: | ---: | ---: |

## Security
- secret findings:
- forbidden artifacts:
- production mutations:
- artifact scan:

## Risks
- ...

## Next Action
- ...
```

必須隨實作滾動更新，不得只在最後補寫。

---

## 26. Complete report 要求

`outputs/phase-12-complete-report.md` 必須包含：

1. 文件定位與證據邊界。
2. Executive summary。
3. Baseline identity。
4. 實作內容。
5. Playwright 架構。
6. Browser matrix。
7. Staging architecture。
8. Environment governance。
9. CI/CD topology。
10. Coverage 結果。
11. Warning governance。
12. Security／privacy。
13. PR 與 review。
14. Staging deployment。
15. Staging E2E 結果。
16. Production deployment。
17. Production read-only smoke。
18. Zero-mutation evidence。
19. Accepted residual risks。
20. Completion tag。
21. Evidence traceability matrix。
22. Definition of Done。
23. Blockers。
24. 最終 verdict。

不得只寫：

```text
tests passed
```

必須包含具體：

- commit。
- PR。
- CI run。
- deployment id。
- origin。
- test counts。
- browser projects。
- coverage。
- fixture counts。
- mutation counts。
- tag target。
- governance 設定。

---

## 27. Git、PR 與 tag 流程

### 27.1 Branch

```bash
git checkout -b codex/phase12-e2e-staging-release-hardening
```

### 27.2 Commit 建議

建議拆分：

```text
test: add Playwright browser E2E foundation
test: add authenticated staging journeys
ci: add staging E2E and release promotion gates
test: expand application integration coverage
chore: resolve runtime and dependency warnings
docs: add Phase 12 execution evidence
```

不得把所有變更壓成一個難以 review 的 commit，除非 repository 規模與實際修改極小。

### 27.3 Pull request

PR 標題建議：

```text
Phase 12: add browser E2E, staging governance and release hardening
```

PR 描述必須包含：

- baseline。
- scope。
- non-goals。
- local commands。
- CI topology。
- staging isolation。
- browser matrix。
- coverage scope。
- security boundary。
- zero production mutation。
- known residual risks。
- rollback plan。

PR 在以下條件前保持 Draft：

- local gates 未完整通過。
- staging 尚未建立。
- authenticated E2E 未通過。
- cleanup residual 不為 0。
- complete report 尚未完成。
- final CI 尚未全綠。

### 27.4 Merge

只允許：

- protected PR merge。
- required checks 全綠。
- branch up to date。
- conversations resolved。
- approval gate 滿足。
- staging E2E 通過。
- artifact scan 通過。
- fixture residual 0。

禁止：

- direct push to `main`。
- force push。
- bypass checks。
- admin override。
- merge failed E2E。

### 27.5 Completion tag

建議：

```text
phase-12-e2e-staging-release-hardening-complete
```

Tag 必須為 annotated tag，訊息包含：

- final main commit。
- PR。
- final main CI。
- staging deployment。
- staging E2E run。
- production deployment。
- post-release smoke。
- production mutations 0。
- report path。
- residual risks。

驗證：

```bash
git rev-parse HEAD
git rev-parse origin/main
git rev-list -n 1 phase-12-e2e-staging-release-hardening-complete
git ls-remote --tags origin phase-12-e2e-staging-release-hardening-complete
git ls-remote --tags origin phase-12-e2e-staging-release-hardening-complete^{}
```

---

## 28. Rollback 計畫

觸發條件：

- Production deployment health fail。
- Public critical route fail。
- Admin login regression。
- Draft disclosure。
- Private asset disclosure。
- Session boundary fail。
- Security header重大退化。
- Production mutation 非 0。
- Staging／production environment 混用。
- Release commit mismatch。
- E2E artifact 洩漏 secret。

Rollback 順序：

1. 停止 production promotion。
2. 標記 workflow failed。
3. 保留不含 secret 的 evidence。
4. 回滾至 Phase 11 verified commit：
   `c3995e4b6dd02ef24c4b93cc6770dae662a09099`
5. 驗證 Vercel production deployment 指向正確 commit。
6. 執行 Phase 11 production synthetic。
7. 執行 authenticated read-only smoke。
8. 驗證 production mutations 0。
9. 若 credential 泄漏，立即 rotate。
10. 建立 incident report。

不得移動 Phase 11 tag 來代表 rollback。

---

## 29. 阻塞判定

以下任一項成立，Phase 12 不得判定 COMPLETE：

- 無獨立 staging origin。
- Staging 實際指向 production。
- Browser CRUD E2E 只能在 production 執行。
- PR job 可取得 admin／service-role credential。
- Staging fixture 無法完整 cleanup。
- Production mutation 不為 0。
- Browser E2E 有 unresolved flaky tests。
- Required checks 可被直接繞過。
- Artifact 含 credential。
- Phase 10／11 regression 失敗。
- Completion tag 未指向 final verified main commit。
- Complete report 缺少遠端證據。
- Warning 被 suppress 而未治理。
- Cross-browser staging 完全未執行。
- Staging approval 只有文字聲明，沒有可追溯控制。

---

## 30. 可接受 residual risks

只有在不影響 release safety 時，才可列為 accepted risk，例如：

- Mobile Safari 實機尚未自動化，但 WebKit 與 responsive emulation 通過。
- 無付費 visual regression 平台。
- Accessibility 僅 smoke，不是完整 WCAG audit。
- 少數 upstream runtime warning 無可用修正。
- Browser matrix 未涵蓋所有歷史版本。
- Staging required reviewer 因 plan 限制改採可驗證替代控制。

每項 accepted risk 必須包含：

- 影響。
- 機率。
- 緩解。
- owner acceptance。
- 後續期限或觸發條件。

---

## 31. 最終 verdict 規則

只允許以下三種：

```text
PASS
PASS WITH ACCEPTED RISKS
BLOCK
```

Phase 12 可判定：

```text
MERGED / RELEASED COMPLETE
```

前提是：

- 獨立 staging 成立。
- Full staging browser E2E 通過。
- Approval gate 有效。
- Production release 與 staging commit 相同。
- Production post-release smoke 通過。
- Production mutations 0。
- Phase 10／11 regression 通過。
- Completion tag 驗證一致。
- 所有 residual risks 已明確記錄。

---

## 32. Codex 執行規範

Codex 必須：

- 先檢查 repository，再修改。
- 優先沿用現有 Nuxt、Supabase、Vercel 與 CI 架構。
- 使用 TypeScript。
- 遵守 Vue 3 Composition API 與 Nuxt 3 SSR 慣例。
- 保持 server-side authorization。
- 保持 HttpOnly cookie session。
- 保持 RLS。
- 使用可維護的 page object／fixture pattern，但避免過度抽象。
- 使用語意 selector。
- 讓 failure artifact 可判讀。
- 每完成一組工作就更新 execution status。
- 對所有 remote state 提供 URL／ID／SHA 證據。
- 不假設 workflow 成功，必須實際驗證。
- 不假設 deployment Ready，必須實際驗證。
- 不假設 cleanup 成功，必須查詢 residual。
- 不假設 tag 正確，必須驗證 peeled commit。
- 不將 PR Preview 當作 staging 或 production。
- 不將 mock-mode E2E 當作 authenticated staging E2E。
- 不將 API smoke 當作 browser journey。
- 不將 owner acceptance 描述成 independent review。

---

## 33. 交給 Codex 的起始指令

將本文件放入：

```text
codexSteps/phase12.md
```

並在 Codex 對話中貼上：

```text
請依照 codexSteps/phase12.md 完整執行 Phase 12。

強制基準：
- repository：Jacob0710/marchoutWebsite
- branch：main
- baseline commit：c3995e4b6dd02ef24c4b93cc6770dae662a09099
- baseline tag：phase-11-automated-testing-ci-complete

執行要求：
1. 先驗證 HEAD、origin/main 與 Phase 11 tag peeled commit 完全一致。
2. 先執行 Phase 11 全部基準 gates；若失敗，記錄為 baseline blocker，不得直接修改掩蓋。
3. 建立工作分支 codex/phase12-e2e-staging-release-hardening。
4. 以 Playwright 建立 browser E2E。
5. 建立與 production 明確分離的 staging origin、資料與測試身分。
6. PR 不得取得 staging 或 production credentials。
7. Browser CRUD 只允許在 staging。
8. Production 僅允許 synthetic 與 authenticated read-only smoke，remote mutations 必須為 0。
9. 建立可重複 seed／cleanup，fixture residual 必須為 0。
10. 建立 PR → staging → approval → production promotion gate。
11. 擴充 coverage，但必須明確區分 curated、application integration 與 browser journey。
12. 治理 Phase 11 記錄的 Nuxt、Nitro、lucide 與 GitHub Actions runtime warnings。
13. 所有外部 GitHub Actions 必須固定 immutable 40-character SHA。
14. 持續更新 outputs/phase-12-execution-status.md。
15. 完成後建立 outputs/phase-12-complete-report.md。
16. 必須提供 PR、CI run、deployment、browser matrix、coverage、cleanup、mutation、tag 的可追溯證據。
17. 未滿足 Definition of Done 時不得建立 completion tag。
18. 不得移動 Phase 11 tag，不得 force push，不得 bypass branch protection。

請直接執行，不要只提供建議或範例。
```

---

## 34. Phase 12 完成後的下一階段候選

Phase 12 完成後，Phase 13 可考慮：

1. 70 筆草稿內容審核、個資遮蔽與分批發布。
2. 52 條 redirect activation。
3. 正式內容 release runbook。
4. 視覺回歸測試。
5. 完整 WCAG accessibility audit。
6. SAST／DAST 與更完整 supply-chain provenance。
7. 備份還原演練。
8. Production incident response drill。
9. 效能預算與 Core Web Vitals gate。
10. SEO、structured data 與 canonical policy 最終驗收。

Phase 13 不應提前混入 Phase 12，除非是建立 staging fixture 所不可避免的最小變更。

---

## 35. 最終交付原則

Phase 12 的核心成功標準不是「Playwright 已安裝」，而是：

```text
同一個受保護的 release commit
先在獨立 staging 完成真實 browser journey
經過可追溯 approval
再部署至 production
最後以零寫入方式驗證 production
```

只有當 repository、CI、staging、browser E2E、production deployment、read-only smoke、zero mutation、治理與 completion tag 全部可互相追溯時，Phase 12 才能被判定為完成。
