# March Out For Love
# Phase 9 Codex 完整專案交接與全權執行規格

> **文件用途**：將本文件直接交給 Codex。Codex 必須在已完成 Phase 8 的最新 `main` 基準上，全權執行 Wix／Legacy 內容盤點、正規化、私有資產遷移、內容匯入、來源追蹤、驗證、回滾準備、文件整理、Git release 與遠端推送。
> **專案名稱**：March Out For Love／愛潮關懷社網站
> **專案根目錄**：`C:\Users\Admin\Documents\Codex\2026-06-24\phase-1-phase-2-supabase-mock`
> **GitHub Repository**：`Jacob0710/marchoutWebsite`
> **技術棧**：Nuxt 3、Vue 3、TypeScript、Tailwind CSS、Supabase、pnpm
> **執行分支**：`main`
> **Phase 8 完成 Tag**：`phase-8-core-content-platform-complete`
> **Phase 9 名稱**：Wix／Legacy Content Inventory and Controlled Migration
> **建議規格檔案位置**：`codexSteps/phase9.md`
> **規格日期**：2026-07-21

---

# 0. Codex 全權執行授權

## 0.1 執行原則

本 Phase 由 Codex 全權執行。

Codex不需要針對一般技術設計、檔案修改、爬取公開舊站、資料清洗、migration、匯入工具、測試、Browser 驗收、Git commit、tag 或 push 逐項詢問使用者。

Codex被授權執行：

1. 閱讀整個 repository 與 Phase 4–8 規格、migration、測試及完成報告。
2. 自動解析 Phase 8 完成 tag 的精確 commit。
3. 搜尋 repository 中所有 Wix URL、舊站連結、Legacy URL、mock content 與現有資料來源。
4. 透過公開可存取頁面盤點使用者所屬 Wix 舊站。
5. 使用 browser、HTTP fetch、HTML parser 或 Wix 公開資料接口取得公開內容。
6. 建立本機來源快取、來源 hash、正規化 manifest 與匯入報告。
7. 建立必要的 Supabase migration、來源追蹤表、RLS、grants、RPC 與 verification。
8. 以 active-admin 身分透過既有 Nitro Server API 或受控 Phase 9 API 執行匯入。
9. 搬移圖片、附件與 legacy file URLs 到 Phase 8 private Storage。
10. 新增、更新或調整 import scripts、shared types、validation 與 documentation。
11. 更新靜態頁面中的正式 Wix 文案，但不得建立未確認的通用頁面 CMS。
12. 執行 inventory、dry-run、apply、resume、verify、rollback-test。
13. 執行 Phase 5–9 regression、production preview 與 Browser acceptance。
14. 清理測試 fixture、暫存檔與孤兒物件。
15. 產出完整 Phase 9 completion report、migration manifests、manual-review 清單及 redirect manifest。
16. 所有 Definition of Done 通過後，建立 commit、tag，並 push `main` 與 tag 到 `origin`。
17. 自主修正本 Phase 直接發現且影響資料完整性、安全、冪等性或 Phase 8 邊界的問題。

## 0.2 不需要中途詢問的事項

Codex自行決定：

- 爬取工具與 parser。
- manifest 採 JSON、JSONL、CSV 的具體組合。
- script 拆分與命名。
- 來源 cache 結構。
- checksum 與 canonicalization 實作。
- 批次大小、重試次數與 rate limit。
- import API 是否沿用既有 admin APIs 或增加 Phase 9 專用 admin-only endpoints。
- provenance table 與 RPC 的最小安全設計。
- asset path 的命名與 namespace。
- HTML 轉安全純文字的 parser 實作。
- activity type 的規則式 mapping 與 manual-review 門檻。
- deterministic sample 策略。
- migration 執行順序。
- 是否建立小型 CLI dependency，只要必要且無 major framework upgrade。
- 是否以單一最終 commit 或 Codex內部未推送的 checkpoint commit 進行工作；最終必須提供乾淨、可驗證 release。

## 0.3 高風險禁止事項

即使為全權執行，Codex仍不得：

1. 使用 `service_role`、Supabase secret key、database superuser 或 Auth Admin API。
2. 建立公開 Storage bucket。
3. 將正式 mutation 改回 client direct Supabase write。
4. 降低 Phase 8 的 `requireAdmin`、same-origin、RLS、private Storage、stable error 或 safe rendering。
5. force push。
6. rewrite、rebase 或 amend 使用者既有公開 commit。
7. `git reset --hard`、`git clean -fd` 或覆蓋使用者未提交內容。
8. 未盤點前大量刪除既有 Supabase rows 或 Storage objects。
9. 刪除 Phase 5–8 audit、管理員、正式活動或任何無法確認來源的資料。
10. 爬取需要登入、付費牆、CAPTCHA、私有 API 或繞過存取限制的內容。
11. 將 raw HTML、script、style、event handler 或 `javascript:` URL 匯入正式 body。
12. 將來源未知或資訊不足的內容直接標為 published。
13. 為缺失日期、參與人數、地點、作者或分類捏造資料。
14. 使用隨機 slug 來掩蓋衝突。
15. 跨 record 共用同一 Storage object，除非目前 ownership 與 delete model 明確支援。
16. 將大型來源 dump、下載媒體、cookie、session、password 或 source cache 提交 Git。
17. 啟用正式 DNS redirect、Wix 下線、production deploy 或計費服務。
18. 未通過完整 reconciliation、verification 與 cleanup 就建立 complete tag。

## 0.4 外部資料來源阻塞處理

若 Codex無法從 repository、公開舊站、既有匯出檔或可用 browser session 找到 Wix 舊站來源：

1. 不得猜測 URL。
2. 完成：
   - Phase 8 基準驗證。
   - migration provenance infrastructure。
   - import pipeline。
   - manifest schema。
   - synthetic end-to-end migration test。
   - dry-run／verify／rollback-test。
3. 搜尋所有 repository、README、mock data、site settings、social links 與 Git history 中的候選來源。
4. 在 completion report 記錄唯一 blocker：
   - 缺少實際 Wix base URL 或 export。
5. 不得將真實內容遷移標示為完成。
6. 不得建立 Phase 9 complete tag。
7. 若來源可公開存取或已存在本機，直接完成，不需詢問使用者。


---

# 1. Phase 8 不可退化基準

Phase 9 必須以 Phase 8 完成狀態為基準。

Phase 8 已完成：

- Posts 正式 CRUD。
- Files metadata、private upload、replace、publish、download proxy。
- FAQ CRUD、active／inactive、atomic reorder。
- Year Summaries CRUD、publication、cover。
- Site Settings singleton。
- 公開 SSR。
- Private `content-assets` 與 `downloads`。
- Nitro Server APIs。
- active-admin authorization。
- same-origin mutations。
- RLS。
- stable errors。
- strict mock／Supabase mode。
- safe plain-text rendering。
- Phase 5–8 smoke。
- Browser acceptance。
- migration source-of-truth 文件。
- Git tag 與 remote release。

Phase 9 不得退化：

```text
Browser
→ Nitro Server API
→ Supabase anon client + user JWT
→ RLS
→ Private Storage
```

不得改為：

```text
Browser
→ direct content table mutation
```

Phase 9 必須保留：

- Supabase cookie SSR session。
- `requireAdmin`。
- active `admin_users`。
- inactive admin 立即失去權限。
- Phase 7 last-admin 與 audit 防護。
- Phase 8 public DTO 不洩漏 storage path。
- Phase 8 draft／published 404。
- Phase 8 no service role。
- Phase 8 safe text rendering。
- Phase 8 mock mode 規則。
- Phase 8 private asset proxy。
- Phase 8 production `/supabase-test` 404。

---

# 2. Phase 9 任務目標

Phase 9 的核心目標：

> 將舊 Wix 與 Legacy 內容從「未知、分散、可能仍使用 public URL」轉換為「可盤點、可追蹤、可重複執行、可驗證、可回滾、符合 Phase 8 安全邊界的正式內容」。

Phase 9 必須完成：

1. 找出所有可用的 Wix／Legacy 來源。
2. 建立完整 source inventory。
3. 對每一個舊頁面與內容項目做 disposition。
4. 建立可機器執行的 content manifest。
5. 建立 asset manifest。
6. 建立 old URL → new URL redirect manifest。
7. 建立 manual-review 清單。
8. 建立 source checksum 與 target provenance。
9. 建立冪等、可 resume 的 import pipeline。
10. 將 Wix 活動遷移到 Activities。
11. 將 Wix 最新消息遷移到 Posts。
12. 將公開下載檔與 legacy file URLs 遷移到 private `downloads`。
13. 將 FAQ 遷移到 FAQ table。
14. 將年度成果遷移到 Year Summaries。
15. 將品牌、聯絡與社群資料正確合併到 Site Settings。
16. 將 About／Organization／Programs／Contact 等靜態頁面內容盤點並遷移到現有頁面或設定。
17. 搬移圖片與附件到 private Storage。
18. 保留影片為受控外部連結，不下載第三方影片。
19. 對資訊不足項目建立 draft 或 manual-review，不捏造資料。
20. 驗證所有來源項目都有處理結果。
21. 驗證 target counts、hash、公開頁、下載與資產。
22. 產出 rollback manifest。
23. 測試 idempotency。
24. 通過 Phase 5–9 regression。
25. 更新 README、migration 文件與 Phase 9 completion report。
26. 建立 final commit、tag 並 push。


---

# 3. In Scope

## 3.1 來源

- 公開 Wix 網站。
- Wix 頁面 HTML。
- Wix 公開 JSON／metadata。
- repository 內 legacy URLs。
- `utils/mockData.ts`。
- 舊 README 與 Phase 1–4 文件中的內容。
- 已存在 Supabase legacy rows。
- legacy `file_url`。
- legacy public bucket objects。
- 使用者已提供或專案中存在的 CSV、JSON、Markdown、圖片、PDF。
- 公開 YouTube／社群連結 metadata。

## 3.2 Target modules

- Activities。
- Posts。
- Files。
- FAQ。
- Year Summaries。
- Site Settings。
- 現有 static pages：
  - `/about`
  - `/organization`
  - `/programs`
  - `/programs/breakfast`
  - `/programs/exploration`
  - `/contact`
- URL redirect manifest。
- migration provenance。

## 3.3 資產

- 活動圖片。
- Post cover。
- Year cover。
- 活動附件。
- 下載中心檔案。
- 可合法取得的站內圖片。
- 來源 logo。
- 外部影片 URL。
- 不下載 YouTube／Facebook／Instagram 影片本體。

## 3.4 工具與文件

- inventory scripts。
- fetch／crawl scripts。
- normalize scripts。
- import scripts。
- verify scripts。
- rollback-test scripts。
- provenance migration。
- source manifests。
- result manifests。
- manual-review reports。
- redirect plan。
- completion report。

---

# 4. Out of Scope

Phase 9 不實作：

- 正式 deployment。
- DNS 切換。
- Wix 網站下線。
- 正式 redirect activation。
- GitHub Actions。
- staging platform 建置。
- CSP／HSTS 的 production activation。
- Rich Text WYSIWYG editor。
- unsafe HTML import。
- 多語系。
- SEO 完整最佳化。
- sitemap／robots／structured data 完整實作。
- 全站視覺重設計。
- 自訂 taxonomy。
- RBAC。
- content revision history。
- scheduled publication。
- analytics。
- newsletter。
- contact form email。
- third-party video download。
- social media archive。
- OCR 批次辨識。
- 人工補寫缺失內容。
- 需要付費或繞過權限的 Wix private export。
- 正式刪除 legacy bucket／legacy URL columns。
- Phase 10 之後工作。


---

# 5. 開始前必要檢查

Codex開始前執行並記錄：

```bash
cd C:\Users\Admin\Documents\Codex\2026-06-24\phase-1-phase-2-supabase-mock

git fetch --tags origin

git status --short
git status -sb
git branch --show-current
git rev-parse HEAD
git rev-parse phase-8-core-content-platform-complete^{commit}
git rev-parse origin/main
git log --oneline --decorate --graph --all -25
git tag --points-at HEAD
git tag --list "phase-*"
git remote -v

node --version
pnpm --version
```

必須確認：

1. branch 為 `main`。
2. Phase 8 tag 存在。
3. Phase 8 tag 指向的精確 commit 已記錄。
4. `origin/main` 與本機狀態已確認。
5. 不得只依 Phase 8 completion report 的文字描述判定 commit。
6. 若 HEAD 為 Phase 8 tag 後合法文件 commit：
   - 保留。
7. working tree 未提交內容：
   - 記錄。
   - 判斷來源。
   - 不得直接清除。
8. remote divergence：
   - 先分析。
   - 不 force。
9. 確認 `.env.phase9.local` 已 gitignored。
10. 確認 source cache、下載媒體與 raw snapshots 不會進 Git。

建議 `.gitignore` 加入：

```text
.env.phase9.local
.phase9-cache/
.phase9-downloads/
.phase9-source-snapshots/
migration/phase9/private/
migration/phase9/tmp/
```

---

# 6. 必須閱讀的文件

## 6.1 Phase 8 artifacts

```text
outputs/phase-8-completion-report.md
docs/architecture.md
docs/deployment-readiness.md
supabase/README.md
README.md
codexSteps/phase8.md
```

## 6.2 Phase 4–7 baseline

```text
codexSteps/phase4.md
codexSteps/phase5.md
codexSteps/phase6.md
codexSteps/phase7.md

outputs/phase-5-completion-report.md
outputs/phase-6-completion-report.md
outputs/phase-7-completion-report.md
```

## 6.3 Current schema and APIs

```text
supabase/migrations/
supabase/verify-*.sql
types/coreContent.ts
types/content.ts
shared/contentRules.ts
server/utils/contentMode.ts
server/utils/contentApi.ts
server/utils/contentValidation.ts
server/utils/contentAssets.ts
server/utils/fileUploadApi.ts
server/api/admin/
server/api/public/
```

## 6.4 Existing content

```text
utils/mockData.ts
pages/index.vue
pages/about.vue
pages/organization.vue
pages/programs/
pages/contact.vue
pages/news/
pages/files.vue
pages/faq.vue
pages/years/
```

## 6.5 Existing tests

```text
scripts/phase5-auth-smoke.mjs
scripts/phase6-admin-crud-smoke.mjs
scripts/phase7-admin-access-smoke.mjs
scripts/phase8-core-content-smoke.mjs
```


---

# 7. Wix／Legacy 來源探索

## 7.1 Repository search

Codex必須搜尋：

```bash
git grep -n -i "wix"
git grep -n -i "wixsite"
git grep -n -i "http://"
git grep -n -i "https://"
git grep -n -i "March Out For Love"
git grep -n -i "愛潮關懷社"
git log -S"wix" --all --oneline
git log -G"https?://" --all --oneline
```

另搜尋：

- README。
- old project files。
- mock data。
- social URLs。
- image host URLs。
- file URLs。
- site settings。
- browser screenshots or handoff files。
- deleted Git history。

## 7.2 Source priority

來源優先級：

1. Wix 正式公開頁面目前內容。
2. Wix 官方 export／使用者保存的來源檔。
3. Git history 中最近的正式舊站內容。
4. 目前 Supabase legacy rows。
5. Phase 1–4 mock data。
6. 人工 handoff 文案。
7. 無法確認來源的 placeholder。

同一內容衝突時：

- 不自動覆蓋。
- 記入 conflict manifest。
- 依 authoritative source 與 updated date 判斷。
- 無法判定則 manual-review。

## 7.3 公開爬取規則

Codex可以爬取使用者公開 Wix 站，但必須：

- 只抓公開頁面。
- 不登入。
- 不繞過 CAPTCHA。
- 不逆向 private API token。
- 不高頻壓測。
- rate limit 建議每秒最多 1 個 request。
- 429／5xx exponential backoff。
- 設定清楚 user-agent。
- 記錄 fetch timestamp、status、content type、hash。
- 避免重複下載相同 URL。
- assets 分離下載。
- 不將 raw cookies、headers、tokens 存檔。
- 不將大型 raw snapshots 提交 Git。

## 7.4 Wix 動態頁面

Wix 頁面可能使用 JavaScript hydration。

Codex可依序採：

1. 靜態 HTML。
2. HTML 內 embedded JSON。
3. browser rendered DOM。
4. 公開 sitemap。
5. 公開 RSS／feed。
6. 使用者已保存 export。

不得依賴不穩定的私有內部 API 作為唯一來源。


---

# 8. Source Inventory

建立：

```text
migration/phase9/source-inventory.jsonl
migration/phase9/source-inventory-summary.md
```

每一來源頁／項目至少包含：

```ts
interface SourceInventoryItem {
  sourceSystem: 'wix' | 'legacy-db' | 'legacy-storage' | 'mock' | 'repository'
  sourceKind:
    | 'page'
    | 'activity'
    | 'post'
    | 'file'
    | 'faq'
    | 'year-summary'
    | 'site-setting'
    | 'static-page'
    | 'image'
    | 'attachment'
    | 'video-link'
    | 'unknown'
  sourceKey: string
  sourceUrl?: string
  parentSourceKey?: string
  title?: string
  discoveredAt: string
  sourceUpdatedAt?: string
  httpStatus?: number
  contentType?: string
  byteSize?: number
  sha256?: string
  language?: string
  disposition:
    | 'migrate'
    | 'merge'
    | 'redirect-only'
    | 'archive'
    | 'duplicate'
    | 'manual-review'
    | 'skip'
  targetKind?: string
  reason?: string
}
```

規則：

- `sourceKey` 必須 deterministic。
- 同一來源重跑不得產生新 key。
- URL canonicalization：
  - remove fragments。
  - normalize trailing slash。
  - preserve meaningful query only。
  - lowercase hostname。
- inventory 不保存 raw password、cookie 或完整 private headers。
- 每一 discovered URL 必須有 disposition。
- unknown 不可被忽略；必須 manual-review 或 skip reason。

---

# 9. Content Manifest

建立：

```text
migration/phase9/content-manifest.jsonl
migration/phase9/content-manifest-summary.md
```

每一 target item 至少：

```ts
interface ContentMigrationItem {
  migrationKey: string
  sourceKeys: string[]
  targetKind:
    | 'activity'
    | 'post'
    | 'file'
    | 'faq'
    | 'year-summary'
    | 'site-settings'
    | 'static-page'
  targetNaturalKey: string
  sourceHash: string
  normalizedHash: string
  operation: 'create' | 'update' | 'merge' | 'skip' | 'manual-review'
  desiredStatus: 'draft' | 'published'
  payload: Record<string, unknown>
  assetKeys: string[]
  oldUrls: string[]
  warnings: string[]
  blockingIssues: string[]
}
```

Manifest requirements：

- deterministic ordering。
- stable JSON serialization。
- no temporary signed URL。
- no raw HTML。
- no local absolute path。
- no credential。
- no giant binary。
- payload 必須通過 target server validation schema。
- `blockingIssues.length > 0` 時不得 apply。
- manual-review item 不得自動 published。

---

# 10. Asset Manifest

建立：

```text
migration/phase9/assets-manifest.jsonl
migration/phase9/assets-summary.md
```

欄位至少：

```ts
interface AssetMigrationItem {
  assetKey: string
  sourceUrl?: string
  sourceLocalPath?: string
  ownerMigrationKey: string
  ownerKind: 'activity' | 'post' | 'file' | 'year-summary' | 'site-settings'
  role: 'cover' | 'gallery' | 'attachment' | 'download' | 'logo'
  originalFilename?: string
  detectedMimeType?: string
  extension?: string
  byteSize?: number
  sha256?: string
  width?: number
  height?: number
  targetBucket: 'activity-assets' | 'content-assets' | 'downloads'
  targetNamespace: string
  operation: 'upload' | 'reuse-existing-owner-object' | 'skip' | 'manual-review'
  warnings: string[]
}
```

規則：

- source URL 不等於 target path。
- object path 由 target record id／namespace 決定。
- 不接受 source filename 作為唯一 object key。
- 不跨不同 owner 共用 object。
- exact duplicate 可記錄，但仍依 ownership 複製或獨立上傳。
- checksum 使用 SHA-256。
- MIME 由內容 sniff + allowlist 判斷。
- SVG、HTML、JS、shell、executable 禁止。
- 第三方 tracking pixel 跳過。
- 小於合理尺寸的 spacer／icon 可 skip 並記錄。
- 大圖可合理轉 WebP，但需保留原始 hash 與轉換紀錄。
- 不擅自裁切主體。
- EXIF GPS 建議移除，除非有明確保留需求。
- alt text 來源不足時：
  - 使用中性的內容描述。
  - 不捏造人物姓名。
  - 加 manual-review warning。


---

# 11. Migration Provenance

Phase 9 必須建立最小 provenance schema，避免重跑造成重複與無法追溯。

建議 migration：

```text
supabase/migrations/20260721_001_phase9_content_migration_provenance.sql
```

若檔名已存在，使用下一個可用 sequence。

## 11.1 `content_migration_runs`

建議欄位：

```text
id uuid primary key
run_key text unique not null
source_system text not null
source_snapshot_sha256 text not null
app_commit_sha text not null
mode text not null
status text not null
summary jsonb not null default '{}'
started_at timestamptz not null
completed_at timestamptz
created_by uuid not null
created_at timestamptz not null
```

Mode：

```text
dry-run
apply
verify
rollback-test
```

Status：

```text
running
completed
failed
rolled-back
```

## 11.2 `content_source_refs`

建議欄位：

```text
id uuid primary key
migration_run_id uuid not null
source_system text not null
source_kind text not null
source_key text not null
source_url text
source_sha256 text not null
normalized_sha256 text not null
target_kind text not null
target_id uuid not null
target_natural_key text not null
operation text not null
migrated_at timestamptz not null
created_by uuid not null
```

Constraints：

```text
unique(source_system, source_kind, source_key)
```

若一個 target只允許單一來源，可增加：

```text
unique(target_kind, target_id)
```

若同一 target需多來源 merge，則允許多 source refs 指向同一 target。

Codex需依實際 merge 模型選擇。

## 11.3 安全規則

- RLS enabled。
- public／anon 無 read／write。
- non-admin／inactive-admin denied。
- active admin 可透過必要 RPC 或 Phase 9 API 查詢。
- 不提供一般 content editor UI。
- no direct browser table write。
- `SECURITY DEFINER` fixed search_path。
- 不保存 raw source body、cookie、password、HTML 或 signed URL。
- summary 僅保存 count 與非敏感狀態。

## 11.4 Provenance API／RPC

Codex可選：

- CLI 呼叫 admin-only Phase 9 Server API。
- 或 authenticated admin 呼叫 narrow RPC。

建議 routes：

```text
POST /api/admin/migrations/phase9/runs
PATCH /api/admin/migrations/phase9/runs/:id
POST /api/admin/migrations/phase9/source-refs
GET /api/admin/migrations/phase9/runs/:id
```

所有 route：

- active admin。
- same-origin 若由 browser。
- CLI token/cookie 需安全處理。
- no-store。
- stable errors。
- 不回 raw DB error。

若 CLI 直接使用 Supabase user JWT 呼叫 RPC：

- password 只從 `.env.phase9.local`。
- 不 log。
- token 只在 process memory。
- exit 時清除。
- 不存檔。


---

# 12. Migration CLI

建立：

```text
scripts/phase9/
```

建議：

```text
discover-sources.mjs
build-inventory.mjs
normalize-content.mjs
download-assets.mjs
build-manifests.mjs
migrate-content.mjs
verify-migration.mjs
rollback-test.mjs
report.mjs
lib/
```

可整合，但功能需清楚。

Package scripts 建議：

```json
{
  "phase9:discover": "node --env-file-if-exists=.env.phase9.local scripts/phase9/discover-sources.mjs",
  "phase9:inventory": "node --env-file-if-exists=.env.phase9.local scripts/phase9/build-inventory.mjs",
  "phase9:normalize": "node --env-file-if-exists=.env.phase9.local scripts/phase9/normalize-content.mjs",
  "phase9:dry-run": "node --env-file-if-exists=.env.phase9.local scripts/phase9/migrate-content.mjs --mode=dry-run",
  "phase9:apply": "node --env-file-if-exists=.env.phase9.local scripts/phase9/migrate-content.mjs --mode=apply",
  "phase9:resume": "node --env-file-if-exists=.env.phase9.local scripts/phase9/migrate-content.mjs --mode=resume",
  "phase9:verify": "node --env-file-if-exists=.env.phase9.local scripts/phase9/verify-migration.mjs",
  "phase9:rollback-test": "node --env-file-if-exists=.env.phase9.local scripts/phase9/rollback-test.mjs",
  "test:phase9": "node --env-file-if-exists=.env.phase9.local scripts/phase9/verify-migration.mjs --full"
}
```

## 12.1 CLI modes

### Discover

- 找 source URLs。
- 抓 sitemap。
- fetch metadata。
- 建 source cache。
- 不寫 Supabase。

### Inventory

- 列出所有 source items。
- 建 disposition。
- 不寫 Supabase。

### Normalize

- 轉 target payload。
- 建 warnings／blocking issues。
- 不寫 Supabase。

### Dry-run

- 登入 active admin。
- 驗證 API access。
- 驗證所有 payload。
- 檢查 target collision。
- 檢查 asset。
- 計算操作計畫。
- 0 DB mutation。
- 0 Storage mutation。

### Apply

- 建 migration run。
- 按 dependency order 匯入。
- 寫 provenance。
- 每批保存 result。
- 失敗可 resume。
- 不自動 rollback 已成功批次。
- 記錄 exact result。

### Resume

- 依 migration key、source ref、target state 判斷。
- 已 verified item 跳過。
- failed item 重試。
- 不重複 upload。
- 不重複 create。
- hash 改變才 update。

### Verify

- count。
- hash。
- status。
- public visibility。
- asset。
- download。
- 404。
- provenance。
- orphan scan。
- source coverage。

### Rollback-test

- 只對 synthetic 或專用 test run。
- 刪除該 run 建立的 target records／objects。
- restore 更新前 snapshot。
- 驗證其他資料未動。
- 不對正式完整 migration 自動執行 destructive rollback。

---

# 13. Dependency Order

正式 apply 建議順序：

1. Site Settings backup。
2. Static page snapshots。
3. FAQ。
4. Posts。
5. Standalone Files。
6. Activities without assets。
7. Activity images。
8. Activity attachments。
9. Activity video links。
10. Year Summaries。
11. Post／Year covers。
12. Site Settings merge。
13. Static page content updates。
14. Redirect manifest。
15. Provenance finalization。
16. Verification。
17. Cleanup。

理由：

- assets 需要 target id。
- year report 可引用 files。
- static page／settings 更新需要可恢復 snapshot。
- public publish 必須在 assets 與必要欄位完成後。


---

# 14. Content Mapping Rules

## 14.1 共用規則

- 來源不存在的值不捏造。
- 無法確認的 item：
  - draft。
  - manual-review。
- published 必須符合 Phase 8 validation。
- source title／text trim。
- Unicode normalize NFC。
- 移除 zero-width／控制字元。
- 保留正體中文。
- 不自動轉簡體。
- 不把全形標點任意改為半形。
- 移除 script、style、navigation、cookie banner、footer 重複文字。
- 內容段落使用 plain text。
- list 轉 `•` 或換行安全文字。
- external URL 僅允許 `https:`，必要的 YouTube URL 依既有 validation。
- `mailto:`／`tel:` 僅在 Site Settings 明確欄位。
- 不保留 tracking query。

## 14.2 Slug

Slug 規則沿用 Phase 8。

優先：

1. 現有 target slug。
2. 舊 Wix meaningful slug。
3. title 正規化 slug。
4. source key suffix，只在 collision 且可解釋時。

Collision：

- 內容相同：
  - merge／duplicate。
- 內容不同：
  - deterministic suffix，如 academic year。
- 不使用隨機字串。
- 記入 slug conflict report。

保留舊 URL 到新 URL mapping。

## 14.3 Publication

可以 published：

- source 明確為正式公開內容。
- 必填欄位完整。
- asset／download 必要依賴完成。
- 無 blocking issue。
- public page verification通過。

必須 draft：

- 日期不明且活動語意依賴日期。
- 分類不明。
- 內容只有 placeholder。
- 來源疑似重複但未確認。
- 附件缺失。
- broken source。
- 來源內容互相衝突。
- 任何 blocking issue。


---

# 15. Activities Mapping

Target 使用 Phase 6／8 Activities model。

欄位：

```text
title
slug
academicYear
activityType
eventDate
location
participantsCount
resultSummary
content
status
isFeatured
tags
images
files
videos
```

## 15.1 Academic year

來源優先：

1. Wix 年度分組。
2. 頁面 title／breadcrumb。
3. event date 換算。
4. filename／URL。
5. manual-review。

民國年：

```text
西元年 - 1911
```

但學年度可能跨年，不能只依日期粗暴換算。

若來源明確寫「114學年度」，直接使用 114。

若只寫西元日期而未寫學年度：

- 使用既有專案年度規則。
- 在 manifest 記錄 derived value。
- 若邊界月份有歧義，manual-review。

## 15.2 Activity type

固定：

```text
regular
project
exploration
```

Mapping：

- 服務活動、關懷、早餐服務、志工、陪伴：
  - `project`
- 特殊活動、探索、營隊、跨域、專案型特別活動：
  - `exploration`
- 一般社團活動、聚會、例行、訓練：
  - `regular`

規則式判斷必須保存 mapping reason。

無法判斷：

- draft。
- manual-review。
- 不預設 regular。

## 15.3 Event date

- 只接受可解析的真實日期。
- 民國日期正確轉換。
- 不使用 page published date 代替 event date。
- 日期範圍：
  - 使用主要開始日。
  - 完整範圍保留在 content。
- 無日期：
  - draft。
  - manual-review。

## 15.4 Participants count

- 只使用明確數字。
- 「約 30 人」可記 30，warning 標記 approximate。
- 「數十人」不可推估。
- 若 target 不允許 null：
  - 使用 0 僅作 technical placeholder。
  - item 必須 draft。
  - warning `participants_unknown`。
- 不把 0 當成真實參與人數。

## 15.5 Result summary and content

- resultSummary：
  - source 摘要或首個成果段落。
  - 限制長度。
- content：
  - 安全純文字。
  - 保留段落。
  - 不含 Wix chrome。
- 不自動生成宣傳文案。
- 不使用 AI 補寫來源沒有的活動成果。

## 15.6 Images

- 第一張主要圖可作 cover。
- 其餘 gallery。
- 保留來源順序。
- duplicate exact hash 可跳過同一 owner內重複。
- alt text：
  - 使用 Wix alt。
  - 無 alt 時以可見 caption。
  - 再無則中性描述。
- 圖片下載失敗：
  - activity 可 draft。
  - 不 silently publish with broken cover。

## 15.7 Attachments

活動專屬附件：

- 使用 Phase 6 activity assets。
- 不重複放入 Files center，除非來源本來就是公共下載文件。
- metadata 保存 original filename、MIME、size。
- private Storage。

## 15.8 Videos

- 保存公開 YouTube／Vimeo／可接受外部 URL。
- 不下載影片。
- 不保存 tracking query。
- 無法 embed 的 URL可保留為普通外部連結，需符合 validation。


---

# 16. Posts Mapping

欄位：

```text
title
slug
excerpt
content
status
publishedAt
cover
coverAlt
isFeatured
```

規則：

- source page date 可作 publishedAt。
- 不使用 crawl timestamp 代替 published date。
- 無發布日期：
  - 若舊站明確公開且內容完整，可使用 migration time但 warning。
  - Codex需在 report列出。
- excerpt：
  - source 摘要優先。
  - 否則第一個有效段落。
  - 不超過 Phase 8 limit。
- content：
  - plain safe text。
- cover：
  - source main image。
- featured：
  - 預設 false。
  - 只有 source 明確置頂／精選才 true。
- 重複 news：
  - source hash + title + date 判斷。
  - 不建立 duplicate。

---

# 17. Files Mapping

## 17.1 Standalone files

目標：

```text
title
description
academicYear
category
originalFilename
mimeType
sizeBytes
status
publishedAt
sortOrder
storagePath
```

規則：

- 所有新 target 使用 private `downloads`。
- legacy `file_url` 不直接當 storage path。
- 先下載、hash、MIME 檢查、upload、verify。
- source HTTP 404：
  - manual-review。
  - 不建立 published dead record。
- title：
  - source label。
  - 不只用亂碼 filename。
- category：
  - 使用受控現有值。
  - 不建立 arbitrary taxonomy。
- academicYear：
  - source明確才填。
- publication：
  - source正式公開且檔案驗證成功。

## 17.2 Legacy database rows

對現有 `files.file_url`：

1. 盤點 row。
2. 判斷 URL：
   - Supabase legacy public bucket。
   - Wix media。
   - external。
   - missing。
3. 下載或 copy。
4. SHA-256。
5. upload private downloads。
6. 更新 formal metadata。
7. 驗證 public download proxy。
8. 保留 legacy URL。
9. 寫 provenance。
10. 不在 Phase 9 drop legacy column。
11. 不刪 legacy object。
12. 產出 cleanup候選清單，留 Phase 10／13 決策。

## 17.3 File security

- 延用 Phase 8 allowlist。
- HTML、SVG、JS、shell、exe禁止。
- source extension 與 MIME 不符：
  - blocking issue。
- Content-Disposition injection測試。
- zip 若需要：
  - 只在來源明確且可掃描時允許。
  - 否則 manual-review。
- password-protected檔案：
  - manual-review。
- corrupted PDF：
  - manual-review。


---

# 18. FAQ Mapping

欄位：

```text
question
answer
sortOrder
isActive
```

規則：

- 來源頁面順序保留。
- 折疊元件 title 作 question。
- body 作 answer。
- 空 answer 不匯入。
- 重複 question：
  - answer 相同 → duplicate。
  - answer 不同 → manual-review。
- 公開舊站 FAQ 預設 active。
- 已標示過時／停用的 FAQ：
  - inactive。
- reorder 使用 Phase 8 atomic endpoint。

---

# 19. Year Summaries Mapping

欄位：

```text
academicYear
title
theme
summary
highlights
statistics
cover
reportFileId
status
```

來源：

- 年度 landing page。
- 年度活動集合。
- 年度報告附件。
- Wix 年度標題與統計卡。

規則：

- 每年最多一筆。
- 同年多頁：
  - merge。
- theme 只使用 source 明確文字。
- summary：
  - source年度摘要。
- highlights：
  - source bullet list。
- statistics：
  - 只使用 source明確數值。
  - 不由活動資料推算後冒充舊站內容。
  - 可另產生 verification stats，但不直接寫正式 statistics。
- report：
  - 先匯入 Files。
  - 再關聯。
- 缺摘要但有活動：
  - 建 draft。
  - manual-review。
- 年度 cover：
  - 使用年度頁主圖。
- 不為每年自動生成 AI 摘要。


---

# 20. Site Settings Mapping

Phase 9 必須先 backup current singleton。

建立：

```text
migration/phase9/backups/site-settings-before.json
```

不得包含 secret；Site Settings本身為公開內容。

Merge rules：

- site name／club name：
  - 不覆蓋既有正確品牌。
- slogan：
  - 以使用者已確認的正式標語為優先：
    - `以早餐開始陪伴，以行動實踐關懷`
- social URLs：
  - source官方連結。
- email／phone／address：
  - source一致才更新。
  - 衝突則 manual-review。
- footer：
  - 保留合法既有正式文案，除非舊站更權威。
- map locations：
  - canonical address。
  - 移除 tracking。
- SEO fields：
  - Phase 9只搬現有明確值。
  - 不做完整 SEO創作。

更新後必須：

- public settings API。
- homepage。
- footer。
- about。
- contact。
- Browser verify。
- rollback snapshot。

---

# 21. Static Page Migration

由於 Phase 8 未建立 generic pages CMS，Phase 9 不得偷渡一套未設計的 page builder。

對下列頁面：

```text
/about
/organization
/programs
/programs/breakfast
/programs/exploration
/contact
```

建立：

```text
migration/phase9/static-pages-manifest.jsonl
```

每頁 disposition：

```text
update-static-source
merge-site-settings
already-current
redirect-only
archive
manual-review
```

規則：

- 正式長文可更新 Vue page或既有 structured data file。
- 不把 raw HTML貼入 template。
- 將內容拆成語意 section。
- 保留 existing component design。
- 不大幅重設計。
- 不將導航／footer重複搬入 page。
- source image使用 private or project local asset，依現有 architecture。
- static page assets若進 Git：
  - 必須合理壓縮。
  - 來源合法。
  - 檔案大小合理。
- 大量照片仍使用 private Storage，不提交 Git。
- 每頁建立 source→section mapping。
- Browser比較內容完整性。


---

# 22. URL Redirect Manifest

建立：

```text
migration/phase9/url-redirects.csv
migration/phase9/url-redirects-summary.md
```

欄位：

```text
source_url
source_path
target_path
status_code
content_kind
source_key
target_id
reason
verified
```

規則：

- 建議 status `301`。
- 暫時未確認可用 `302` 但 Phase 9不啟用。
- 一個 source path 只能有一個 target。
- 不可 redirect loop。
- 不可 redirect chain。
- deleted／archive content：
  - 對應最相關新頁。
  - 或明確 `410` 候選。
- query／fragment規則記錄。
- Wix dynamic slug 保留 mapping。
- Phase 9只產 manifest，不啟用 production redirect。
- Phase 10／12依部署平台套用。

驗證：

- target route 存在或預期存在。
- target published。
- no duplicate source。
- no loop。
- no chain。
- no external open redirect。

---

# 23. Manual Review

建立：

```text
migration/phase9/manual-review.csv
migration/phase9/manual-review-summary.md
```

欄位：

```text
review_id
severity
source_key
source_url
target_kind
issue_code
description
recommended_action
blocks_publish
blocks_migration
```

Severity：

```text
blocker
high
medium
low
```

Issue examples：

```text
missing_event_date
unknown_academic_year
unknown_activity_type
conflicting_contact_info
duplicate_slug
broken_asset
unsafe_file_type
missing_attachment
source_conflict
ambiguous_year_summary
unknown_participants
external_link_unavailable
```

規則：

- `blocks_migration=true`：
  - 不 apply item。
- `blocks_publish=true`：
  - 可 draft。
- 完成報告提供 count與剩餘項目。
- Phase 9 complete允許少量非阻塞 manual-review，但：
  - 所有可搬來源均已安全處理。
  - blocker = 0。
  - 未完成正式內容必須 draft。
- 若原始需求「全部搬遷」仍有大量 blocker：
  - 不建立 complete tag。


---

# 24. Idempotency

Phase 9 import 必須可重複執行。

Natural keys：

- Activity：
  - source key／provenance。
  - fallback slug + academic year。
- Post：
  - source key。
  - fallback slug。
- File：
  - source key + source SHA-256。
- FAQ：
  - source key。
- Year：
  - academic year。
- Site Settings：
  - singleton。
- Static page：
  - route。

Second apply requirements：

- 不新增 duplicate row。
- 不新增 duplicate object。
- unchanged hash → skip。
- changed normalized hash → controlled update。
- existing unrelated target → conflict，不覆蓋。
- provenance missing但 natural key collision → manual-review。
- failed batch可 resume。
- run summary包含：
  - created。
  - updated。
  - skipped。
  - conflicted。
  - failed。

必須實際執行：

1. dry-run。
2. apply。
3. verify。
4. second apply／resume。
5. 確認第二次無 duplicate。

---

# 25. Transaction and Compensation

資料庫與 Storage 無法跨服務單一 transaction。

每個 item流程：

1. Validate normalized payload。
2. Resolve existing target。
3. Create/update draft record。
4. Upload assets。
5. Update asset metadata。
6. Verify object。
7. Publish if eligible。
8. Write provenance。
9. Mark result verified。

失敗 compensation：

- 新 record尚未 provenance且未發布：
  - 可刪除本 run新建 record。
- 新 object DB未採用：
  - 刪除新 object。
- replace後舊 object：
  - 新 metadata成功後再刪舊 object。
- Site Settings／static page：
  - 使用 backup restore。
- 已存在正式 target：
  - 不自動刪除。
  - restore pre-update snapshot。

每一操作寫 local rollback manifest：

```text
migration/phase9/rollback-manifest.jsonl
```

不得包含：

- password。
- JWT。
- cookie。
- signed URL。


---

# 26. Database Verification

建立：

```text
supabase/verify-phase9-content-migration.sql
```

驗證：

## 26.1 Provenance schema

- tables。
- constraints。
- indexes。
- RLS。
- grants。
- fixed-search-path functions。
- no public read。
- no broad authenticated write。

## 26.2 Target integrity

- source refs target存在。
- no duplicate source key。
- no orphan provenance。
- published content invariants。
- site settings singleton。
- year unique。
- file metadata complete。
- no negative sort／size。
- no storage path in public DTO不可由 SQL驗證時由 API test。

## 26.3 Migration run

- current run status completed。
- source snapshot hash。
- count summary。
- failed count 0。
- blocker count 0。
- target verified count對應。

輸出：

```text
phase9_provenance_verified=true
phase9_target_integrity_verified=true
phase9_migration_run_verified=true
```

---

# 27. Phase 9 Tests

建立或更新：

```text
scripts/phase9/verify-migration.mjs
```

Package：

```text
pnpm run test:phase9
```

## 27.1 Synthetic pipeline test

在真實來源匯入前：

- 建 synthetic activity。
- synthetic post。
- synthetic file。
- synthetic FAQ。
- synthetic year。
- synthetic asset。
- dry-run。
- apply。
- verify。
- second apply。
- rollback-test。
- cleanup。

驗證：

- 0 duplicate。
- provenance。
- object ownership。
- publish gating。
- public 404／200。
- rollback只刪該 run。

## 27.2 Real source reconciliation

每個 source item：

- inventory disposition存在。
- migrate／merge item有 content manifest。
- asset item有 asset manifest。
- old URL有 redirect disposition。
- manual-review item有 reason。
- no unclassified。

Count：

```text
discovered
migrate
merge
redirect-only
archive
duplicate
manual-review
skip
imported
verified
failed
```

必須 reconciliation：

```text
discovered
=
all dispositions
```

以及：

```text
ready items
=
imported + intentionally skipped
```

## 27.3 Content verification

- title。
- slug。
- year。
- status。
- source hash。
- normalized hash。
- public visibility。
- draft isolation。
- asset count。
- file download。
- source ref。

## 27.4 Asset verification

- source hash。
- target object exists。
- byte size。
- MIME。
- image decode。
- no public bucket。
- no orphan object。
- no broken proxy。
- no raw path exposure。

## 27.5 Security regression

- anon admin API denied。
- non-admin denied。
- inactive-admin denied。
- active-admin allowed。
- same-origin。
- no service role。
- no Auth Admin API。
- no client direct write。
- no unsafe HTML。
- no secrets in logs。
- source cache ignored。
- migration env ignored。


---

# 28. Browser Acceptance

使用 production preview：

```bash
pnpm run build
pnpm run preview
```

## 28.1 Public migrated content

抽樣規則：

- 每種類型總數 ≤ 25：
  - 全部檢查。
- > 25：
  - 至少 25 筆。
  - 且至少 10%。
- deterministic sample。
- 每年度與每活動分類至少一筆。
- 每種 asset role至少一筆。

檢查：

- homepage。
- activities list。
- activity detail。
- news list。
- post detail。
- files。
- download。
- FAQ。
- years。
- year detail。
- about。
- organization。
- programs。
- contact。
- footer。
- mobile。

## 28.2 Source-to-target comparison

每個 sample：

- title一致。
- 主要內容未遺失。
- date/year正確。
- category正確。
- image數量合理。
- alt/caption合理。
- attachment可下載。
- external video可開啟。
- no Wix chrome。
- no script text。
- no broken image。
- no mojibake。
- no unsafe HTML。
- no duplicate paragraph。
- no placeholder。
- no mock content混入。

## 28.3 Draft／manual-review

- 不公開。
- admin可看。
- warning清楚。
- 不因舊 source公開就繞過 Phase 8 publish validation。

## 28.4 Mobile／Accessibility

- 390 × 844。
- no horizontal overflow。
- FAQ keyboard。
- file link可操作。
- image alt。
- focus visible。
- external link標示。
- table/list可讀。
- no hydration mismatch。
- no console error。


---

# 29. Full Regression

最終執行：

```bash
pnpm install --frozen-lockfile

pnpm run typecheck
pnpm run build
pnpm run preview

pnpm run test:phase5
pnpm run test:phase6
pnpm run test:phase7
pnpm run test:phase8
pnpm run test:phase9
```

SQL：

```text
supabase/verify-admin-access.sql
supabase/verify-phase8-core-content.sql
supabase/verify-phase9-content-migration.sql
```

另外：

```bash
git diff --check
```

驗證：

- production `/supabase-test` 404。
- mock mode仍正常。
- partial config仍 503。
- Supabase error不 fallback mock。
- activity CRUD。
- post CRUD。
- file upload／replace／download。
- FAQ reorder。
- year publish。
- settings singleton。
- admin invitation。
- inactive admin。
- private asset proxy。
- no orphan。

---

# 30. Cleanup

Phase 9 完成前：

- synthetic fixture rows刪除。
- synthetic objects刪除。
- test migration run標示 rolled-back／completed。
- settings restore。
- test admin restore。
- no pending invitation。
- no temporary public bucket。
- no `.phase9-cache` staged。
- no source downloads staged。
- no `.env.phase9.local` staged。
- no temporary HTML dump staged。
- no signed URL fixture。
- no orphan Storage object。
- no incomplete migration run。
- production-import assets與rows保留。
- legacy sources不刪除。


---

# 31. Source Snapshot and Repository Policy

可以提交：

```text
migration/phase9/source-inventory.jsonl
migration/phase9/content-manifest.jsonl
migration/phase9/assets-manifest.jsonl
migration/phase9/url-redirects.csv
migration/phase9/manual-review.csv
migration/phase9/rollback-manifest.jsonl
migration/phase9/*-summary.md
```

但提交前必須：

- 移除 local path。
- 移除 signed URL。
- 移除 query token。
- 移除 cookie。
- 移除個資。
- 移除不必要完整 body。
- 控制檔案大小。
- 對 source URL移除 tracking。

不得提交：

- raw HTML archive。
- 大量圖片／PDF source cache。
- private export。
- credentials。
- session。
- browser profile。
- Node cache。
- temporary downloads。

若 manifest 含公開 email／phone，因為屬正式站內容可保留，但需確認不是內部資料。

---

# 32. Documentation

## 32.1 README

更新：

- Phase 9 status。
- migration scripts。
- source cache policy。
- import modes。
- env。
- provenance。
- verification。
- legacy limitations。
- redirect manifest。
- no service role。
- rollback posture。

## 32.2 Architecture

更新：

```text
docs/architecture.md
```

加入：

- Phase 9 migration pipeline。
- provenance。
- manifest。
- import auth。
- asset flow。
- idempotency。
- source-to-target mapping。
- rollback boundary。

## 32.3 Deployment readiness

更新：

```text
docs/deployment-readiness.md
```

加入：

- migrated content count baseline。
- legacy object cleanup deferred。
- redirect manifest deployment requirement。
- migration provenance backup。
- staging import rehearsal。
- content freeze requirement。

## 32.4 Migration runbook

建立：

```text
docs/phase9-migration-runbook.md
```

內容：

- prerequisites。
- env。
- discover。
- inventory。
- normalize。
- dry-run。
- apply。
- resume。
- verify。
- rollback-test。
- troubleshooting。
- cleanup。
- no-secret handling。

## 32.5 Redirect plan

建立：

```text
docs/redirect-plan.md
```

內容：

- manifest format。
- deployment platform options。
- 301／410。
- loop／chain validation。
- acceptance。
- activation deferred。


---

# 33. Phase 9 Completion Report

建立：

```text
outputs/phase-9-completion-report.md
```

至少包含：

## 33.1 Execution summary

- status。
- starting HEAD。
- Phase 8 exact commit。
- final HEAD。
- tag。
- source base URL／source modes。
- discovered count。
- imported count。
- draft count。
- manual-review count。
- remote release。

## 33.2 Source discovery

- source URLs。
- sitemap。
- repository findings。
- legacy DB rows。
- legacy storage。
- source accessibility。
- crawl limits。
- snapshot hash。

## 33.3 Inventory

按 source kind列 count。

## 33.4 Disposition

```text
migrate
merge
redirect-only
archive
duplicate
manual-review
skip
```

## 33.5 Mapping decisions

- year。
- category。
- date。
- participants。
- plain text。
- slug。
- publication。
- static pages。
- site settings。

## 33.6 Migration

- provenance migration。
- remote application。
- tables。
- RLS。
- functions。
- grants。
- verification。

## 33.7 Import runs

- dry-run。
- apply。
- resume。
- second apply。
- run key。
- source hash。
- created。
- updated。
- skipped。
- failed。

## 33.8 Assets

- discovered。
- downloaded。
- uploaded。
- skipped。
- failed。
- bytes。
- MIME。
- object cleanup。
- legacy object status。

## 33.9 Content counts

Before／after：

- activities。
- posts。
- files。
- FAQ。
- years。
- settings。
- static pages。

Published／draft分開。

## 33.10 Reconciliation

- every source classified。
- ready imported。
- target verified。
- blocker count。
- manual-review。

## 33.11 Redirects

- total。
- 301 candidates。
- 410 candidates。
- conflicts。
- loops。
- chains。
- activation deferred。

## 33.12 Tests

- install。
- typecheck。
- build。
- preview。
- Phase 5–9。
- SQL verification。
- synthetic pipeline。
- idempotency。
- Browser sample。
- mobile。
- accessibility。
- console。
- hydration。

## 33.13 Cleanup

- fixture。
- object。
- env。
- cache。
- orphan。
- migration runs。

## 33.14 Security

- no service role。
- no Auth Admin API。
- no secrets。
- no client writes。
- no unsafe HTML。
- no public bucket。
- no path leak。
- no source token。
- no unignored cache。

## 33.15 Git

- commit。
- tag。
- push。
- remote verification。
- final status。

## 33.16 Known limitations

- manual-review。
- unavailable assets。
- legacy objects保留。
- redirects未啟用。
- static pages非CMS。
- deployment未完成。

## 33.17 Rolling Phase 10

依真實結果調整。


---

# 34. Definition of Done

只有以下全部完成，Phase 9 才算完成。

## 34.1 Baseline

- [ ] Phase 8 tag exact commit已解析。
- [ ] 最新 `main` 基準。
- [ ] working tree安全。
- [ ] remote無未處理 divergence。
- [ ] Phase 8 security不退化。

## 34.2 Source discovery

- [ ] Wix／Legacy來源已找出。
- [ ] sitemap／pages已盤點。
- [ ] repository URLs已搜尋。
- [ ] legacy DB rows已盤點。
- [ ] legacy Storage已盤點。
- [ ] source snapshot hash。
- [ ] no access bypass。

## 34.3 Inventory

- [ ] source inventory完成。
- [ ] 每項有 disposition。
- [ ] discovered count reconciliation。
- [ ] unknown items已處理。
- [ ] summary完成。

## 34.4 Manifests

- [ ] content manifest。
- [ ] asset manifest。
- [ ] static pages manifest。
- [ ] redirects manifest。
- [ ] manual-review。
- [ ] rollback manifest。
- [ ] no secrets。
- [ ] deterministic。

## 34.5 Provenance

- [ ] migration。
- [ ] tables。
- [ ] RLS。
- [ ] grants。
- [ ] fixed search_path。
- [ ] admin-only。
- [ ] source refs。
- [ ] run tracking。
- [ ] SQL verification。

## 34.6 Activities

- [ ] all eligible activities mapped。
- [ ] year。
- [ ] type。
- [ ] date。
- [ ] participants rule。
- [ ] text。
- [ ] images。
- [ ] attachments。
- [ ] videos。
- [ ] draft blocking items。
- [ ] public verification。

## 34.7 Posts

- [ ] all eligible posts mapped。
- [ ] slug。
- [ ] date。
- [ ] excerpt。
- [ ] content。
- [ ] cover。
- [ ] duplicate prevention。
- [ ] public verification。

## 34.8 Files

- [ ] standalone files mapped。
- [ ] legacy file URLs inventoried。
- [ ] private downloads migration。
- [ ] hash。
- [ ] MIME。
- [ ] filename。
- [ ] public proxy。
- [ ] no broken published file。
- [ ] legacy deletion deferred。
- [ ] rollback evidence。

## 34.9 FAQ

- [ ] mapped。
- [ ] duplicate handled。
- [ ] order。
- [ ] active state。
- [ ] public verification。

## 34.10 Years

- [ ] each available year handled。
- [ ] no duplicate academic year。
- [ ] summary。
- [ ] highlights。
- [ ] statistics only source-based。
- [ ] report relation。
- [ ] cover。
- [ ] public verification。

## 34.11 Settings／Static pages

- [ ] settings backup。
- [ ] settings merge。
- [ ] about。
- [ ] organization。
- [ ] programs。
- [ ] contact。
- [ ] no generic page CMS。
- [ ] Browser verify。
- [ ] rollback snapshot。

## 34.12 Import pipeline

- [ ] discover。
- [ ] inventory。
- [ ] normalize。
- [ ] dry-run。
- [ ] apply。
- [ ] resume。
- [ ] verify。
- [ ] rollback-test。
- [ ] second apply idempotent。
- [ ] no duplicate rows。
- [ ] no duplicate objects。

## 34.13 Reconciliation

- [ ] every source classified。
- [ ] every ready item imported／intentional skip。
- [ ] failed count 0。
- [ ] blocker count 0。
- [ ] all target refs valid。
- [ ] asset count verified。
- [ ] orphan count 0。
- [ ] manual-review remaining documented。

## 34.14 Security

- [ ] no service role。
- [ ] no Auth Admin API。
- [ ] no public bucket。
- [ ] no broad write。
- [ ] no client direct formal mutation。
- [ ] no unsafe HTML。
- [ ] no source token。
- [ ] no secret。
- [ ] no signed URL commit。
- [ ] cache ignored。
- [ ] raw dumps not staged。

## 34.15 Regression

- [ ] frozen install。
- [ ] typecheck。
- [ ] build。
- [ ] preview。
- [ ] Phase 5 PASS。
- [ ] Phase 6 PASS。
- [ ] Phase 7 PASS。
- [ ] Phase 8 PASS。
- [ ] Phase 9 PASS。
- [ ] SQL verification PASS。
- [ ] production `/supabase-test` 404。
- [ ] mock mode PASS。
- [ ] partial config PASS。

## 34.16 Browser

- [ ] source-to-target sample。
- [ ] all types。
- [ ] all years。
- [ ] all activity categories。
- [ ] images。
- [ ] downloads。
- [ ] draft isolation。
- [ ] static pages。
- [ ] mobile。
- [ ] keyboard。
- [ ] no Vue warning。
- [ ] no runtime error。
- [ ] no hydration mismatch。
- [ ] no broken asset。

## 34.17 Documentation／Git

- [ ] README。
- [ ] architecture。
- [ ] deployment readiness。
- [ ] runbook。
- [ ] redirect plan。
- [ ] completion report。
- [ ] `git diff --check`。
- [ ] secret scan。
- [ ] commit。
- [ ] tag。
- [ ] push main。
- [ ] push tag。
- [ ] remote hashes verify。
- [ ] final working tree clean或只保留已記錄使用者變更。


---

# 35. Secret and Safety Scan

Commit前搜尋：

```text
service_role
SUPABASE_SERVICE
SUPABASE_SECRET
sb_secret_
postgresql://
database_url
password=
access_token
refresh_token
authorization:
cookie:
set-cookie
signed URL
X-Wix
instance token
private key
```

程式模式搜尋：

```text
v-html
getPublicUrl
auth.role() = 'authenticated'
FOR ALL
supabase.from(
storage.from(
```

判讀：

- server legitimate usage可以。
- browser formal mutation不可。
- raw DB content `v-html`不可。
- public bucket不可。
- source cache不可 staged。
- `.env.phase9.local`不可 staged。
- manifest不含 temporary query tokens。

---

# 36. Git Release

全部 DoD 通過後：

```bash
git status --short
git diff --check
git diff --stat
git diff
```

只 stage Phase 9 相關內容。

不得盲目：

```bash
git add .
```

建議：

```bash
git add   README.md   package.json   pnpm-lock.yaml   .gitignore   .env.example   codexSteps/phase9.md   docs   migration/phase9   scripts/phase9   supabase   server   shared   types   utils   composables   components   pages   outputs/phase-9-completion-report.md
```

依實際修改調整。

Commit：

```bash
git commit -m "feat: complete Phase 9 Wix content migration"
```

Tag：

```bash
git tag phase-9-wix-content-migration-complete
```

Push：

```bash
git push origin main
git push origin phase-9-wix-content-migration-complete
```

Verify：

```bash
git status --short
git log -1 --oneline
git tag --points-at HEAD
git rev-parse HEAD
git rev-parse phase-9-wix-content-migration-complete^{commit}
git ls-remote --heads origin main
git ls-remote --tags origin phase-9-wix-content-migration-complete
git ls-remote --tags origin phase-9-wix-content-migration-complete^{}
```

Tag 與 remote main 必須指向同一個已驗收 commit。

若 push divergence：

1. fetch。
2. 分析。
3. 不 force。
4. 安全整合。
5. 重新執行受影響 regression。
6. tag只指向最終 PASS commit。

---

# 37. Phase 10 Rolling Roadmap

Phase 9 完成後，不得直接假設原 Phase 10範圍不變。

根據 migration結果評估：

## 37.1 建議 Phase 10

**Frontend Content Quality、SEO、Accessibility and Redirect Activation**

候選內容：

- manual-review清零。
- migrated text proofreading。
- image alt refinement。
- source-derived duplicate cleanup。
- redirect activation。
- canonical URLs。
- Open Graph。
- sitemap。
- robots。
- structured data。
- 404／410。
- accessibility audit。
- Lighthouse。
- performance。
- placeholder removal。
- safe Markdown設計評估。
- legacy columns／objects cleanup proposal。

## 37.2 Phase 11

CI／automated testing。

## 37.3 Phase 12

Deployment／staging／production hardening。

## 37.4 Phase 13

Backup／monitoring／operations。

## 37.5 Phase 14

Production launch／Wix cutover。

Completion report必須根據：

```text
remaining manual review
legacy file status
redirect count
content quality
asset count
performance
deployment blockers
```

滾動調整。

---

# 38. Codex 最終執行指令

請直接執行 March Out For Love Phase 9。

你已被授權完成：

- Phase 8 exact baseline verification。
- Wix／Legacy source discovery。
- public site crawl。
- source inventory。
- normalization。
- manifests。
- provenance migration。
- RLS／grants／RPC。
- active-admin migration pipeline。
- Activities／Posts／Files／FAQ／Years／Settings migration。
- static page migration。
- private asset migration。
- legacy file URL migration。
- redirect manifest。
- manual-review。
- dry-run。
- apply。
- resume。
- idempotency。
- verification。
- rollback-test。
- Browser acceptance。
- Phase 5–9 regression。
- cleanup。
- documentation。
- completion report。
- Git commit。
- tag。
- push。

不要把一般技術工作拆回給使用者，不要逐項等待確認。

必須保留 Phase 8 的：

- Server API。
- active-admin authorization。
- same-origin。
- RLS。
- private Storage。
- stable errors。
- strict mock mode。
- safe plain-text rendering。
- no service role。
- no Auth Admin API。

資訊不足時：

- 不捏造。
- 建 draft。
- 加 manual-review。
- 保留來源證據。

所有 Definition of Done 完成前，不得建立：

```text
phase-9-wix-content-migration-complete
```

完成後回報：

1. final commit hash。
2. final tag。
3. Phase 8 exact base commit。
4. source inventory counts。
5. content disposition counts。
6. imported content counts。
7. published／draft counts。
8. asset migration counts。
9. legacy file migration results。
10. manual-review remaining。
11. redirect manifest summary。
12. provenance migration／SQL verification。
13. dry-run／apply／second apply結果。
14. Phase 5–9 tests。
15. Browser acceptance。
16. cleanup／orphan scan。
17. secret scan。
18. remote push verification。
19. known limitations。
20. rolling Phase 10 recommendation。
