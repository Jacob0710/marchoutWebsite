# Phase 12 Execution Status

更新時間：2026-07-31（Asia/Taipei）

## 狀態

- Phase 12：`INCOMPLETE`
- Repository：`C:\Users\Admin\Documents\BuildWeb\marchoutWebsite`
- Branch：`codex/phase12-e2e-staging-release-hardening`
- 文件更新前的 pushed HEAD：`80e4bca5118dc092d407276dade518cd7f2893dc`
- PR：`#12`（OPEN／DRAFT）
- Phase 11 baseline、`origin/main` 與既有 Phase 11 tag：
  `c3995e4b6dd02ef24c4b93cc6770dae662a09099`
- Phase 11 歷史未被 rebase、reset、force-push、重寫或移動。
- Phase 12 completion report：`NOT CREATED`
- Phase 12 completion tag：`NOT CREATED`

## Phase 11 報告處理紀錄

| 完整路徑 | 大小 | SHA-256 | 判定 |
| --- | ---: | --- | --- |
| `C:\Users\Admin\Documents\BuildWeb\marchoutWebsite\outputs\phase-11-complete-report.md` | 24,602 bytes | `8B8D8D3F9128B829A08F3E2BEA236121A5C34974F78E222362ED381296006B3A` | Phase 11 正式完成報告 |
| `C:\Users\Admin\Documents\BuildWeb\marchoutWebsite\outputs\phase-11-completion-handoff.md` | 10,667 bytes | `12E5058473C5C433C82BC0E692026145D4EFA2B3E1631A625E46C1900493DB5E` | 合併前 handoff 與 stop-condition 歷程 |

兩份內容差異為 `276 additions / 720 deletions`，不是重複報告或單純格式
版本；用途與時間點互補，因此都保留在既有 `outputs/` 目錄並納入 Git。

## 本次已完成的前置基礎設施

### Baseline migration

`supabase/schema.sql` 已完成逐項稽核。它建立 Phase 4 public schema 所需的
七個基礎資料表，不含 `admin_users`／`is_admin`、production content、seed
data、實際使用者、個資或秘密；沒有 `INSERT`、`UPDATE`、`DELETE`、
`TRUNCATE`，也沒有破壞性 table drop。Phase 4 的舊 policy 由後續 migration
按既有設計收斂，沒有為測試降低最終權限。

正式 baseline：

`supabase/migrations/20260713000100_phase4_public_schema_baseline.sql`

來源交叉驗證：

- `supabase/schema.sql`
- application types、queries、mappers 與 server APIs
- Phase 4／5 文件與 `supabase/README.md`
- 後續十個 migration 的 table、column、policy、function 依賴
- repository static verifier 與 SQL verification fixtures
- production 僅作唯讀 schema 參考；未執行 production mutation

完整 migration chain：

1. `20260713000100_phase4_public_schema_baseline.sql`
2. `20260714000100_admin_users.sql`
3. `20260714000200_admin_activity_read_policy.sql`
4. `20260715000100_phase6_activity_crud_assets.sql`
5. `20260716000100_phase7_admin_access_governance.sql`
6. `20260720000100_phase8_core_content_platform.sql`
7. `20260721000100_phase9_content_migration_provenance.sql`
8. `20260721000200_phase9_publish_timestamp_consistency.sql`
9. `20260722000100_phase10_editorial_review_queue.sql`
10. `20260722000200_phase10_release_batches.sql`
11. `20260722000300_phase10_redirect_review_hotfix.sql`

### Staging 部分套用狀態修復

- 已重新證明 linked Supabase project 是專用 staging，名稱、project
  identity、URL 與 database host 均不同於 production。
- reset 前確認 staging 只有第一個 Phase 11 migration，沒有使用者內容或不可
  丟失資料；記錄了 object inventory 與 remote migration history。
- 只重建 staging，沒有對 production 執行 reset、repair、push、seed 或
  migration-history mutation。
- staging 從空白狀態按上述 11 個 tracked migrations 重建；沒有只刪 history、
  手工補 table、從殘缺 staging `db pull`，也沒有載入 production data。
- `migration list --linked` 已確認 LOCAL／REMOTE 11 筆逐筆一致，沒有
  local-only 或 remote-only migration。

### Database 驗證

- public tables：25；RLS enabled：25
- indexes：69
- constraints：226
- triggers：24
- functions：53
- SECURITY DEFINER functions：46
- SECURITY DEFINER unsafe `search_path`：0
- broad `ALL` policies：0
- application role `BYPASSRLS`：0
- admin auth verification：8/8
- admin CRUD verification：5/5
- admin access verification：2/2
- Phase 8 verification：7/7
- Phase 9 verification：2/2
- public activities verification：5/5

Phase 10 real-data reconciliation SQL 需要歷史 production corpus
（70 drafts／122 reviews／83 redirects），不會把 production data 複製到乾淨
staging 來偽造證據；其 repository/static fixture verification 已通過。

### Storage 與 Auth

- private buckets：`activity-assets`、`content-assets`、`downloads`
- 三個 bucket 的 public flag、tracked policies、anonymous／authenticated／
  active-admin／non-admin 邊界已驗證。
- service-role credential 只提供給 server-side seed／cleanup jobs；browser
  job 與 browser bundle 都沒有 service-role key。
- staging-only identities：一名 active admin、一名 non-admin。
- active admin 正確映射到一筆 active `admin_users`；non-admin 沒有 active
  admin mapping。
- identity 密碼與 UUID 未寫入 Git、文件、PR 或 artifacts。

### Vercel staging 與 Supabase Auth

- 獨立 Vercel project：`marchout-staging`
- canonical URL：`https://marchout-staging.vercel.app`
- project identity、deployment identity、canonical origin 與 production 分離。
- runtime 使用 staging Supabase public URL／public key；未放入 service-role
  key、database password 或 production credentials。
- `/api/health` 回報 `environment=staging`，且 `X-App-Environment=staging`。
- staging Supabase Site URL、redirect allowlist、login callback 與 logout
  redirect 已設定到獨立 staging canonical URL；production URL 不是 staging
  canonical。

### GitHub `staging` environment

- 所有 Phase 12 variables／secrets 使用
  `docs/phase12-staging-access-checklist.md` 的精確名稱。
- production URL 只作 isolation comparison；production token、password、
  service-role 或 mutation credential 不在 staging environment。
- deployment branch policy：`main` 與
  `codex/phase12-e2e-staging-release-hardening`。
- pre-merge staging 不設 required reviewer；owner approval 依規格在
  90/90、cleanup 與 residual 0 後才取得。
- `deploy-staging` 取得 Vercel token與 staging public key；`browser-e2e`
  只取得 staging public key與測試 identities；`seed`／`cleanup` 才取得
  staging service-role。

## Repository 與 PR CI

文件更新前 exact-head `80e4bca5118dc092d407276dade518cd7f2893dc`：

| Run ID | Workflow | 結果 |
| ---: | --- | --- |
| `30587325461` | Phase 11 quality and security gates | SUCCESS；`quality` SUCCESS、`dependency-review` SUCCESS；PR 不適用的 `production-synthetic` 為 event-routing SKIPPED |
| `30587325350` | Phase 12 pull request quality | SUCCESS；`phase12-quality` SUCCESS、`dependency-review` SUCCESS |

同一 exact head 的 `Vercel – marchout-staging`、
`Vercel – marchout-website` 與 `Vercel Preview Comments` contexts 均為
SUCCESS。Preview check 本身不視為完整 staging acceptance evidence。

目前 repository verification：

| Gate | 結果 |
| --- | --- |
| `node --check scripts/phase12/verify-staging-approval.mjs` | PASS |
| `pnpm run phase12:verify` | PASS；11 migrations、7 baseline tables、0 baseline content rows、0 secret findings、0 production mutation scripts |
| `pnpm run lint` | PASS；0 warnings／0 errors |
| `pnpm run typecheck` | PASS |
| `pnpm dlx yaml-lint@1.7.0 .github/workflows/phase12-staging-e2e.yml` | PASS |
| `git diff --check` | PASS |

## 尚未執行的 staging matrix

以下不能以 local mock、preview deployment、production Supabase 或較低 isolation
規則取代：

| Project | Required passes | Allowed skips | Current evidence |
| --- | ---: | ---: | --- |
| Chromium desktop | 27 | 0 | NOT RUN |
| Firefox desktop | 21 | 0 | NOT RUN |
| WebKit desktop | 21 | 0 | NOT RUN |
| Mobile Chromium | 21 | 0 | NOT RUN |
| **Total** | **90** | **0** | **NOT RUN** |

因此尚無 90/90、artifact recursive scan、final cleanup、database residual 0
與三個 Storage bucket residual 0 的完整同一 workflow-run 證據。

## 不可跨越的限制

- 禁止使用 production Vercel 或 production Supabase 代替 staging。
- 禁止 production migration、reset、repair、seed、Auth／Storage 測試或內容
  mutation。
- 禁止 mock auth、假 success、skip staging-only cases、降低 isolation verifier。
- 禁止將 service-role 放入 browser job、browser bundle、Vercel runtime、Git、
  log 或 artifact。
- 禁止在 pre-merge staging 通過前將 PR 轉為 Ready 或合併。
- 禁止在全部 DoD 通過前建立 Phase 12 completion report 或 completion tag。

## 解除目前測試缺口的精確順序

1. 再次驗證 Vercel project／domain、Supabase project／database host 與
   production 全部不同。
2. 在 Draft PR exact head 執行 frozen install、repository gates 與 isolated
   Vercel deployment。
3. 確認 staging migrations 已對齊，並重跑 SQL／RLS／policy／grant／function
   verification。
4. 確認 staging identities、private buckets 與 Storage policies。
5. 執行 deterministic namespaced seed。
6. 執行完整 Playwright matrix，要求 90 passed、0 skipped、0 failed、0 flaky。
7. 不論 browser 結果都執行 cleanup。
8. 要求 database fixture／asset residual 與三個 bucket Storage residual 全為 0；
   再次 cleanup 證明 idempotent。
9. recursive 掃描所有 artifacts（包含 trace ZIP），要求 secret findings 0、
   production mutation attempts 0、production content mutations 0。
10. 取得 repository owner 對 tested exact SHA 的 approval。
11. PR 轉為 Ready，透過 protected `main` 合併。
12. 驗證 final-main required checks。
13. 對 exact final-main SHA 再跑一次完整 staging workflow。
14. 取得 production release approval後才執行 production promotion。
15. 執行 production read-only smoke，確認 production mutation 0。
16. 所有 DoD 都通過後才建立 Phase 12 完成報告。
17. 最後建立並推送 annotated completion tag。
