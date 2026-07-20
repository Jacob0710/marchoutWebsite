# Codex Phase 5 規格：Supabase Auth、管理員授權與唯讀後台基礎

**專案名稱：** March Out For Love／愛潮關懷社網站  
**專案路徑：** `C:\Users\Admin\Documents\Codex\2026-06-24\phase-1-phase-2-supabase-mock`  
**技術棧：** Nuxt 3、Vue 3、TypeScript、Tailwind CSS、Supabase  
**前一階段：** Phase 4 Supabase 公開活動前台整合已完成  
**Git 基準標籤：** `phase-4-supabase-public-frontend-complete`  
**本階段：** Phase 5 — Supabase Auth、管理員授權與唯讀後台基礎

---

## 1. 階段目標

本階段只建立安全、可驗證的管理員登入與唯讀後台基礎，完成：

1. Supabase Email／Password 登入。
2. 管理員身分資料表與授權判斷。
3. 伺服器端 session 驗證。
4. 伺服器端管理員授權。
5. `/admin/login` 登入頁。
6. `/admin` 後台首頁。
7. `/admin/activities` 管理員唯讀活動列表。
8. 管理員可看到 `published` 與 `draft`。
9. 未登入者與非管理員不能存取管理頁。
10. 登出功能。
11. RLS、SSR、TypeScript、build、瀏覽器與回歸驗收。
12. 完整執行報告。

本階段不得提前實作：新增、編輯、刪除、發布切換、Supabase Storage、附件管理、多角色後台、管理員邀請、忘記密碼、OAuth 或稽核 UI。

---

## 2. 已驗收基準

Phase 4 已確認：

- anon 可讀取 3 筆 `published` 活動。
- anon 不可讀取 `draft`。
- `welcome-gathering-114` 回傳 HTTP 200。
- `draft-rls-verification` 回傳 HTTP 404。
- 不存在 slug 回傳 HTTP 404。
- 首頁與活動列表 SSR 正常。
- TypeScript 0 error。
- production build 成功。
- 無 Vue warning、runtime error、hydration mismatch 與 browser console error。
- `/supabase-test` 僅開發環境可用，production 回傳 404。
- 前端未使用 `service_role` key。

Codex 開始前必須確認此基準仍存在，不得破壞 Phase 4 行為。

---

## 3. 開始前必要檢查

在專案根目錄執行：

```bash
git status
git branch --show-current
git log --oneline --decorate -5
git tag
```

預期：

- 分支為 `main`。
- 工作樹乾淨，或能清楚辨識使用者尚未提交的變更。
- 存在 `phase-4-supabase-public-frontend-complete` 標籤。
- 不得覆蓋未提交變更。

再檢查：

```text
package.json
nuxt.config.ts
middleware/
composables/
pages/
server/
types/
utils/
supabase/schema.sql
supabase/migrations/
.env.example
.gitignore
```

若 `supabase/migrations/` 尚不存在，本階段建立。Phase 5 資料庫變更不得繼續堆入大型 `schema.sql`。

---

## 4. 強制範圍界線

### 4.1 必須完成

- Authentication：確認使用者是否登入。
- Authorization：確認已登入使用者是否為有效管理員。
- Route protection：管理頁具伺服器端保護。
- RLS：管理員可讀取全部活動，anon 仍只能讀取 `published`。
- 唯讀管理活動列表。
- Logout。
- 完整測試與文件。

### 4.2 明確排除

本階段不得新增下列活動資料表權限：

- `INSERT`
- `UPDATE`
- `DELETE`

唯讀後台尚未完成前，不得提前擴大寫入攻擊面。

---

## 5. 認證與授權架構

### 5.1 認證方式

使用 Supabase Auth Email／Password。

不得：

- 自建密碼資料表。
- 在前端儲存明文密碼。
- 自行簽發 JWT。
- 手動將 token 寫入 localStorage。
- 將 `service_role` key 放入瀏覽器 runtime。
- 使用前端布林值作為管理員權限來源。

Session 應使用既有 Supabase Nuxt 整合的 cookie／SSR session 機制。Codex 必須先檢查現有套件與 Nuxt 模組，不得重複安裝第二套 Supabase client。

### 5.2 管理員資料模型

建立：

```text
public.admin_users
```

建議欄位：

```sql
user_id uuid primary key references auth.users(id) on delete cascade,
is_active boolean not null default true,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

授權使用 `auth.uid()` 對應 `admin_users.user_id`。不得用 email 作為 foreign key 或主要 RLS 條件。

### 5.3 管理員判斷函式

建立：

```text
public.is_admin()
```

要求：

- 回傳 boolean。
- 僅根據 `auth.uid()` 與 `admin_users.is_active`。
- 不接受任意 user id 參數。
- 若使用 `security definer`，必須固定 `search_path`。
- 不得讓一般使用者修改 `admin_users`。
- 僅授予必要 execute 權限。
- 避免 RLS policy recursion。

概念行為：

```sql
exists (
  select 1
  from public.admin_users
  where user_id = auth.uid()
    and is_active = true
)
```

Codex 必須依實際 Supabase/Postgres 安全需求實作，不得直接複製未驗證範例。

---

## 6. RLS 目標

### 6.1 `activities`

保留 Phase 4 anon published policy，新增管理員唯讀 policy：

```text
authenticated 且 is_admin() = true 的使用者可以 SELECT 全部 activities
```

最終行為：

| 身分 | published | draft |
|---|---:|---:|
| anon | 可讀 | 不可讀 |
| authenticated 非管理員 | 依公開 policy 可讀 published | 不可讀 |
| authenticated 管理員 | 可讀 | 可讀 |

不得將 anon policy 改為 `using (true)`。

### 6.2 `admin_users`

必須啟用 RLS：

- anon 不可讀取。
- 不得公開列出所有管理員。
- 一般 authenticated 使用者只能取得自身是否為管理員的最小資訊，或透過受控函式取得布林結果。
- 本階段不建立前端新增、修改、刪除管理員權限。

---

## 7. Migration 規格

建立：

```text
supabase/migrations/
```

建議檔名：

```text
supabase/migrations/20260714_001_admin_users.sql
supabase/migrations/20260714_002_admin_authorization.sql
supabase/migrations/20260714_003_admin_activity_read_policy.sql
```

亦可合併為：

```text
supabase/migrations/20260714_001_phase5_admin_auth.sql
```

但檔案內必須清楚分區。

Migration 必須：

- 可在 Supabase SQL Editor 執行。
- 不破壞現有 `activities` 資料。
- 不刪除 Phase 4 policy。
- 不重建 `activities`。
- 不清空任何資料。
- 不建立 service-role 依賴。
- 不把管理員 email 硬編碼進 policy。
- 清楚包含 RLS、policy、grant、revoke 與函式。

另建立：

```text
supabase/verify-admin-auth.sql
```

至少驗證：

- `admin_users` 是否存在。
- RLS 是否啟用。
- `is_admin()` 是否存在。
- `activities` policy 列表。
- admin read policy 條件。
- `admin_users` policy 列表。
- 管理員帳號是否正確對應。

不得輸出密碼、token 或 key。

---

## 8. 建立第一位管理員

本階段不建立公開註冊管理員流程。

建議：

1. 使用者在 Supabase Authentication 後台建立 Email／Password 使用者。
2. 取得該使用者 UUID。
3. 使用 SQL Editor 將 UUID 寫入 `public.admin_users`。
4. `is_active = true`。
5. 使用該帳號測試登入。

可建立：

```text
supabase/create-first-admin.example.sql
```

只允許 placeholder：

```sql
insert into public.admin_users (user_id, is_active)
values ('00000000-0000-0000-0000-000000000000', true);
```

不得提交真實 email、密碼或 UUID。

---

## 9. Nuxt 頁面規格

### 9.1 `/admin/login`

建立：

```text
pages/admin/login.vue
```

功能：

- Email 欄位。
- Password 欄位。
- 登入按鈕。
- pending 狀態與重複提交防護。
- 通用錯誤訊息。
- 登入成功後確認管理員資格。
- 管理員導向 `/admin`。
- 非管理員不得進入後台。
- 已登入管理員開啟登入頁時導向 `/admin`。
- 表單可用 Enter 提交。

不得在 console 輸出 email、password、token 或 session。

建議登入失敗訊息：

```text
登入失敗，請確認帳號或密碼。
```

已登入但沒有管理權限時可顯示：

```text
此帳號沒有管理權限。
```

### 9.2 `/admin`

建立：

```text
pages/admin/index.vue
```

功能：

- 顯示管理後台首頁。
- 顯示管理員基本識別，例如 email；不得顯示 token。
- 提供 `/admin/activities` 入口。
- 提供登出按鈕。
- SSR 時完成 session 與管理員授權判斷。
- 未授權不得先閃現管理內容再 redirect。

### 9.3 `/admin/activities`

建立：

```text
pages/admin/activities/index.vue
```

本階段只讀，至少顯示：

- 活動名稱。
- slug。
- 狀態。
- 活動日期。
- 建立時間或更新時間。
- 是否已發布。

必須處理：

- pending。
- error。
- empty。
- success。

管理員可看到 `published` 與 `draft`。不得加入新增、編輯、刪除、發布切換或 Storage 操作。

---

## 10. Route Protection 規格

不得只依賴 client-side middleware。

建議建立：

```text
middleware/admin.ts
server/utils/requireAdmin.ts
```

或符合現有 Nuxt Supabase 模組的等效架構。

保護：

```text
/admin
/admin/**
```

排除：

```text
/admin/login
```

預期：

- 未登入：導向 `/admin/login`。
- 已登入非管理員：回傳 403 或導向明確無權限頁。
- 已登入管理員：HTTP 200。
- 未授權者不得在 hydration 前看到管理資料。

登入成功不等於取得管理員權限。

---

## 11. Composable 與共用邏輯

建議建立或整理：

```text
composables/useAdminAuth.ts
composables/useAdminActivities.ts
```

### `useAdminAuth`

責任：

- 取得 session／user。
- 登入。
- 登出。
- 取得管理員狀態。
- 區分未登入、非管理員、管理員與查詢錯誤。

不得把所有狀態壓成單一 boolean。

### `useAdminActivities`

責任：

- 僅供管理員讀取全部活動。
- 使用明確欄位與決定性排序。
- 明確 TypeScript 型別。
- 錯誤不得以 mock data 掩蓋。
- 不與公開活動 composable 混用。

---

## 12. TypeScript 規範

必須保持：

```bash
pnpm exec nuxi typecheck
```

0 error。

要求：

- 不使用 `any`。
- 不使用 `@ts-ignore`。
- 不關閉 strict。
- user、session、admin 狀態與 activity row 使用明確型別。
- 正確處理 nullable 欄位。
- 不以型別斷言掩蓋 runtime 不確定性。
- 不直接將 Supabase 原始 error 顯示給使用者。

---

## 13. 安全要求

### 13.1 金鑰

前端只可使用 Supabase URL 與 anon key。

不得出現：

- service-role key。
- database password。
- JWT secret。
- refresh token。
- access token 日誌。
- 管理員密碼。
- 真實 `.env`。

### 13.2 Session

- 使用 Supabase 官方 session 機制。
- 不自行存 token。
- 不將 session 寫入 localStorage。
- 登出後管理頁立即失效。
- 頁面重整後 session 正確恢復。
- server 與 client 狀態一致。

### 13.3 授權

- 登入不等於管理員。
- 管理員判斷不可只在前端。
- RLS 與 server-side authorization 必須同時存在。
- 不得只靠隱藏按鈕。
- 非管理員直接呼叫 Supabase 也不可讀取 draft。

### 13.4 錯誤資訊

不得向使用者輸出 SQL stack、policy 內容、token、key、server path、內部 query 參數或完整 Supabase error object。

---

## 14. 登出行為

登出後：

- Supabase session 被清除。
- 導向 `/admin/login`。
- 瀏覽器返回 `/admin` 時不可重新看到管理內容。
- 重新整理 `/admin` 必須被阻擋。
- client state 不得殘留舊活動資料。
- 登出 API 失敗時不得假裝已登出。

---

## 15. 必須測試的身分情境

### 15.1 未登入

| 路由 | 預期 |
|---|---|
| `/admin/login` | HTTP 200 |
| `/admin` | redirect 至登入頁 |
| `/admin/activities` | redirect 至登入頁 |
| `/activities` | HTTP 200 |
| draft slug | HTTP 404 |

### 15.2 已登入但非管理員

需使用不在 `admin_users` 的測試帳號。

| 行為 | 預期 |
|---|---|
| Supabase Auth 登入 | 成功 |
| `/admin` | 403 或明確拒絕 |
| `/admin/activities` | 不可存取 |
| 查詢 draft | 無法讀取 |
| published 公開資料 | 依公開 policy 可讀 |

### 15.3 已登入管理員

| 行為 | 預期 |
|---|---|
| `/admin/login` | 導向 `/admin` |
| `/admin` | HTTP 200 |
| `/admin/activities` | HTTP 200 |
| published | 可見 |
| draft | 可見 |
| 登出 | session 清除並導向登入 |
| 登出後重開管理頁 | 被阻擋 |

---

## 16. Phase 4 回歸測試

重新確認：

```text
/
/activities
/activities/welcome-gathering-114
/activities/draft-rls-verification
/activities/non-existing-slug-for-404-test
```

預期：

- 公開首頁 200。
- 公開列表 200。
- published 詳情 200。
- draft 詳情對 anon 404。
- 不存在詳情 404。

不得因新增 authenticated policy 而讓 anon 看到 draft。

---

## 17. 執行與品質驗證

依序執行：

```bash
pnpm install --frozen-lockfile
pnpm exec nuxi typecheck
pnpm run build
```

若 `package.json` 有 lint script：

```bash
pnpm run lint
```

若沒有，必須記錄「無 lint script」，不得假裝執行。

開發測試：

```bash
pnpm run dev
```

檢查：

- server log。
- browser console。
- Vue warning。
- runtime error。
- hydration mismatch。
- 未處理 Promise。
- redirect loop。
- cookie／session 不一致。
- 未授權內容閃現。

測試完成後停止伺服器，確認常用 port 無 listener。

---

## 18. 測試矩陣

| 編號 | 身分 | 操作 | 預期 |
|---|---|---|---|
| A01 | anon | `/admin/login` | 200 |
| A02 | anon | `/admin` | redirect |
| A03 | anon | `/admin/activities` | redirect |
| A04 | anon | published slug | 200 |
| A05 | anon | draft slug | 404 |
| B01 | non-admin | 登入 | 成功 |
| B02 | non-admin | `/admin` | 403／拒絕 |
| B03 | non-admin | 讀 draft | 無資料／拒絕 |
| C01 | admin | 登入 | 成功 |
| C02 | admin | `/admin` | 200 |
| C03 | admin | `/admin/activities` | 200 |
| C04 | admin | 查看 published | 可見 |
| C05 | admin | 查看 draft | 可見 |
| C06 | admin | 登出 | 成功 |
| C07 | 已登出 | 重開 `/admin` | redirect |
| R01 | anon | `/` | 200 |
| R02 | anon | `/activities` | 200 |
| R03 | anon | invalid slug | 404 |
| Q01 | build | typecheck | 0 error |
| Q02 | build | production build | PASS |
| Q03 | browser | console | 無 error |
| Q04 | SSR | hydration | 無 mismatch |

---

## 19. 禁止做法

Codex 不得：

- 只用 route middleware 判斷管理員。
- 只在前端比較管理員 email。
- 將管理員 email 寫死在 component。
- 使用 `service_role` 解決 RLS。
- 關閉 RLS。
- 將所有 authenticated 使用者視為管理員。
- 建立 `using (true)` 的 authenticated draft policy。
- 將 token 寫入 localStorage。
- 在 production 開放 `/supabase-test`。
- 使用 mock 管理員資料掩蓋 Auth 問題。
- 顯示 Supabase 原始登入錯誤。
- 因 Auth 開發破壞公開 SSR。
- 同時實作 CRUD 或 Storage。
- 未經必要性說明升級主要套件。
- 修改不相關 UI。
- 大量格式化全專案造成無關 diff。

---

## 20. Git 與提交規範

每個 commit 只處理單一主題，建議：

```text
feat: add Supabase admin authorization schema
feat: add admin login and protected routes
feat: add read-only admin activity list
test: verify admin auth and route protection
```

未經使用者明確要求，不得 push。

只有 Definition of Done 全部通過後，才可建立：

```text
phase-5-admin-auth-readonly-complete
```

---

## 21. Definition of Done

### Database

- [ ] `admin_users` 已建立。
- [ ] `admin_users` 已啟用 RLS。
- [ ] `is_admin()` 已建立並通過驗證。
- [ ] 第一位管理員 UUID 已正確加入。
- [ ] anon 不可讀取管理員資料。
- [ ] non-admin 不可讀取 draft。
- [ ] admin 可讀取 draft。
- [ ] Phase 4 anon published policy 未被破壞。
- [ ] 未建立活動寫入 policy。

### Auth

- [ ] `/admin/login` 可登入。
- [ ] 錯誤訊息不洩漏敏感資訊。
- [ ] session 可跨重新整理恢復。
- [ ] 登出可清除 session。
- [ ] 登出後管理頁不可存取。

### Authorization

- [ ] 未登入者不能進入 `/admin`。
- [ ] 未登入者不能進入 `/admin/activities`。
- [ ] 非管理員不能進入管理頁。
- [ ] 管理員可以進入管理頁。
- [ ] 保護在 SSR 階段生效。
- [ ] 未授權內容不會閃現。

### Admin UI

- [ ] `/admin` 對管理員 HTTP 200。
- [ ] `/admin/activities` 對管理員 HTTP 200。
- [ ] 管理員可看到 published。
- [ ] 管理員可看到 draft。
- [ ] 有 pending／error／empty／success。
- [ ] 沒有新增、編輯、刪除、發布功能。

### Regression

- [ ] `/` HTTP 200。
- [ ] `/activities` HTTP 200。
- [ ] published slug HTTP 200。
- [ ] draft slug 對 anon HTTP 404。
- [ ] invalid slug HTTP 404。
- [ ] `/supabase-test` production HTTP 404。

### Quality

- [ ] `pnpm exec nuxi typecheck` 通過。
- [ ] `pnpm run build` 通過。
- [ ] lint 若存在則通過。
- [ ] 無 Vue warning。
- [ ] 無 runtime error。
- [ ] 無 hydration mismatch。
- [ ] 無 browser console error。
- [ ] 無 redirect loop。
- [ ] 無未處理 Promise。
- [ ] 測試伺服器已停止。
- [ ] Git 狀態已回報。
- [ ] 完整驗收報告已產出。

---

## 22. Codex 最終回報格式

### 22.1 執行摘要

說明完成內容、是否完全驗收、是否有阻塞項目，以及是否誤入排除範圍。

### 22.2 修改檔案

逐一列出：

```text
檔案路徑
修改原因
主要變更
安全影響
```

### 22.3 Migration 與資料庫狀態

列出：

- migration 檔案。
- `admin_users` schema。
- RLS 狀態。
- policy 名稱與用途。
- `is_admin()` 驗證結果。
- 管理員帳號是否已對應。
- anon／non-admin／admin 權限結果。
- 是否新增任何寫入 policy。

不得輸出 email、password、UUID、token 或 key。

### 22.4 路由驗證

| 身分 | 路由 | 預期 | 實際結果 |
|---|---|---|---|
| anon | `/admin/login` | 200 | |
| anon | `/admin` | redirect | |
| anon | `/admin/activities` | redirect | |
| non-admin | `/admin` | 403／拒絕 | |
| admin | `/admin` | 200 | |
| admin | `/admin/activities` | 200 | |
| anon | published slug | 200 | |
| anon | draft slug | 404 | |
| anon | invalid slug | 404 | |

### 22.5 品質驗證

| 驗證項目 | 指令／工具 | 結果 |
|---|---|---|
| Dependencies | `pnpm install --frozen-lockfile` | |
| TypeScript | `pnpm exec nuxi typecheck` | |
| Build | `pnpm run build` | |
| Lint | `pnpm run lint` 或不存在 | |
| Vue warning | server/browser log | |
| Runtime error | server log | |
| Hydration | browser | |
| Console | browser | |
| Redirect loop | browser/network | |
| Test server | port check | |

### 22.6 已知限制

列出尚未驗證項目、需使用者操作、未進入的 Phase 6 功能、套件或 Node warning，以及尚未建立的自動測試。

### 22.7 風險與建議

至少包含：

- RLS 變更風險。
- Auth session 風險。
- 非管理員測試必要性。
- 管理員帳號建立方式。
- 未來 CRUD policy 應獨立 migration。
- service-role 使用邊界。
- 正式部署環境變數。

### 22.8 Git 狀態

列出分支、commit、tag、working tree 與是否 push。未獲授權不得 push。

### 22.9 下一階段

Phase 5 完全通過後，才可另行規劃：

```text
Phase 6：活動後台新增與編輯
```

---

## 23. 給 Codex 的直接執行指令

請以目前 Phase 4 已驗收基準接續 Phase 5。

本階段只實作：

1. Supabase Email／Password 登入。
2. `admin_users` 與安全管理員判斷。
3. server-side session 與管理員授權。
4. `/admin/login`。
5. `/admin`。
6. `/admin/activities` 唯讀列表。
7. 登出。
8. RLS、SSR、TypeScript、build、browser 與回歸驗證。

開始前必須確認 Git 基準與 Phase 4 tag。資料庫變更使用新的 `supabase/migrations/`，不得繼續堆入大型 `schema.sql`。

不得實作新增、編輯、刪除、發布切換、Storage 或管理員邀請。不得使用 service-role key、不得停用 RLS、不得將 authenticated 使用者全部視為管理員。

管理頁保護必須在伺服器端生效；client middleware 只能輔助。登入成功不等於取得管理權限。必須分別測試 anon、authenticated 非管理員、authenticated 管理員三種身分。

若需要使用者在 Supabase Dashboard 建立測試帳號或執行 migration，先完成所有本機可完成項目，再提供最小且精確的操作步驟。不得假裝遠端操作已通過。

完成後依第 22 節格式提交完整報告。Definition of Done 任一必要項目未通過，不得宣告 Phase 5 完成。
