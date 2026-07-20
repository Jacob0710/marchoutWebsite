# March Out For Love
# Phase 8 Codex 完整專案交接與全權執行規格

> **文件用途**：將本文件直接交給 Codex，Codex 必須在目前專案最新 `main` 基準上，獨立分析、設計、實作、遷移、測試、驗收、整理文件、提交 Git、建立 tag 並推送遠端。
> **專案名稱**：March Out For Love／愛潮關懷社網站
> **專案目錄**：`C:\Users\Admin\Documents\Codex\2026-06-24\phase-1-phase-2-supabase-mock`
> **GitHub Repository**：`Jacob0710/marchoutWebsite`
> **技術棧**：Nuxt 3、Vue 3、TypeScript、Tailwind CSS、Supabase、pnpm
> **執行分支**：`main`
> **建議規格檔案位置**：`codexSteps/phase8.md`
> **Phase 名稱**：Phase 8 — Core Content Platform／核心內容平台正式化
> **規格日期**：2026-07-20

---

## 0. Codex 執行授權

### 0.1 全權執行原則

本 Phase 由 Codex 全權執行。

Codex 不需要針對一般技術決策、檔案修改、套件安裝、資料庫 migration、測試、Browser 驗收、Git commit、tag 或 push 逐項詢問使用者。

Codex被授權執行：

1. 閱讀並分析整個 repository。
2. 新增、修改、移動或刪除 Phase 8 所需的專案檔案。
3. 重構舊有 mock、repository、composable、API 與資料存取流程。
4. 安裝相容且必要的 npm／pnpm dependencies。
5. 建立並套用 Supabase migration。
6. 建立或調整 Supabase RLS、grants、functions、indexes、triggers 與 private Storage bucket。
7. 執行本機開發伺服器、production build、preview、SQL verification、smoke tests 與 Browser 驗收。
8. 建立測試資料並在測試後清理。
9. 更新 README、架構文件、環境變數範例與完成報告。
10. 在全部 Definition of Done 通過後建立 commit、tag，並 push `main` 與完成 tag 到 `origin`。
11. 自主修正實作途中發現、且直接影響 Phase 8 完成度或既有安全基線的問題。
12. 在不擴大 Phase 8 產品範圍的前提下，自主選擇最穩定、最簡單、最安全的實作方式。

### 0.2 不需要中途詢問的事項

以下事項由 Codex自行判斷：

- component、composable、server utility 與 API 的檔名和拆分方式。
- validation library 或既有 validation pattern 的選擇。
- migration 內 SQL 的具體實作。
- index、constraint、trigger、RPC 與 policy 的具體命名。
- Posts、Files、FAQ、Year Summaries、Site Settings 的管理介面排版。
- 是否移除已無使用價值的舊 client-side repository。
- 是否新增共用 content status、slug、storage、error mapper utility。
- 是否增加小型相依套件以避免自行實作安全敏感功能。
- 測試資料名稱、測試 run id、測試順序與 cleanup 實作。
- 為了 type safety、accessibility、SSR、security 或 maintainability 所需的合理重構。

### 0.3 不可自行執行的高風險事項

即使為全權執行，Codex仍不得：

1. 使用 `git reset --hard`、強制 checkout 或覆蓋使用者未提交內容。
2. force push。
3. rewrite、rebase 或 amend 使用者既有 commit。
4. 刪除正式 Supabase Auth 使用者。
5. 刪除或清空正式活動、消息、檔案、FAQ、設定或 Storage 正式資料。
6. 使用 Supabase `service_role`、secret key 或 Auth Admin API。
7. 將 secrets 寫入 Git、log、報告、測試輸出或 client bundle。
8. 更改 Supabase billing、GitHub billing、DNS、正式網域或部署平台計費設定。
9. 正式部署或切換 Wix 網站。
10. 建立尚未確認需求的多角色 RBAC、公開註冊、MFA 或複雜審核流程。
11. 為了讓測試通過而降低 RLS、授權、same-origin、validation 或 Storage 安全性。
12. 在任何 DoD 尚未通過時建立 Phase 8 complete tag。

### 0.4 發生阻塞時的處理

Codex不得因單一阻塞立即停止整個 Phase。

若遇到缺少外部登入權限、Supabase Dashboard session、環境變數或網路權限：

1. 完成所有不受該阻塞影響的工作。
2. 保留可直接執行的 migration、verification、test script 與操作指令。
3. 精確記錄：
   - 阻塞位置。
   - 已完成項目。
   - 尚未驗證項目。
   - 需要的最小外部條件。
4. 不得把未驗證項目標示為 PASS。
5. 不得建立 complete tag。
6. 若 Codex已有可用登入與權限，直接完成，不需詢問使用者。

---

# 1. 專案背景

March Out For Love／愛潮關懷社網站的原始目標：

- 展示社團形象、服務內容、活動成果與歷年資料。
- 提供主管、教師、學生與一般訪客瀏覽。
- 提供管理員登入後維護網站內容。
- 將原 Wix 網站內容最終完整搬遷到新版。
- 以免費或低成本服務為優先。
- 主要內容以民國年度 109、110、111、112、113、114 分類。
- 活動分類：
  - 一般活動：`regular`
  - 服務活動：`project`
  - 特殊活動：`exploration`
- 活動欄位包含名稱、日期、地點、參與人數、活動成果、照片、影片與附件。

公開頁面目前包含或曾規劃：

```text
/
 /about
 /organization
 /programs
 /programs/breakfast
 /programs/exploration
 /activities
 /activities/[slug]
 /news
 /news/[slug]
 /years
 /years/[year]
 /files
 /faq
 /contact
```

後台頁面目前包含或曾規劃：

```text
/admin/login
/admin/dashboard
/admin/activities
/admin/activities/create
/admin/activities/edit/[id]
/admin/posts
/admin/posts/create
/admin/posts/edit/[id]
/admin/files
/admin/categories
/admin/years
/admin/faq
/admin/settings
/admin/access
```

---

# 2. 已完成 Phase 與目前基準

## 2.1 Phase 4

已完成：

- 公開活動前台接 Supabase。
- SSR 取得 published activities。
- `/activities` 與 `/activities/[slug]`。
- draft 與不存在 slug 回傳 404。
- 未設定 Supabase 時保留 mock fallback。
- typecheck、build、SSR、hydration 與 console 驗收。

完成 tag：

```text
phase-4-supabase-public-frontend-complete
```

## 2.2 Phase 5

已完成：

- Supabase Email/Password Auth。
- HttpOnly cookie SSR session。
- server-side `requireAdmin`。
- admin_users／`is_admin()`／RLS。
- anon、non-admin、active-admin 身分隔離。
- 管理員唯讀活動後台。
- 登入與登出。
- smoke、typecheck、build、preview、Browser 驗收。

完成 commit：

```text
bb2778b feat: complete Phase 5 admin auth and read-only activities
```

完成 tag：

```text
phase-5-admin-auth-readonly-complete
```

## 2.3 Phase 6

已完成：

- Activities 完整 CRUD。
- draft／published。
- 發布與撤回。
- 私有 `activity-assets` Storage。
- 圖片與附件。
- 封面與排序。
- alt text。
- 外部影片連結。
- 公開資產 proxy。
- Server API、RLS、verification、smoke 與 Browser CRUD 驗收。
- 修正 `SECURITY DEFINER` function execute grants 等安全問題。

完成 commit：

```text
f79af10 feat: complete Phase 6 admin activity CRUD and storage
```

完成 tag：

```text
phase-6-admin-activity-crud-storage-complete
```

## 2.4 Phase 7

已完成：

- 管理員名單。
- 一次性邀請。
- raw invitation token 只顯示一次。
- DB 僅保存 SHA-256 digest。
- invitation accept／revoke。
- 管理員啟用／停用。
- self-deactivation 防護。
- last-active-admin 防護。
- concurrent deactivation 防護。
- append-only access audit。
- inactive admin 即時失去所有管理權。
- anon、non-admin、inactive-admin、active-admin 身分矩陣。
- server API、SQL verification、smoke、Browser 驗收。
- 未使用 service role 或 Auth Admin API。

完成 commit：

```text
da3f0e1 feat: complete Phase 7 admin access governance
```

完成 tag：

```text
phase-7-admin-access-governance-complete
```

Phase 7 完成後另有文件整理 commit：

```text
56189d8 docs: organize Codex specifications from Phase 3
```

Codex必須以實際最新 `main` 為準，不得假設 HEAD 等於 Phase 7 commit。

---

# 3. Phase 8 問題定義

目前專案的主要不平衡：

> Activities 已達到正式 Server API、SSR、RLS、private Storage、smoke 與 Browser 驗收標準；但 Posts、Files、FAQ、Year Summaries、Site Settings 仍多半停留在 Phase 1–4 的 mock、client repository 或不完整 schema。

Phase 8 必須解決的不只是缺少功能，而是以下架構問題。

## 3.1 舊 `supabase/schema.sql` 已過時

目前舊 schema snapshot 仍可能包含：

- `auth.role() = 'authenticated'` 即可管理 Posts、Files、FAQ、Categories、Site Settings 的寬鬆 policy。
- 公開 `activity-images` 與 `public-files` buckets。
- authenticated 使用者可直接管理 public Storage。
- 尚未反映 Phase 5、6、7 的正式安全架構。
- 若被誤用於新環境，會重新建立已被後續 Phase 淘汰的安全缺陷。

Phase 8 必須：

1. 明確以 migrations 為 source of truth。
2. 不直接把舊 `schema.sql` 套用到正式環境。
3. 將 `schema.sql` 更新為與 Phase 8 結束狀態一致的 fresh-install snapshot，或將其改為明確標示不可執行的 legacy 文件並建立新的 canonical bootstrap schema。
4. snapshot 不得包含：
   - broad authenticated write policies。
   - public content buckets。
   - service role。
   - client direct admin writes。
5. 加入自動或 SQL verification，避免 snapshot 再次與 migrations 漂移。

## 3.2 舊 `useAdminRepository.ts` 仍允許 client direct writes

舊 repository 直接從瀏覽器執行：

```text
supabase.from('posts').insert/update/delete
supabase.from('files').insert/delete
supabase.from('faq').insert/delete
supabase.from('site_settings').insert/update
supabase.storage.from(...).upload
```

並可能直接拋出 Supabase raw error。

Phase 8 必須：

- Posts、Files、FAQ、Year Summaries、Site Settings 的正式管理 mutation 全部改走 Nitro Server API。
- client 端只透過 `$fetch` 或等價 API client 呼叫。
- 所有 API 重新執行 active-admin server authorization。
- mutation 全部 same-origin。
- 不回傳 raw Supabase error。
- 不把 RLS 當作唯一 API authorization。
- `useAdminRepository.ts` 若已無需要則刪除。
- 若 mock mode 仍需 repository，拆成明確的 mock-only repository，不得與 production Supabase direct write 混用。

## 3.3 Supabase 模式下存在靜默 mock fallback 風險

目前舊模式可能在：

- Supabase 已設定但查詢沒有資料。
- 查詢失敗。
- `site_settings` 找不到 row。

仍回傳 mock data。

這會使正式網站顯示假資料並掩蓋資料庫錯誤。

Phase 8 必須建立明確規則：

```text
Supabase env 完全未設定
→ mock mode

Supabase env 已設定
→ Supabase mode
→ query failure 必須顯示可診斷錯誤或正確 HTTP error
→ 不得靜默切回 mock
```

## 3.4 主要內容模組尚未正式化

尚需完成：

- Posts。
- Download Files。
- FAQ。
- Year Summaries。
- Site Settings。
- 首頁對上述正式資料的整合。
- 相關 migration、RLS、Storage、API、SSR、admin UI、測試與文件。

---

# 4. Phase 8 任務目標

Phase 8 完成後，網站必須從：

```text
Activities 正式化
+ 其他內容多為 mock／舊 client CRUD
```

提升為：

```text
Activities
+ Posts
+ Files
+ FAQ
+ Year Summaries
+ Site Settings

全部具備正式：
- Supabase schema
- migration
- RLS
- server-side authorization
- Server API
- SSR public reads
- private Storage
- validation
- stable error contract
- smoke tests
- Browser acceptance
- documentation
```

Phase 8 必須完成：

1. Posts 完整 CRUD。
2. Posts draft／published／unpublish。
3. Posts cover image private Storage。
4. Posts 公開 SSR 列表與詳情。
5. Files metadata、upload、replace、publish、unpublish、delete。
6. Files private Storage 與公開 download proxy。
7. FAQ CRUD、排序、啟用／停用。
8. Year Summaries CRUD、draft／published、SSR。
9. Site Settings singleton 管理。
10. 首頁改用正式 Posts、Year Summaries、Site Settings。
11. 鎖定或移除舊 client direct-write 路徑。
12. 修正既有 Posts、Files、FAQ、Settings 的危險 RLS／grants。
13. 處理未使用的 Categories 安全問題。
14. 更新 schema snapshot。
15. Phase 5、6、7 全量 regression。
16. Phase 8 SQL verification、API smoke、Browser acceptance。
17. README、architecture、operations 文件更新。
18. 完成報告、commit、tag 與 push。

---

# 5. Phase 8 明確範圍

## 5.1 In scope

### Content modules

- Posts／最新消息。
- Files／下載中心。
- FAQ。
- Year Summaries／年度成果。
- Site Settings。
- 首頁正式資料整合。

### Architecture

- migration。
- schema snapshot reconciliation。
- RLS。
- grants。
- indexes。
- constraints。
- triggers。
-必要的 atomic database functions。
- private Storage。
- Server API。
- shared server/client validation schema。
- stable error mapping。
- SSR public reads。
- mock/Supabase mode separation。

### Admin UI

- 列表。
- 新增。
- 編輯。
- 刪除。
- 發布／撤回。
- 上傳／替換／移除。
- loading、empty、error state。
- accessible confirmation。
- mobile layout。
- unsaved change protection。

### Quality

- typecheck。
- build。
- preview。
- Phase 5 regression。
- Phase 6 regression。
- Phase 7 regression。
- Phase 8 smoke。
- Browser acceptance。
- hydration／console checks。
- secret scan。
- cleanup verification。

### Documentation

- README。
- architecture。
- deployment readiness。
- migration order。
- environment variables。
- Phase 8 completion report。
- rolling next-phase roadmap。

## 5.2 Out of scope

Phase 8 不實作：

- Wix 全量內容匯入。
- 正式部署。
- DNS 或網域切換。
- GitHub Actions CI/CD。
- OAuth。
- MFA。
- 忘記密碼。
- 公開註冊。
- Auth user 自動建立／刪除。
- Supabase Auth Admin API。
- service role。
- editor／reviewer／super-admin 等 RBAC。
- 多階段內容審核。
- Realtime。
- 多語系。
- 電子報。
- 聯絡表單寄信。
- 站內全文搜尋。
- Analytics dashboard。
- 直接影片上傳。
- Rich Text WYSIWYG editor。
- 完整 Wix redirect。
- 大規模視覺重設計。
- Phase 9 之後功能。

---

# 6. 開始前必要檢查

Codex開始修改前必須執行並記錄：

```bash
cd C:\Users\Admin\Documents\Codex\2026-06-24\phase-1-phase-2-supabase-mock

git status --short
git branch --show-current
git rev-parse HEAD
git log --oneline --decorate -15
git tag --points-at HEAD
git tag --list "phase-*"
git remote -v

node --version
pnpm --version
```

必須確認：

1. branch 為 `main`。
2. Git history 包含：
   - `f79af10`
   - `da3f0e1`
   - `phase-7-admin-access-governance-complete`
3. 若 HEAD 為 `56189d8` 或其後合法 commit，必須保留。
4. 不得 reset 到 Phase 7 tag。
5. 不得刪除使用者後續文件整理。
6. 若 working tree 有未提交內容：
   - 判斷是否為使用者變更。
   - 記錄檔案。
   - 不得直接 restore、clean 或覆蓋。
7. 確認 `origin` 指向：
   - `Jacob0710/marchoutWebsite`
8. 確認本機與遠端 main 的 ahead／behind 狀態。
9. 若 remote 有新 commit，先安全 fetch 並分析，不得直接覆蓋本機。

建議執行：

```bash
git fetch --tags origin
git status -sb
git log --oneline --decorate --graph --all -20
```

---

# 7. 必須閱讀的檔案

Codex開始設計前必須閱讀完整內容，而不是只閱讀檔名。

## 7.1 Project baseline

```text
README.md
package.json
pnpm-lock.yaml
nuxt.config.ts
tsconfig.json
tailwind.config.ts
.env.example
.gitignore
AGENTS.md（若存在）
```

## 7.2 Phase specifications and reports

```text
codexSteps/phase3.md
codexSteps/phase4.md
codexSteps/phase5.md
codexSteps/phase6.md
codexSteps/phase7.md

outputs/phase-5-completion-report.md
outputs/phase-6-completion-report.md
outputs/phase-7-completion-report.md
```

若檔名不同，搜尋等價文件。

## 7.3 Types and data mapping

```text
types/content.ts
types/supabase.ts
types/adminAccess.ts
utils/mockData.ts
utils/supabaseMappers.ts
shared/schemas/
```

## 7.4 Existing content access

```text
composables/useMockContent.ts
composables/useAdminRepository.ts
composables/usePublicActivities.ts
composables/useAdminActivities.ts
composables/useAdminAuth.ts
composables/useAdminAccess.ts
```

## 7.5 Public pages

```text
pages/index.vue
pages/news/index.vue
pages/news/[slug].vue
pages/files.vue
pages/faq.vue
pages/years/index.vue
pages/years/[year].vue
pages/programs/
pages/contact.vue
```

## 7.6 Admin pages and components

```text
pages/admin/posts/
pages/admin/files.vue
pages/admin/faq.vue
pages/admin/years.vue
pages/admin/settings.vue
pages/admin/categories.vue
components/admin/
components/layout/AdminSidebar.vue
```

## 7.7 Auth and server security

```text
middleware/admin-auth.global.ts
server/middleware/admin-auth.ts
server/utils/requireAdmin.ts
server/utils/apiErrors.ts
server/utils/
server/api/admin/
server/api/auth/
```

實際檔名不同時，搜尋 `requireAdmin`、`assertSameOrigin`、`no-store`、`createServerSupabaseClient` 等實作。

## 7.8 Supabase

```text
supabase/schema.sql
supabase/migrations/
supabase/verify-*.sql
```

必須逐一分析 Phase 5、6、7 migration 的：

- table。
- function。
- trigger。
- RLS。
- grants。
- Storage policies。
- function execute grants。
- search_path。
- role assumptions。

## 7.9 Tests

```text
scripts/phase5-auth-smoke.mjs
scripts/phase6-admin-crud-smoke.mjs
scripts/phase7-admin-access-smoke.mjs
```

必須沿用既有：

- env loading。
- cookie handling。
- identity setup。
- error reporting。
- cleanup。
- test run id。
- no-secret logging pattern。

---

# 8. Phase 8 核心架構原則

## 8.1 Migration-first

- 已套用 migration 不得修改。
- 新變更使用新 migration。
- 建議檔名：

```text
supabase/migrations/20260720_001_phase8_core_content_platform.sql
```

若該 timestamp 已存在，使用下一個未使用的時間序列。

- migration 盡可能 transaction-wrapped。
- 不得 drop 並重建正式 table。
- 現有資料必須保留。
- schema 演進必須 backward-aware。
- rename 或 data transformation 必須先 backfill，再加 constraint。
- migration 需可在目前遠端 schema 上成功執行。
- 不要求 migration 本身可重複套用；verification 必須可安全重複執行。

## 8.2 Server API-first

正式 admin mutation 必須：

```text
Browser
→ Nuxt $fetch
→ Nitro Server API
→ requireAdmin(event)
→ same-origin
→ server-side validation
→ Supabase user-scoped client
→ RLS／RPC
```

不得：

```text
Browser
→ supabase.from(...).insert/update/delete
```

## 8.3 RLS is mandatory but not the only layer

每個管理 API 都要：

1. server authorization。
2. active admin check。
3. same-origin mutation protection。
4. validation。
5. RLS。
6. minimum grants。

不得只依賴 client middleware 或按鈕隱藏。

## 8.4 No service role

Nuxt runtime 不得加入：

```text
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEY
service_role
supabase.auth.admin.*
```

所有正式操作維持：

- public anon key。
- authenticated user JWT。
- RLS。
- 最小權限 fixed-search-path `SECURITY DEFINER` function。

## 8.5 Private Storage

所有新內容資產：

- bucket 必須 private。
- DB 只保存 storage path。
- 不保存 signed URL。
- 不使用永久 public URL。
- 公開讀取經 server proxy 或短效 server-issued signed URL。
- 管理員 upload／delete 經 Server API。
- path 不接受 client 任意輸入。

## 8.6 No unsafe HTML rendering

- 不得直接對管理員輸入的 `content` 使用未經處理的 `v-html`。
- Phase 8 可使用純文字、多段落文字或安全 Markdown。
- 若使用 Markdown，必須：
  - 使用維護中的 parser。
  - 禁止 raw HTML，或經可靠 sanitizer。
  - 阻擋 script、event handler、javascript URL。
- 不得為了排版直接信任 DB HTML。

## 8.7 Stable error contract

API 不得回傳：

- raw Postgres error。
- raw Supabase error。
- SQL function name。
- table／column internal details。
- stack trace。
- bucket internal path。
- token、cookie、JWT。

建議格式：

```ts
interface ApiErrorResponse {
  statusCode: number
  code: string
  message: string
  fieldErrors?: Record<string, string>
}
```

Admin UI 顯示安全、可操作的錯誤訊息。

Server log 可保留安全的 correlation id 與 sanitized internal context，但不得輸出 secret。

---

# 9. 資料模型與 Migration 規格

Codex必須先檢查目前遠端與 migration 實際 schema，再以 non-destructive migration 調整。

## 9.1 共用欄位與規則

Content status：

```text
draft
published
```

規則：

- `published` 必須有 `published_at`。
- `draft` 可讓 `published_at` 為 null。
- unpublish 後可保留歷史 `published_at` 或清空；Codex需選擇一致策略並寫入文件。
- 建議使用 DB constraint 保證狀態一致。
- `updated_at` 使用共用 trigger。
- `created_by`／`updated_by` 由 server 或 DB 根據 `auth.uid()` 決定，不接受 client 直接指定。
- 所有 string 欄位 server-side trim。
- 空字串依欄位轉 null 或拒絕。
- UUID path 參數必須 validation。

## 9.2 Posts

目標欄位至少包含：

```text
id uuid primary key
title text not null
slug text not null unique
excerpt text
content text not null
status text not null
published_at timestamptz
cover_storage_path text
cover_alt text
is_featured boolean not null default false
created_at timestamptz not null
updated_at timestamptz not null
created_by uuid
updated_by uuid
```

建議限制：

```text
title: 1–160
slug: 1–180
excerpt: 0–500
content: 1–100000
cover_alt: 0–300
```

Slug：

- lowercase。
- trim。
- 空白轉 `-`。
- 移除不安全字元。
- 合併重複 `-`。
- 不可為保留字。
- DB unique。
- conflict 回傳穩定 `POST_SLUG_CONFLICT`。
- 修改既有 slug 時不得影響其他 post。

Indexes 至少考慮：

```text
unique(slug)
(status, published_at desc)
(is_featured, published_at desc)
```

Public rule：

```text
status = 'published'
and published_at is not null
and published_at <= now()
```

## 9.3 Files

現有 `files` table 可能保存 public URL。Phase 8 必須安全演進為 metadata + private storage path。

目標欄位至少包含：

```text
id uuid primary key
title text not null
description text
academic_year int
category text
storage_path text
original_filename text
mime_type text
size_bytes bigint
status text not null
published_at timestamptz
sort_order int not null default 0
created_at timestamptz not null
updated_at timestamptz not null
created_by uuid
updated_by uuid
```

舊欄位處理：

- 不得直接刪除尚有資料的 `file_url`。
- 先盤點現有 rows。
- 若皆為 mock／無正式資料，可安全 migration。
- 若已有正式資料：
  - 保留 legacy 欄位。
  - 建立 migration status。
  - 不把 public URL 自動假設成可搬移的 storage path。
  - 在完成報告列出待 Phase 9 搬移項目。
- 新上傳不得再寫 public URL。

允許格式必須使用 server-side allowlist。

最低建議：

```text
application/pdf
application/vnd.openxmlformats-officedocument.wordprocessingml.document
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
application/vnd.openxmlformats-officedocument.presentationml.presentation
text/plain
image/jpeg
image/png
```

可依實際舊站檔案需求增加，但必須記錄理由。

預設禁止：

```text
text/html
image/svg+xml
application/javascript
text/javascript
application/x-sh
application/x-msdownload
```

檔案驗證：

- MIME。
- extension。
- size。
- empty file。
- filename。
- server-side metadata。
- path ownership。
- bucket。
- content-disposition injection。

檔案大小上限由 Codex依 Supabase 與專案需求決定，建議 20–50 MB，並在 UI、API、文件、測試中保持一致。

Storage path 建議：

```text
files/{file-record-id}/{uuid}.{safe-extension}
```

不得使用：

```text
../../
client supplied full path
raw email
raw original filename as unique key
```

## 9.4 FAQ

目標欄位：

```text
id uuid primary key
question text not null
answer text not null
sort_order int not null default 0
is_active boolean not null default true
created_at timestamptz not null
updated_at timestamptz not null
created_by uuid
updated_by uuid
```

現有 `is_visible` 可：

- 保留並統一命名。
- 或 non-destructive rename／new column backfill。

Codex需選擇較安全、較少破壞既有 mapper 的方案。

建議限制：

```text
question: 1–300
answer: 1–10000
sort_order >= 0
```

排序：

- 必須 server-side validation。
- reorder request 必須驗證：
  - UUID 不重複。
  - 所有指定 row 存在。
  - 不可包含非管理資料。
- 可採 transaction RPC 確保排序原子性。
- 不得 client 逐筆更新造成半完成排序。

## 9.5 Year Summaries

目前可能沒有正式 table。建立：

```text
year_summaries
```

目標欄位：

```text
id uuid primary key
academic_year int not null unique
title text not null
theme text
summary text not null
highlights jsonb not null default '[]'
statistics jsonb not null default '[]'
cover_storage_path text
cover_alt text
report_file_id uuid
status text not null
published_at timestamptz
sort_order int not null default 0
created_at timestamptz not null
updated_at timestamptz not null
created_by uuid
updated_by uuid
```

Academic year：

- 目前主要資料為 109–114。
- schema 不得限制只能 109–114。
- 建議合理範圍，例如 90–200，或依專案實際邏輯設定。
- DB unique。
- route `/years/[year]` 使用整數 validation。

`highlights` 建議 schema：

```ts
string[]
```

`statistics` 建議 schema：

```ts
Array<{
  label: string
  value: string
}>
```

DB 至少檢查 JSONB type 為 array；完整結構由 server validation。

Cover：

- 可與 Posts 共用 private content-image bucket，使用 namespace。
- 或建立 private `year-assets` bucket。
- 由 Codex依現有 Storage utility 重用程度決定。
- 不得 public bucket。

Report：

- 優先透過 `files` table relation。
- 不重複建立另一套公開附件系統。
- `report_file_id` 只能指向 published file 才能公開顯示。
- 若 relation 造成 Phase 8 過度複雜，可先保留 nullable 並記錄。

## 9.6 Site Settings

現有 table 使用 UUID 並可能允許多筆。Phase 8 必須建立 singleton invariant。

目標欄位至少涵蓋：

```text
id uuid primary key
site_name text
club_name_zh text
club_name_en text
slogan text
hero_title text
hero_subtitle text
about_summary text
logo_storage_path text
facebook_url text
instagram_url text
youtube_url text
contact_text text
email text
phone text
map_locations jsonb
default_seo_title text
default_seo_description text
footer_text text
created_at timestamptz
updated_at timestamptz
updated_by uuid
```

Singleton：

- 保留現有最早或正式 row。
- 若有多筆，Codex不得直接刪除未知正式資料。
- 必須先產出盤點。
- 若只有 mock／測試 row，可安全合併。
- 使用 constant unique index、singleton key constraint 或其他可靠 DB invariant，確保最多一筆。
- Server API 使用 update/upsert singleton。
- client 不得建立第二筆。

Site Settings 不可保存：

- Supabase key。
- SMTP password。
- Auth secret。
- private email distribution list。
- internal token。
- webhook secret。
- database URL。

所有欄位都視為公開內容。

## 9.7 Categories

Phase 8 不建立可任意管理的 taxonomy system。

活動分類保持：

```text
regular
project
exploration
```

Codex必須：

1. 檢查 `categories` table 是否仍存在。
2. 檢查是否有 broad authenticated mutation policy。
3. 移除一般 authenticated user 的寫入能力。
4. 若目前沒有實際引用：
   - 保留 table 但封鎖 mutation，或
   - 在確認無資料、無 FK、無引用後以 migration 移除。
5. 不得為了保留舊 UI 而留下不安全 CRUD。
6. `/admin/categories`：
   - 改成唯讀分類說明，或
   - 從 sidebar 移除。
7. 在 completion report 記錄最終決策。

---

# 10. RLS、Grants 與 Database Functions

## 10.1 所有 Phase 8 table 必須啟用 RLS

至少：

```text
posts
files
faq
year_summaries
site_settings
categories（若保留）
```

## 10.2 Public select

Public select 只允許：

```text
posts: published
files: published
faq: active
year_summaries: published
site_settings: public singleton row
categories: read-only only if public page still requires
```

不得允許：

- public draft。
- public storage metadata internal fields。
- public arbitrary table mutation。

## 10.3 Admin mutation

active admin 判定必須沿用 Phase 7 的：

```sql
public.is_admin()
```

或 Phase 7 等價 active-admin check。

不得建立：

```sql
auth.role() = 'authenticated'
```

即可寫入的 policy。

不得建立：

```sql
FOR ALL USING (true)
```

## 10.4 Grants

必須明確：

- revoke public／anon direct write。
- revoke authenticated direct write，除非某個受控 RPC 必須。
- authenticated 只取得必要 function execute。
- function execute 不得授予 public／anon，除非是明確設計的 public read function。
- public read應盡量使用 select policy，不使用高權限 definer function。
- Storage objects 的 write 不開放給 client authenticated role。

## 10.5 SECURITY DEFINER

任何 `SECURITY DEFINER` function：

- 固定 `search_path`。
- schema-qualified references。
- validation caller identity。
- 不接受 client 提供任意 user id 作為 actor。
- 不接受任意 table 或 path。
- 最小 execute grants。
- 不回傳敏感欄位。
- 不提供繞過 active-admin 的通道。

## 10.6 Atomic operations

建議使用 RPC 的操作：

- FAQ reorder。
- Site Settings singleton update。
- File metadata + publish state transition（必要時）。
- Post publish／unpublish（若要保證 timestamp invariant）。
- Year publish／unpublish。
- Storage cleanup 不能與 DB 完整 transaction 時，使用 server compensation workflow。

---

# 11. Storage 規格

## 11.1 Bucket 策略

Codex可選擇：

### 方案 A：共用 private content bucket

```text
content-assets
```

namespace：

```text
posts/
years/
site/
```

Files 使用獨立：

```text
downloads
```

### 方案 B：各模組 private bucket

```text
post-assets
year-assets
site-assets
downloads
```

選擇原則：

- 少量 bucket。
- 清楚 ownership。
- 容易寫 policy。
- 容易 cleanup。
- 不降低隔離性。
- 與 Phase 6 `activity-assets` 保持一致模式。

無論選哪一方案：

- `public = false`。
- 不建立 public read storage policy。
- DB 保存 path。
- 公開讀取走 Nuxt endpoint。
- 管理 write 走 server。
- 不使用永久 signed URL。

## 11.2 Upload validation

所有 upload：

- multipart body size limit。
- MIME allowlist。
- extension allowlist。
- filename sanitize。
- random object key。
- duplicate-safe。
- empty file deny。
- missing content type deny或安全 fallback。
- image dimension／decode validation 在可行範圍內完成。
- SVG 禁止。
- server 不信任 client MIME。

## 11.3 Proxy endpoints

建議：

```text
GET /api/public/assets/posts/:postId/cover
GET /api/public/assets/years/:yearId/cover
GET /api/public/assets/site/logo
GET /api/public/files/:fileId/download
```

可依既有 Phase 6 proxy pattern調整。

Proxy 必須：

- 查詢 DB metadata。
- 確認 content 為 published／public。
- 從 DB 取得 storage path。
- 不接受 query 傳任意 path。
- 設定正確 content type。
- 設定安全 cache。
- 下載 endpoint 使用安全 `Content-Disposition`。
- 防止 CRLF injection。
- 不洩漏 bucket path。
- 不公開 draft asset。
- 404 與 permission denial 不洩漏 existence 差異。

## 11.4 Delete／replace compensation

Replace：

1. 上傳新物件。
2. 驗證成功。
3. 更新 DB path。
4. DB 成功後刪除舊物件。
5. 若 DB 更新失敗，刪除新物件。
6. 若舊物件刪除失敗：
   - 不回滾已成功的新資料。
   - 記錄 orphan cleanup。
   - 提供可重試 cleanup。

Delete：

1. 讀取 metadata。
2. 執行 DB delete／soft delete 策略。
3. 清理 Storage。
4. 部分失敗需穩定錯誤與補償。
5. 不得刪除其他 record 的 object。

---

# 12. Server API 規格

實際 route 命名可依 Nuxt file-based API 調整，但功能必須完整。

所有 admin response：

```http
Cache-Control: private, no-store
```

所有 mutation：

- `requireAdmin(event)`。
- same-origin。
- request body size limit。
- schema validation。
- stable errors。
- no raw Supabase errors。

## 12.1 Posts

```text
GET    /api/admin/posts
POST   /api/admin/posts
GET    /api/admin/posts/:id
PATCH  /api/admin/posts/:id
DELETE /api/admin/posts/:id

POST   /api/admin/posts/:id/publish
POST   /api/admin/posts/:id/unpublish

POST   /api/admin/posts/:id/cover
DELETE /api/admin/posts/:id/cover
```

List 支援：

- status。
- search。
- page／limit 或合理單頁數量。
- stable order。

Create：

- 預設 draft。
- slug conflict。
- 不接受 created_by。
- 不自動 published，除非 request 明確且經 publish endpoint。

Delete：

- confirmation 在 UI。
- server確認 UUID 與 record。
- cleanup cover。
- not found 回穩定錯誤。

## 12.2 Files

```text
GET    /api/admin/files
POST   /api/admin/files
GET    /api/admin/files/:id
PATCH  /api/admin/files/:id
DELETE /api/admin/files/:id

POST   /api/admin/files/:id/upload
POST   /api/admin/files/:id/replace
POST   /api/admin/files/:id/publish
POST   /api/admin/files/:id/unpublish

GET    /api/public/files/:id/download
```

Codex可把 metadata create 與 upload 合併為單一 transaction-like flow，但必須有補償機制。

Publish 前必須確認：

- storage path 存在。
- original filename 有效。
- mime type 有效。
- size > 0。

## 12.3 FAQ

```text
GET    /api/admin/faq
POST   /api/admin/faq
GET    /api/admin/faq/:id
PATCH  /api/admin/faq/:id
DELETE /api/admin/faq/:id
POST   /api/admin/faq/reorder
```

FAQ 可直接以 `isActive` mutation，不需要獨立 publish endpoint。

## 12.4 Year Summaries

```text
GET    /api/admin/years
POST   /api/admin/years
GET    /api/admin/years/:id
PATCH  /api/admin/years/:id
DELETE /api/admin/years/:id

POST   /api/admin/years/:id/publish
POST   /api/admin/years/:id/unpublish

POST   /api/admin/years/:id/cover
DELETE /api/admin/years/:id/cover
```

## 12.5 Site Settings

```text
GET   /api/admin/settings
PATCH /api/admin/settings
```

不得提供：

```text
POST /api/admin/settings
DELETE /api/admin/settings
```

除非內部實作使用安全 singleton upsert，但外部 API 語意仍應為讀取與更新。

## 12.6 Public content

公開頁可直接 server-side query，也可建立：

```text
GET /api/public/posts
GET /api/public/posts/:slug
GET /api/public/files
GET /api/public/faq
GET /api/public/years
GET /api/public/years/:year
GET /api/public/settings
```

Codex應依 Nuxt SSR架構選擇：

- server composable 直接 query。
- internal API。

避免 server-side page 再經外部 HTTP 呼叫自己造成額外成本。

---

# 13. Public SSR 規格

必須正式化：

```text
/
 /news
 /news/[slug]
 /files
 /faq
 /years
 /years/[year]
```

## 13.1 SSR requirements

- 直接輸入 URL 重新整理可取得正確 HTML。
- 不先輸出 mock，再 hydration 換成 Supabase。
- published 資料才公開。
- draft／inactive／unpublished 回真正 404。
- 不存在 route data 回真正 404。
- DB 失敗不回 mock。
- 無 hydration mismatch。
- 不在 client bundle 暴露管理欄位。
- SEO title／description 在 SSR 階段可用。

## 13.2 `/news`

列表：

- published posts。
- published_at desc。
- cover proxy。
- excerpt。
- empty state。
- pagination 可視資料量決定。
- 不顯示 draft。

詳情：

- slug query。
- published only。
- safe content rendering。
- cover alt。
- 正確 404。
- metadata。

## 13.3 `/files`

- published files。
- academic year filter。
- category filter。
- safe filename。
- download button 指向 proxy。
- 不輸出 storage path。
- 不直接連 public bucket。

## 13.4 `/faq`

- active FAQ。
- sort_order asc。
- keyboard accessible accordion。
- button 與 `aria-expanded`。
- 內容可在無 JavaScript 時合理閱讀。

## 13.5 `/years`

列表：

- published years。
- academic_year desc 或明確 sort_order。
- cover。
- theme／summary。

詳情：

- integer year。
- published only。
- highlights。
- statistics。
- report file。
- 404。

## 13.6 首頁

Supabase mode 下必須使用：

- published featured activities。
- published featured／latest posts。
- published year summaries。
- site settings。
- 現有 Programs 可暫時保留靜態內容。
- 不得混入 mockPosts、mockYearSummaries 或 mock siteSettings。

---

# 14. Admin UI 規格

Codex不需重新設計整個網站，但必須讓所有核心流程可用、可理解、可存取。

## 14.1 共用 UI requirements

- active admin only。
- SSR／server authorization。
- loading state。
- empty state。
- field error。
- request error。
- success feedback。
- disabled submit during mutation。
- duplicate submit protection。
- delete confirmation。
- publish confirmation。
- unsaved changes protection。
- keyboard navigation。
- focus management。
- mobile 390 × 844 可操作。
- desktop table 不得造成不可操作 overflow。
- date／year 顯示符合台灣使用情境。
- 不在 UI 顯示 storage path 或 internal error。

## 14.2 Posts

列表：

- title。
- slug。
- status。
- published_at。
- featured。
- updated_at。
- edit。
- publish／unpublish。
- delete。
- search。
- status filter。

表單：

- title。
- slug。
- excerpt。
- content。
- cover。
- cover alt。
- featured。
- save draft。
- publish。
- validation。
- slug conflict。

## 14.3 Files

列表：

- title。
- original filename。
- academic year。
- category。
- size。
- status。
- updated_at。
- download test。
- publish／unpublish。
- replace。
- delete。

表單：

- metadata。
- drag/drop 非必要；標準 file input 即可。
- upload progress。
- type／size提示。
- validation。
- replacement confirmation。

## 14.4 FAQ

- question。
- answer。
- active。
- reorder。
- edit。
- delete。
- reorder 失敗不得讓畫面與 DB 永久不同步。
- keyboard 可操作排序；若 drag-and-drop 不具 accessibility，提供上下移按鈕。

## 14.5 Years

- academic year。
- title。
- theme。
- summary。
- highlights。
- statistics。
- cover。
- report file relation。
- status。
- publish／unpublish。
- unique year error。

## 14.6 Settings

分區建議：

```text
Brand
Homepage
About
Contact
Social
Map locations
SEO
Footer
```

必須：

- 只編輯 singleton。
- URL validation。
- email validation。
- map locations JSON 不直接讓一般管理員編輯 raw JSON；使用重複欄位 UI。
- logo upload若納入 Phase 8，使用 private Storage proxy。
- required brand fields 不可被空白覆寫。

## 14.7 Categories

若保留頁面：

- 顯示三個固定活動分類。
- 顯示用途說明。
- 不提供新增、刪除或修改。

---

# 15. TypeScript 與程式品質

## 15.1 Shared types

避免 admin、public、DB row、API DTO 共用一個過度寬鬆 type。

建議區分：

```text
Database row
Domain model
Admin input
Admin response DTO
Public response DTO
```

禁止大量使用：

```ts
any
as unknown as
Partial<T> 作為所有 mutation input
```

Create／Update 應有明確 schema。

## 15.2 Validation

可沿用 Phase 7 shared schema pattern。

至少 validation：

- body。
- path UUID。
- slug。
- year。
- pagination。
- search length。
- content lengths。
- URL。
- email。
- file metadata。
- reorder payload。
- JSON arrays。

## 15.3 Package scripts

更新 `package.json`，至少加入：

```json
{
  "typecheck": "nuxi typecheck",
  "test:phase8": "node --env-file-if-exists=.env.phase6.local scripts/phase8-core-content-smoke.mjs"
}
```

若新增 lint 基線可加入：

```json
{
  "lint": "..."
}
```

但不得為了加入 lint 進行無關的大規模格式化。若 Nuxt 相容 ESLint 導入成本過高，可記錄並延後 Phase 11。

## 15.4 Dependency policy

- 使用 pnpm。
- `pnpm install --frozen-lockfile` 最終必須通過。
- 新套件需有明確用途。
- 不升級 Nuxt／Vue／Supabase major version，除非目前版本存在直接阻塞或安全問題。
- 不同時做 framework upgrade 與 Phase 8 content migration。
- 不加入中國大陸來源的專用軟體或服務。
- 不加入不必要的 UI framework。

---

# 16. Mock Mode 與 Supabase Mode

## 16.1 明確 mode detection

建立單一 source of truth：

```ts
isSupabaseConfigured
contentDataMode: 'mock' | 'supabase'
```

條件：

```text
URL 與 anon key 都未設定
→ mock

URL 或 anon key 只設定一個
→ configuration error

URL 與 anon key 都設定
→ supabase
```

## 16.2 Mock mode

允許：

- public 展示。
- 本機 UI 開發。
- 不需要 Auth 的內容瀏覽。

Admin mock mutation 是否保留由 Codex判斷，但必須：

- 明確標示 mock mode。
- 不與正式 Supabase API 混淆。
- 不讓 production env 靜默使用 mock。
- 不把 mock Admin 功能誤認為已通過正式安全驗收。

建議：

- 正式 admin route 在無 Supabase 時顯示 configuration required。
- public pages 才保留 mock fallback。

## 16.3 Supabase mode

- 所有正式資料從 Supabase。
- query failure 顯示 error。
- 空 table 顯示 empty state。
- 不回 mock。
- settings 無 row 時回清楚 configuration state，或透過 migration seed 建立 singleton。
- 不在 client hydration 階段改換資料來源。

---

# 17. Schema Snapshot 整理

Phase 8 必須處理 `supabase/schema.sql`。

允許兩種完成方式。

## 17.1 建議方式：canonical fresh-install snapshot

更新：

```text
supabase/schema.sql
```

使其代表 Phase 8 完成後的新環境完整 schema。

必須包含：

- Phase 5 admin auth。
- Phase 6 activities／assets。
- Phase 7 admin governance。
- Phase 8 content platform。
- current RLS。
- current grants。
- private buckets。
- current functions。
- current triggers。

檔案頂部標示：

```text
This file is a fresh-install snapshot.
Existing environments must use migrations.
Do not apply this snapshot over an existing project.
```

## 17.2 次選方式：deprecate legacy snapshot

若建立完整 snapshot 風險過高：

1. 將舊檔改名：

```text
supabase/legacy-schema-do-not-run.sql
```

2. 新增：

```text
supabase/README.md
```

說明 migrations 是唯一 source of truth。

3. 建立：

```text
supabase/bootstrap/
```

或明確的新 fresh-install 流程。

無論哪個方式，舊有 insecure policy 與 public bucket 不得繼續以「目前建議 schema」形式存在。

---

# 18. SQL Verification

建立：

```text
supabase/verify-phase8-core-content.sql
```

必須可安全重複執行，且不破壞正式資料。

驗證至少包含：

## 18.1 Schema

- tables 存在。
- columns 型別。
- defaults。
- not null。
- checks。
- foreign keys。
- unique constraints。
- indexes。
- singleton invariant。
- JSONB type constraints。

## 18.2 RLS

- 所有 table RLS enabled。
- public policies 只讀 published／active。
- no broad authenticated write。
- active-admin policy 使用 `is_admin()` 或等價。
- inactive admin denied。
- anon write denied。
- non-admin write denied。

## 18.3 Grants

- public／anon 無 direct write。
- authenticated 無危險 direct write。
- function execute 最小化。
- no `BYPASSRLS`。
- no service role usage。
- no public storage write。

## 18.4 Functions

- `SECURITY DEFINER` fixed search_path。
- owner 合理。
- execute grants。
- self actor。
- publish invariants。
- singleton。
- FAQ reorder atomic。

## 18.5 Storage

- Phase 8 buckets private。
- 無 public select policy。
- client roles 無 direct write。
- path namespace。
- Phase 6 activity-assets 安全性不退化。

## 18.6 Data invariants

- published content 有 published_at。
- unique slug。
- unique academic year。
- FAQ sort_order 非負。
- one site_settings row。
- no second singleton insert。
- draft public select 不可見。

Verification 最後輸出明確結果，例如：

```text
phase8_schema_verified=true
phase8_rls_verified=true
phase8_grants_verified=true
phase8_storage_verified=true
phase8_invariants_verified=true
```

---

# 19. Phase 8 Smoke Test

建立：

```text
scripts/phase8-core-content-smoke.mjs
```

Package script：

```text
pnpm run test:phase8
```

## 19.1 Test identities

沿用：

```text
anon
non-admin
inactive-admin
active-admin
```

不得建立 service role test。

## 19.2 Test run isolation

每次建立：

```text
phase8-{timestamp}-{random}
```

所有 fixture title、slug、email、storage path 包含 run id。

不得刪除：

- 非本次 run 的 row。
- 非本次 run 的 Storage object。
- 正式內容。
- Phase 7 immutable audit。

## 19.3 Posts tests

至少：

1. anon list admin API denied。
2. non-admin denied。
3. inactive-admin denied。
4. active-admin create draft。
5. draft public list 不可見。
6. draft public detail 404。
7. slug conflict。
8. update。
9. cover upload。
10. cover draft public proxy denied。
11. publish。
12. public list visible。
13. public detail visible。
14. cover proxy visible。
15. unpublish。
16. public detail 404。
17. delete。
18. cover cleanup。

## 19.4 Files tests

至少：

1. active-admin create metadata。
2. invalid MIME denied。
3. oversized file denied。
4. upload valid fixture。
5. draft download denied／404。
6. publish。
7. anon download success。
8. content-type。
9. safe Content-Disposition。
10. path traversal request denied。
11. non-admin replace denied。
12. inactive-admin delete denied。
13. replace success。
14. old object cleanup。
15. unpublish download denied。
16. delete row。
17. storage cleanup。

## 19.5 FAQ tests

至少：

1. create。
2. public active visible。
3. deactivate。
4. public invisible。
5. update。
6. create multiple。
7. reorder atomic。
8. duplicate reorder id denied。
9. missing id denied。
10. delete。
11. cleanup。

## 19.6 Year tests

至少：

1. create draft。
2. draft public 404。
3. duplicate academic year denied。
4. update highlights／statistics。
5. cover upload。
6. publish。
7. public list visible。
8. public detail visible。
9. unpublish。
10. public detail 404。
11. delete。
12. cleanup。

## 19.7 Settings tests

至少：

1. public settings read。
2. anon admin update denied。
3. non-admin denied。
4. inactive-admin denied。
5. active-admin update。
6. public page reflects update。
7. attempt second row denied。
8. restore original settings。
9. no mock fallback in Supabase mode。

## 19.8 Regression

Phase 8 script 或獨立 commands 必須驗證：

- Phase 5 login。
- Phase 6 activity CRUD。
- Phase 6 asset proxy。
- Phase 7 admin invitation。
- inactive admin denied from Phase 8 APIs。
- active admin remains functional。
- `/supabase-test` production 404。
- no auth session leak。
- no raw error。

## 19.9 Cleanup

最後：

- 所有 Phase 8 fixture rows removed。
- 所有 Phase 8 fixture Storage objects removed。
- settings restored。
- active admin states restored。
- no pending invitations from Phase 8。
- no orphan asset。
- immutable audit 保留。
- output 不包含 password、JWT、cookie、token、signed URL。

---

# 20. Browser Acceptance

使用 production preview，而非只測 dev server。

啟動：

```bash
pnpm run build
pnpm run preview
```

Browser 驗收必須實際完成。

## 20.1 Anonymous

- `/news`。
- published news detail。
- draft news 404。
- `/files`。
- published file download。
- unpublished file denied。
- `/faq`。
- `/years`。
- published year detail。
- unpublished year 404。
- homepage data。
- admin route redirect。
- console。
- hydration。

## 20.2 Active admin

- login。
- create post draft。
- upload cover。
- save。
- publish。
- public page確認。
- unpublish。
- public 404確認。
- create file。
- upload。
- publish。
- anonymous download確認。
- replace file。
- FAQ create/edit/reorder/deactivate。
- Year create/publish/unpublish。
- Settings update。
- homepage／footer反映。
- delete fixtures。
- logout。

## 20.3 Inactive admin

- Phase 7 將測試 admin 設為 inactive。
- 原 session 仍存在時：
  - admin page denied。
  - admin API denied。
  - Phase 8 mutation denied。
- restore test account state。

## 20.4 Accessibility

至少檢查：

- form label。
- error message association。
- keyboard tab order。
- confirmation dialog focus trap／return focus。
- accordion button。
- reorder controls。
- file input。
- mobile viewport 390 × 844。
- desktop viewport。
- visible focus。
- no keyboard-only blocker。

## 20.5 Console／network

必須：

- 0 Vue warning。
- 0 runtime console error。
- 0 hydration mismatch。
- 無重複 API submit。
- 正確 HTTP status。
- draft route 真正 404。
- no secret in network response。
- no storage path exposure。
- no raw Supabase error。

---

# 21. 完整驗證命令

最終至少執行：

```bash
pnpm install --frozen-lockfile

pnpm run typecheck
pnpm run build
pnpm run preview

pnpm run test:phase5
pnpm run test:phase6
pnpm run test:phase7
pnpm run test:phase8
```

若 `typecheck` script 尚未建立，Phase 8 必須建立。

另外：

```bash
git diff --check
```

SQL：

```text
supabase/verify-admin-access.sql
supabase/verify-phase8-core-content.sql
```

若 Phase 6 有獨立 verification，也必須執行。

不得只以 build success 取代 typecheck、smoke 或 Browser 驗收。

---

# 22. README 與文件更新

## 22.1 README

移除或修正過時內容：

- 「只使用 mock data」。
- 「Admin pages are UI-only」。
- 「Supabase integration belongs to future phase」。
- 「Auth、CRUD、Storage 尚未完成」。
- 舊 public bucket 說明。
- 舊環境變數。
- 舊 migration 指令。

README 必須包含：

1. 專案簡介。
2. 現行 stack。
3. 已完成 Phase 4–8。
4. 安裝。
5. dev。
6. build。
7. preview。
8. typecheck。
9. tests。
10. env。
11. mock mode。
12. Supabase mode。
13. migration order。
14. private buckets。
15. admin Auth。
16. admin invitation。
17. content modules。
18. security boundaries。
19. prohibited secrets。
20. deployment readiness。
21. known limitations。
22. next phase。

## 22.2 `.env.example`

更新：

- public Supabase URL。
- anon key。
- site URL。
- private bucket names。
- Phase 5–8 smoke placeholders。
- file size settings若為 env。
- 不放真實值。
- 不新增 service role placeholder，避免誤用。

## 22.3 Architecture

建立或更新：

```text
docs/architecture.md
```

內容：

- Nuxt SSR。
- Auth session。
- requireAdmin。
- active admin lifecycle。
- Server API。
- RLS。
- content tables。
- Storage。
- public proxy。
- mock／Supabase mode。
- error contract。
- data flow diagrams 可用 Mermaid。
- migration source of truth。

## 22.4 Deployment readiness

建立：

```text
docs/deployment-readiness.md
```

僅記錄準備，不執行部署。

內容：

- Nitro SSR需求。
- cookie。
- env。
- redirect URL。
- private asset proxy。
- build output。
- candidate platforms。
- security headers。
- staging requirements。
- production checklist。
- Phase 12 blocked items。

## 22.5 Supabase 文件

建立或更新：

```text
supabase/README.md
```

內容：

- migrations 是 source of truth。
- schema snapshot 用途。
- migration execution order。
- manual SQL Editor history limitation。
- verification。
- buckets。
- no service role。
- rollback／backup注意事項。

---

# 23. Phase 8 完成報告

建立：

```text
outputs/phase-8-completion-report.md
```

至少包含：

## 23.1 執行摘要

- Phase 狀態。
- 開始 HEAD。
- 完成 HEAD。
- base tags。
- 完成範圍。
- 是否 push。

## 23.2 開始狀態

- branch。
- working tree。
- ahead／behind。
- Node。
- pnpm。
- Supabase access。
- existing data counts。
- legacy schema findings。

## 23.3 架構決策

- Server API strategy。
- Storage bucket strategy。
- safe rendering。
- mock mode。
- schema snapshot。
- categories。
- legacy file URL。
- singleton settings。

## 23.4 修改檔案

逐檔說明。

## 23.5 Migration

- migration file。
- remote application。
- first attempt／rollback。
- data backfill。
- schema changes。
- indexes。
- constraints。
- functions。
- RLS。
- grants。
- Storage。

## 23.6 API

以 table 列出：

- route。
- auth。
- input。
- output。
- same-origin。
- errors。
- cache。

## 23.7 Public SSR

- routes。
- published isolation。
- 404。
- metadata。
- hydration。

## 23.8 身分矩陣

```text
anon
non-admin
inactive-admin
active-admin
```

對每個 module 列出 read／write。

## 23.9 Tests

- install。
- typecheck。
- build。
- preview。
- SQL verification。
- Phase 5。
- Phase 6。
- Phase 7。
- Phase 8。
- Browser。
- mobile。
- accessibility。
- console。
- hydration。

## 23.10 Cleanup

- rows。
- objects。
- settings restore。
- admin state restore。
- orphan scan。
- audit。

## 23.11 Security

- service role scan。
- Auth Admin API scan。
- secret scan。
- storage path scan。
- raw error scan。
- direct client write scan。
- `v-html` scan。
- broad policy scan。
- public bucket scan。
- fixed search_path scan。

## 23.12 Git

- commit。
- tag。
- push。
- final status。
- remote verification。

## 23.13 已知限制

誠實列出。

## 23.14 下一階段

依 Phase 8 真實結果滾動調整 Phase 9。

---

# 24. Definition of Done

只有以下全部完成，Phase 8 才算完成。

## 24.1 Repository and baseline

- [ ] 以最新 `main` 為基準。
- [ ] Phase 7 tag 存在。
- [ ] Phase 7 後合法文件 commit 保留。
- [ ] 未覆蓋使用者未提交內容。

## 24.2 Posts

- [ ] schema。
- [ ] migration。
- [ ] RLS。
- [ ] Server API。
- [ ] CRUD。
- [ ] draft／publish／unpublish。
- [ ] private cover。
- [ ] public proxy。
- [ ] SSR list。
- [ ] SSR detail。
- [ ] 404。
- [ ] admin UI。
- [ ] smoke。
- [ ] Browser。

## 24.3 Files

- [ ] metadata schema。
- [ ] private bucket。
- [ ] upload。
- [ ] replace。
- [ ] publish／unpublish。
- [ ] public download proxy。
- [ ] MIME／size／filename validation。
- [ ] Content-Disposition 安全。
- [ ] delete compensation。
- [ ] cleanup。
- [ ] admin UI。
- [ ] smoke。
- [ ] Browser。

## 24.4 FAQ

- [ ] schema。
- [ ] CRUD。
- [ ] active／inactive。
- [ ] atomic reorder。
- [ ] SSR。
- [ ] accessible accordion。
- [ ] admin UI。
- [ ] smoke。
- [ ] Browser。

## 24.5 Years

- [ ] schema。
- [ ] unique academic year。
- [ ] CRUD。
- [ ] draft／publish／unpublish。
- [ ] highlights。
- [ ] statistics。
- [ ] cover。
- [ ] SSR list。
- [ ] SSR detail。
- [ ] 404。
- [ ] admin UI。
- [ ] smoke。
- [ ] Browser。

## 24.6 Settings

- [ ] singleton invariant。
- [ ] admin update。
- [ ] public read。
- [ ] homepage integration。
- [ ] footer integration。
- [ ] no second row。
- [ ] no mock fallback in Supabase mode。
- [ ] smoke。
- [ ] Browser。

## 24.7 Security

- [ ] no service role。
- [ ] no Auth Admin API。
- [ ] no broad authenticated write policy。
- [ ] no public Phase 8 bucket。
- [ ] no client direct formal mutation。
- [ ] active-admin-only。
- [ ] same-origin。
- [ ] fixed search_path。
- [ ] stable errors。
- [ ] no raw error。
- [ ] no unsafe `v-html`。
- [ ] no secret。
- [ ] no storage path leak。

## 24.8 Schema consistency

- [ ] migrations 為 source of truth。
- [ ] insecure legacy `schema.sql` 已處理。
- [ ] fresh-install path 有文件。
- [ ] verification PASS。

## 24.9 Regression

- [ ] `pnpm install --frozen-lockfile` PASS。
- [ ] typecheck 0 error。
- [ ] build PASS。
- [ ] preview PASS。
- [ ] Phase 5 PASS。
- [ ] Phase 6 PASS。
- [ ] Phase 7 PASS。
- [ ] Phase 8 PASS。
- [ ] production `/supabase-test` 404。
- [ ] activity CRUD 未退化。
- [ ] activity assets 未退化。
- [ ] admin governance 未退化。
- [ ] inactive admin 立即 denied。

## 24.10 Browser and UX

- [ ] anonymous flow。
- [ ] active admin flow。
- [ ] inactive admin flow。
- [ ] mobile。
- [ ] keyboard。
- [ ] focus。
- [ ] form errors。
- [ ] 0 Vue warning。
- [ ] 0 runtime console error。
- [ ] 0 hydration mismatch。

## 24.11 Documentation and Git

- [ ] README 更新。
- [ ] architecture 更新。
- [ ] deployment readiness。
- [ ] Supabase README。
- [ ] completion report。
- [ ] secret scan。
- [ ] `git diff --check`。
- [ ] commit。
- [ ] complete tag。
- [ ] push main。
- [ ] push tag。
- [ ] remote commit／tag驗證。
- [ ] final working tree clean，或只保留明確記錄的使用者既有變更。

---

# 25. Secret 與安全掃描

Commit 前搜尋 staged content 與 repository。

至少搜尋：

```text
service_role
SUPABASE_SERVICE
SUPABASE_SECRET
sb_secret_
eyJ
password=
refresh_token
access_token
authorization:
set-cookie
raw invitation token
signed URL
database_url
postgresql://
private key
```

也搜尋：

```text
auth.role() = 'authenticated'
FOR ALL
bucket public
getPublicUrl
v-html
supabase.from('posts')
supabase.from('files')
supabase.from('faq')
supabase.from('site_settings')
```

判讀：

- 測試字串或文件說明可以存在，但不得包含真實 secret。
- `supabase.from(...)` 在 server 端可以；client formal admin path 不可。
- `v-html` 若為完全可信 static content仍需說明；DB user content不得直接使用。
- `auth.role() = 'authenticated'` 不得作為管理內容 write policy。

---

# 26. Git 完成流程

全部 DoD 通過後：

```bash
git status --short
git diff --check
git diff --stat
git diff
```

只 stage Phase 8 相關檔案。

可使用：

```bash
git add \
  README.md \
  package.json \
  pnpm-lock.yaml \
  .env.example \
  docs \
  supabase \
  server \
  shared \
  types \
  utils \
  composables \
  components \
  pages \
  scripts \
  outputs/phase-8-completion-report.md \
  codexSteps/phase8.md
```

實際依修改檔案調整，不得盲目 `git add .`。

Commit：

```bash
git commit -m "feat: complete Phase 8 core content platform"
```

Tag：

```bash
git tag phase-8-core-content-platform-complete
```

Push：

```bash
git push origin main
git push origin phase-8-core-content-platform-complete
```

最後驗證：

```bash
git status --short
git log -1 --oneline
git tag --points-at HEAD
git ls-remote --heads origin main
git ls-remote --tags origin phase-8-core-content-platform-complete
```

若 push 被 remote divergence 拒絕：

1. `git fetch origin`。
2. 分析 remote commits。
3. 不 force push。
4. 安全 merge 或 rebase 僅限 Codex自己尚未公開的 Phase 8 commit，且不得 rewrite 使用者 commit。
5. 重新執行必要 regression。
6. 再 push。
7. tag 必須指向最終通過驗收的 commit。

---

# 27. Phase 8 完成後的滾動路線圖

Codex需根據真實完成結果，在 completion report 更新優先順序。

目前預定：

## Phase 9 — Wix Content Migration

- Wix 完整內容盤點。
- URL manifest。
- 活動、消息、檔案、FAQ、年度成果 mapping。
- 圖片與附件搬移。
- slug collision。
- duplicate detection。
- import scripts。
- count reconciliation。
- migration report。
- redirect manifest。

## Phase 10 — Frontend Content, SEO and Accessibility

- 正式文案。
- 移除 placeholder。
- metadata。
- canonical。
- Open Graph。
- sitemap。
- robots。
- structured data。
- 404／500。
- accessibility audit。
- image alt。
- Lighthouse。
- responsive refinement。

## Phase 11 — Automated Testing and CI

- GitHub Actions。
- frozen install。
- typecheck。
- lint。
- build。
- unit。
- smoke。
- secret scan。
- dependency audit。
- staging E2E。

## Phase 12 — Deployment and Environment Hardening

- SSR platform。
- staging。
- production。
- env isolation。
- cookies。
- CSP。
- HSTS。
- referrer policy。
- permissions policy。
- Supabase URLs。
- custom domain。
- production smoke。

## Phase 13 — Backup, Monitoring and Operations

- DB backup。
- Storage backup。
- error monitoring。
- uptime。
- runbook。
- admin manual。
- rollback。
- incident response。
- account deactivation SOP。

## Phase 14 — Production Launch and Wix Cutover

- UAT。
- content freeze。
- final sync。
- DNS。
- redirects。
- launch regression。
- Wix retirement。
- release tag。
- launch report。

每個 Phase 結束後必須重新評估：

```text
Blockers
High risks
Medium risks
Low risks
New technical debt
Deferred items
Changed dependencies
Next phase scope
```

不得機械式照抄原路線圖。

---

# 28. Codex 最終執行指令

請直接開始執行 March Out For Love Phase 8。

你已被授權全權完成本 Phase，包括：

- repository 分析。
- 技術設計。
- 程式修改。
- migration。
- Supabase schema、RLS、grants、Storage。
- Server API。
- Admin UI。
- Public SSR。
- mock mode 分離。
- schema snapshot 修正。
- 測試。
- Browser 驗收。
- cleanup。
- 文件。
- completion report。
- Git commit。
- complete tag。
- push main 與 tag。

不要把工作拆回給使用者，不要要求使用者代為執行一般指令，不要在每個決策點等待確認。

若已具備 Supabase、GitHub 與本機權限，請自行完成全部操作。

只有在外部帳號權限實際不可取得時，才將該項記錄為明確 blocker；即使如此，也必須繼續完成其餘所有工作。

必須保留 Phase 5、6、7 的 Auth、RLS、Storage、安全與測試基線。

不得使用 service role、Auth Admin API、公開 bucket、broad authenticated write policy、client direct formal mutation 或 unsafe HTML rendering。

所有 Definition of Done 完成前，不得建立：

```text
phase-8-core-content-platform-complete
```

所有 DoD 完成後，建立 commit、tag，推送遠端，並回報：

1. final commit hash。
2. final tag。
3. migration 結果。
4. verification 結果。
5. Phase 5–8 test 結果。
6. Browser 驗收結果。
7. cleanup 結果。
8. secret scan。
9. remote push 驗證。
10. 已知限制與 Phase 9 建議。
