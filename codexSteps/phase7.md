# March Out For Love
# Phase 7 Codex 實作規格：管理員邀請、存取權生命週期與權限治理

> 文件用途：將本文件直接交給 Codex，讓 Codex 在已完成的 Phase 6 基準上實作 Phase 7。  
> 專案名稱：March Out For Love／愛潮關懷社網站  
> 專案根目錄：`C:\Users\Admin\Documents\Codex\2026-06-24\phase-1-phase-2-supabase-mock`  
> 技術棧：Nuxt 3、Vue 3、TypeScript、Tailwind CSS、Supabase、pnpm  
> 基準分支：`main`  
> 基準 Commit：`f79af10 feat: complete Phase 6 admin activity CRUD and storage`  
> 基準 Tag：`phase-6-admin-activity-crud-storage-complete`  
> 規格日期：2026-07-16  
> 建議規格檔名：`codexSteps/phase-7-admin-access-governance.md`

---

## 1. 任務目標

在不破壞 Phase 5、Phase 6 認證、授權、RLS、活動 CRUD、私有 Storage 與公開前台的前提下，建立可安全管理後台存取權的機制。

Phase 7 必須完成：

1. 管理員可查看目前管理員名單。
2. 管理員可建立一次性管理員邀請。
3. 邀請連結只顯示一次，不在資料庫保存明文 token。
4. 已存在的 Supabase Auth 使用者可透過邀請完成管理員授權。
5. 管理員可撤銷尚未使用的邀請。
6. 管理員可停用或重新啟用其他管理員的後台存取權。
7. 不得停用自己。
8. 任何情況下至少保留一位有效管理員，並處理並行停用競態。
9. 所有邀請、接受、撤銷、啟用與停用操作皆留下不可由一般應用程式修改的稽核紀錄。
10. anon、non-admin、inactive-admin、active-admin 的權限必須明確隔離。
11. 建立可重複執行的 Phase 7 SQL 驗證、API smoke test 與 Browser 驗收。
12. 產出完整 Phase 7 執行報告、Git commit 與完成 tag。

Phase 7 完成後，網站應由「單一人工設定管理員」提升為「可治理多位管理員存取權，但仍維持最小權限與無 `service_role` 應用程式架構」。

---

## 2. 核心架構決策

### 2.1 本階段管理的是「後台存取權」，不是 Supabase Auth 超級管理

本階段的帳號生命週期定義為：

```text
pending invitation
→ invitation accepted
→ active admin
→ inactive admin
→ active admin（可重新啟用）
```

本階段不直接建立、刪除、封鎖或修改 `auth.users`。

Supabase Auth 使用者帳號必須符合以下任一條件：

1. 已存在於 Supabase Authentication。
2. 由專案擁有者在 Supabase Dashboard 手動建立。
3. 由專案擁有者透過 Supabase Dashboard 內建邀請流程建立。

應用程式只管理：

- 誰被邀請取得後台權限。
- 邀請是否有效。
- 哪一位 Auth 使用者接受邀請。
- `admin_users.is_active`。
- 存取權變更稽核。

### 2.2 不使用 Auth Admin API

Phase 7 不得在 Nuxt 應用程式使用：

- `supabase.auth.admin.inviteUserByEmail()`
- `supabase.auth.admin.createUser()`
- `supabase.auth.admin.listUsers()`
- `supabase.auth.admin.updateUserById()`
- `supabase.auth.admin.deleteUser()`

原因：

- 這些操作需要 Supabase secret／`service_role` 等高權限憑證。
- Phase 5、6 已建立「Nuxt app 不使用 `service_role`」的安全基線。
- 本階段不得為了方便管理帳號而擴大整個 server runtime 的資料庫與 Auth 權限。

若未來確實需要應用程式自動寄送 Supabase Auth 邀請、建立或刪除 Auth 使用者，必須另開獨立 Phase，設計隔離的受信任執行環境、secret rotation、稽核、速率限制與事故處理；不得在 Phase 7 偷渡。

### 2.3 邀請接受方式

Phase 7 採：

```text
既有 Supabase Auth 帳號
+ Email/Password 驗證
+ 一次性邀請 token
+ 原子化資料庫授權函式
```

流程：

1. Active admin 建立邀請。
2. Server 回傳只顯示一次的邀請連結。
3. 管理員以安全管道將連結交給受邀者。
4. 受邀者必須先擁有相同 email 的 Supabase Auth 帳號。
5. 受邀者開啟 `/auth/admin-invite#token=<raw-token>`。
6. 頁面讀取 fragment 後立即從網址列清除 token。
7. 受邀者輸入 email 與 password。
8. Server 使用既有 Supabase Email/Password 認證建立 session。
9. Server 以該 authenticated session 呼叫邀請接受 RPC。
10. RPC 驗證 Auth email 與 invitation email 完全相符。
11. RPC 原子化啟用 `admin_users`、消耗 invitation 並寫入 audit log。
12. 成功後導向 `/admin`。
13. 任一步驟失敗時，不得留下具有管理權限的半完成狀態。

本階段不建立公開註冊頁。

---

## 3. 必須保留的 Phase 5、6 基線

下列條件不可退化：

### 3.1 Authentication 與 session

- Supabase Email/Password Auth。
- HttpOnly cookie SSR session。
- 頁面重整後 session 可正確恢復。
- 登出後 session 與後台權限立即失效。
- 不將 access token、refresh token 或 session 寫入自訂 localStorage。
- 不在 console、server log、測試輸出或文件印出密碼、token、cookie。

### 3.2 Server authorization

- 所有管理頁面與管理 API 必須有伺服器端授權。
- 所有管理 API handler 必須明確執行既有 `requireAdmin(event)` 或等效 helper。
- client middleware 只能改善導頁體驗，不可取代 server authorization。
- 登入成功不等於取得管理員權限。
- inactive admin 必須被視為 non-admin。

### 3.3 Database 與 RLS

- `admin_users` 持續啟用 RLS。
- `public.is_admin()` 持續只依 `auth.uid()` 與 `is_active` 判斷。
- `is_admin()` 若為 `security definer`，必須固定 `search_path`。
- anon 只能讀取 published 活動。
- non-admin 不可讀取 draft、不可寫入活動、資產或影片。
- active admin 才能使用 Phase 6 管理 API。
- 不得新增 `authenticated FOR ALL` policy。
- 不得授予 `BYPASSRLS`。
- 不得讓 client 直接修改 `admin_users`。

### 3.4 Phase 6 功能

下列功能必須持續通過：

- 活動新增、編輯、刪除。
- draft／published。
- 活動圖片與附件。
- 封面、排序、alt text。
- 外部影片連結。
- 私有 `activity-assets` bucket。
- 公開資產 proxy。
- Phase 5、Phase 6 smoke test。
- production `/supabase-test` 回傳 404。
- SSR、hydration、browser console 無錯誤。

---

## 4. Phase 7 範圍

### 4.1 In scope

- 管理員名單唯讀查詢。
- 管理員 email、active 狀態、授權時間與安全的最後登入摘要。
- 建立一次性邀請。
- 邀請到期時間。
- 邀請撤銷。
- 邀請接受。
- 管理員停用。
- 管理員重新啟用。
- 自我停用防護。
- 最後一位 active admin 防護。
- 並行停用競態防護。
- append-only access audit log。
- Admin UI、invite acceptance UI。
- server API、validation、錯誤契約。
- migration、RLS、grants、RPC、verification SQL。
- Phase 7 smoke、Browser 驗收與回歸測試。
- 完整結案報告、commit、tag。

### 4.2 Out of scope

不得實作：

- Nuxt runtime 的 `service_role` 或 Supabase secret key。
- Auth Admin API。
- 公開註冊。
- 自動建立 Supabase Auth 使用者。
- 應用程式自動寄送 Auth invitation email。
- 刪除、封鎖或修改 `auth.users`。
- 忘記密碼／重設密碼流程。
- Email 變更。
- OAuth。
- MFA。
- 多角色 RBAC。
- editor、reviewer、super-admin 等角色。
- JWT custom claims 或 Auth Hook。
- 欄位級權限矩陣。
- 管理員審核工作流。
- Realtime。
- CI/CD。
- Cloudflare 正式部署。
- Wix 批次搬遷。
- Posts、Files、FAQ、Settings 的正式 CRUD。
- Phase 8 或其他未定義功能。
- 主動 push 到遠端 Git repository。

Phase 7 的權限只有：

```text
active admin
inactive／non-admin
```

不得為未確認需求預先建立 role table 或 permission matrix。

---

## 5. 開始前必要檢查

Codex 開始修改前必須執行並記錄：

```bash
cd C:\Users\Admin\Documents\Codex\2026-06-24\phase-1-phase-2-supabase-mock

git status --short
git branch --show-current
git rev-parse HEAD
git log --oneline --decorate -8
git tag --points-at HEAD

node --version
pnpm --version
```

預期基準：

```text
branch: main
commit: f79af10
tag: phase-6-admin-activity-crud-storage-complete
```

若 HEAD 不符合：

1. 不得自行 reset、checkout 或覆蓋使用者變更。
2. 先判斷是否為使用者在 Phase 6 後新增的合法 commit。
3. 在報告中記錄實際基準與差異。
4. 若無法確認安全基準，停止建立 Phase 7 complete tag。

接著檢查：

```text
package.json
pnpm-lock.yaml
nuxt.config.ts
.env.example
.gitignore

composables/useAdminAuth.ts
composables/useAdminActivities.ts

middleware/
pages/admin/
pages/auth/
server/api/
server/middleware/
server/utils/

supabase/migrations/
supabase/verify-admin-auth.sql
supabase/verify-admin-crud.sql

scripts/phase5-auth-smoke.mjs
scripts/phase6-admin-crud-smoke.mjs

outputs/
codexSteps/
```

另必須確認遠端：

- 至少一位 `admin_users.is_active = true`。
- Phase 5 `is_admin()` 安全屬性仍正確。
- Phase 6 migration 已套用。
- Phase 5、6 smoke 仍可執行。
- 已準備一個「目前為 non-admin」的專用測試 Auth 帳號。
- 測試帳號不得與正式唯一管理員共用。

---

## 6. 執行原則

### 6.1 先讀現況，再設計 migration

- 現有 migration 是 source of truth。
- 不得假設 `admin_users` 欄位與早期規格完全相同。
- 先檢查實際 table、constraint、index、trigger、grant、policy 與 function。
- 新增 Phase 7 migration，不得改寫已套用的 Phase 5、6 migration。
- 不得 drop 或重建 `admin_users`。
- 不得清空 Auth 或正式內容資料。

### 6.2 最小權限

- 管理員資料表不提供一般 authenticated direct CRUD。
- 邀請 token hash 不可透過 PostgREST table query 讀取。
- audit log 不可由 client direct INSERT、UPDATE 或 DELETE。
- 權限變更由受控 RPC 原子化執行。
- server API 使用使用者自己的 session；不使用超級權限 client。

### 6.3 不做無關重構

- 不升級 Nuxt、Vue、Supabase SDK 或 Tailwind major version。
- 不替換整套 Auth。
- 不重寫 Phase 6 Activities 模組。
- 不改變公開前台視覺或內容。
- 不刪除 mock fallback。
- 不修改無關的未追蹤檔案。
- 不提交 `.env`、帳密、token、cookie、測試輸出或 secret。

---

## 7. 資料模型

## 7.1 擴充 `admin_users`

沿用現有 `public.admin_users`。

Codex 必須依現有 schema 非破壞性加入或確認以下領域資訊：

```text
user_id             uuid primary key references auth.users(id) on delete cascade
is_active           boolean not null
created_at          timestamptz not null
updated_at          timestamptz not null
granted_at          timestamptz
granted_by          uuid null references auth.users(id)
deactivated_at      timestamptz null
deactivated_by      uuid null references auth.users(id)
```

要求：

- 既有第一位管理員 migration 後仍為 active。
- 既有 row 的 `granted_at` 可回填為 `created_at` 或 migration 時間。
- bootstrap 管理員的 `granted_by` 可以為 null。
- `is_active = true` 時，`deactivated_at` 與 `deactivated_by` 應為 null。
- 停用時寫入 deactivated metadata。
- 重新啟用時清除 deactivated metadata。
- 使用既有 updated_at trigger；若沒有，再以一致方式新增。
- 不在 table 重複保存密碼、token 或 Auth metadata。
- 本階段不新增 `role` 欄位。

Email 不建議直接複製保存於 `admin_users`。管理員清單應由受控 `security definer` function 讀取 `auth.users` 的最小必要欄位。

## 7.2 `admin_invitations`

新增：

```text
public.admin_invitations
```

領域欄位：

```text
id                uuid primary key default gen_random_uuid()
email             text not null
token_hash        bytea not null unique
expires_at        timestamptz not null
invited_by        uuid not null references auth.users(id)
accepted_by       uuid null references auth.users(id)
accepted_at       timestamptz null
revoked_by        uuid null references auth.users(id)
revoked_at        timestamptz null
created_at        timestamptz not null default now()
updated_at        timestamptz not null default now()
```

狀態判斷：

```text
accepted：accepted_at is not null
revoked：revoked_at is not null
expired：未 accepted／revoked 且 expires_at <= now()
pending：未 accepted／revoked 且 expires_at > now()
```

要求：

- email 寫入前先 `lower(trim(email))`。
- email 長度不得超過 254。
- 同一 email 同時最多一筆 pending invitation。
- 已有 active admin 的 email 不可再建立 invitation。
- 已有 inactive admin 時，不建立 invitation；應使用重新啟用。
- token 原文不得寫入 table。
- token 至少 256-bit 隨機值。
- 建議使用 `extensions.gen_random_bytes(32)` 產生，並以 hex 或 base64url 回傳。
- table 只保存 `digest(raw_token, 'sha256')`。
- raw token 只在建立 invitation 的 RPC response 出現一次。
- accepted invitation 不可再次使用。
- revoked／expired invitation 不可接受。
- accepted、revoked 不可同時存在。
- 建立適當 partial unique index 與查詢 index。
- 不得將 token 放入 audit metadata。

建議 constraint：

```text
NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL)
```

## 7.3 `admin_access_audit_logs`

新增 append-only table：

```text
public.admin_access_audit_logs
```

領域欄位：

```text
id                bigint generated always as identity primary key
actor_user_id     uuid null references auth.users(id)
action            text not null
target_user_id    uuid null references auth.users(id)
target_email      text null
invitation_id     uuid null references admin_invitations(id)
metadata          jsonb not null default '{}'::jsonb
created_at        timestamptz not null default now()
```

允許 action：

```text
invitation_created
invitation_revoked
invitation_accepted
admin_activated
admin_deactivated
```

要求：

- audit row 由權限 RPC 內部寫入。
- client 不可 direct INSERT。
- authenticated 不可 direct UPDATE 或 DELETE。
- UI 只能讀取安全欄位。
- metadata 不得保存 raw token、password、cookie、JWT、IP 全值或 Supabase error object。
- 測試事件可保存 `test_run_id`，但不得降低 production 權限。
- audit row 一旦建立即視為安全歷史，不因 smoke cleanup 任意刪除。

---

## 8. Database functions 與安全要求

所有 `security definer` function 必須：

- 明確 `SECURITY DEFINER`。
- 使用固定 `search_path`；優先 `SET search_path = ''` 並完整 schema qualification。
- 不接受 caller 指定 actor user id。
- actor 一律由 `auth.uid()` 取得。
- email 一律由受信任 Auth claim 或 `auth.users` 取得。
- 開頭明確檢查 session。
- 管理操作明確檢查 `public.is_admin()`。
- `REVOKE EXECUTE ... FROM PUBLIC`。
- 只向必要的 `authenticated` role 授予 execute。
- 不把 function owner 設為一般應用程式 role。
- 不在回傳值暴露 `token_hash`。
- 不使用 dynamic SQL，除非有不可替代需求並完整防止 injection。
- 權限變更與 audit insert 在同一 transaction 內完成。

## 8.1 `create_admin_invitation`

建議名稱：

```text
public.create_admin_invitation(p_email text, p_expires_in_days integer)
```

執行者：

```text
authenticated active admin only
```

行為：

1. 驗證 actor 已登入且為 active admin。
2. normalize email。
3. 驗證 email 基本格式與長度。
4. expiry 預設 7 天，允許 1 至 30 天。
5. 確認 email 不是 active admin。
6. 確認 email 不是 inactive admin。
7. 撤銷同 email 已失效但仍 pending 的舊 invitation，或明確回傳 conflict；不得同時存在多筆 pending。
8. 產生 32 bytes 隨機 raw token。
9. 只保存 token digest。
10. 建立 invitation。
11. 建立 `invitation_created` audit。
12. 回傳：
   - invitation id
   - normalized email
   - expires_at
   - raw token

raw token 只允許在本次 response 中出現。

## 8.2 `accept_admin_invitation`

建議名稱：

```text
public.accept_admin_invitation(p_token text)
```

執行者：

```text
authenticated user
```

不要求 caller 事先為 admin。

行為：

1. 驗證 `auth.uid()` 不為 null。
2. 讀取 authenticated user 的可信 email。
3. normalize Auth email。
4. 以 token digest 查找 invitation。
5. 使用 row lock，防止同一 token 並行接受。
6. 驗證 invitation pending、未過期、未撤銷、未接受。
7. 驗證 Auth email 與 invitation email 相同。
8. 若該 user 已為 active admin：
   - 不重複新增。
   - invitation 可標記為 accepted by same user，或回傳明確 idempotent success。
9. 若該 user 已有 inactive admin row：
   - 重新啟用。
   - 清除 deactivated metadata。
10. 若無 admin row：
   - 新增 active admin。
11. 將 invitation 標記 accepted。
12. 寫入 `invitation_accepted`。
13. 若同時發生 reactivation，另寫入 `admin_activated`，或在 acceptance audit metadata 清楚記錄；不得產生互相矛盾紀錄。
14. 全部成功才 commit。
15. 回傳最小必要結果。

不得只依 client 傳入 email 判斷身分。

## 8.3 `revoke_admin_invitation`

建議名稱：

```text
public.revoke_admin_invitation(p_invitation_id uuid)
```

執行者：

```text
authenticated active admin only
```

行為：

- pending invitation 可撤銷。
- accepted invitation 不可撤銷成未接受狀態。
- 已撤銷可 idempotent success。
- expired invitation可標記 revoked，或維持 expired；實作需一致。
- 寫入 `invitation_revoked` audit。
- 不回傳 token hash。

## 8.4 `set_admin_active`

建議名稱：

```text
public.set_admin_active(p_target_user_id uuid, p_is_active boolean)
```

執行者：

```text
authenticated active admin only
```

要求：

- target 必須存在於 `admin_users`。
- actor 不可停用自己。
- active → inactive：寫入 deactivated metadata。
- inactive → active：清除 deactivated metadata。
- 相同狀態可 idempotent success。
- 不可造成 active admin 數量為 0。
- 必須防止兩位管理員並行互相停用而同時通過檢查。
- 建議使用 transaction-level advisory lock，或等效可證明正確的序列化策略。
- 變更與 audit 必須同一 transaction。
- 不直接修改 `auth.users`。

## 8.5 `list_admin_accounts`

建議名稱：

```text
public.list_admin_accounts()
```

執行者：

```text
authenticated active admin only
```

允許回傳：

- user_id。
- email。
- is_active。
- granted_at。
- deactivated_at。
- created_at。
- updated_at。
- `auth.users.last_sign_in_at`。
- email confirmed 狀態的布林摘要；只有 UI 確實需要時才回傳。

不得回傳：

- encrypted password。
- confirmation token。
- recovery token。
- raw app metadata。
- raw user metadata。
- refresh token。
- provider token。
- phone；除非專案後續明確需要。
- 完整 `auth.users` row。

## 8.6 `list_admin_invitations`

執行者：

```text
authenticated active admin only
```

回傳：

- id。
- email。
- derived status。
- expires_at。
- invited_by 的安全 email 摘要。
- accepted_by 的安全 email 摘要。
- created_at。
- accepted_at。
- revoked_at。

不得回傳 token hash。

## 8.7 `list_admin_access_audit_logs`

執行者：

```text
authenticated active admin only
```

要求：

- 決定性排序：`created_at desc, id desc`。
- 支援 limit，範圍 1 至 100，預設 50。
- 建議 cursor pagination。
- 回傳 actor、target 的安全 email 摘要。
- metadata 先做 allowlist 或確保寫入來源已受控。

---

## 9. RLS、grants 與 function privileges

## 9.1 `admin_users`

- 持續啟用 RLS。
- 不新增 authenticated direct INSERT／UPDATE／DELETE。
- 不公開管理員名單 table SELECT。
- `is_admin()` 行為不得退化。
- 管理員列表與狀態變更只能透過受控 function。
- 若現有 grant 過寬，建立 migration 收斂，但不得破壞 Phase 5、6。

## 9.2 `admin_invitations`

- 啟用 RLS。
- anon 無 direct privilege。
- authenticated 無 direct table SELECT／INSERT／UPDATE／DELETE，或只保留經證明必要的最小 privilege。
- 邀請管理全部經由 function。
- token hash 永遠不可透過 table API 取得。

## 9.3 `admin_access_audit_logs`

- 啟用 RLS。
- anon 無權限。
- authenticated 無 direct INSERT／UPDATE／DELETE。
- 不建立一般 DELETE policy。
- 查詢只經由安全 function。

## 9.4 Function execute

明確：

```text
REVOKE ALL ON FUNCTION ... FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ... TO authenticated;
```

對每個 overload 使用完整 signature。

不得向 anon 授予：

- create invitation。
- accept invitation。
- revoke invitation。
- list admin。
- set admin active。
- list audit。

邀請接受前必須先完成 Email/Password authentication。

## 9.5 現有內容 RLS

Migration 不得更動或弱化：

- activities published public SELECT。
- admin activities SELECT／INSERT／UPDATE／DELETE。
- activity_assets policies。
- activity_videos policies。
- storage.objects `activity-assets` policies。
- `admin_users` 原有保護。
- Phase 5、6 grants。

不得因新增 access management 而使用 `FOR ALL` 簡化 policy。

---

## 10. 邀請 token 與 URL 安全

### 10.1 Token

- 至少 32 random bytes。
- 不使用 UUID 作為唯一 secret。
- 不使用時間戳、email hash 或可預測序號。
- DB 只存 SHA-256 digest。
- raw token 不寫入 audit。
- raw token 不寫入 server log。
- raw token 不寫入 analytics。
- raw token 不寫入 Git、文件、測試 snapshot。

### 10.2 URL

邀請 URL 使用 fragment：

```text
https://<site-origin>/auth/admin-invite#token=<raw-token>
```

理由：

- fragment 不會隨一般 HTTP request 傳送到 server。
- 可降低 access log、proxy log 與 Referer 洩漏風險。

invite page 必須：

1. 在 client mounted 後讀取 `location.hash`。
2. 將 token保存在 component memory。
3. 立即使用 `history.replaceState()` 清除網址 fragment。
4. 不將 token寫入 localStorage、sessionStorage、cookie 或 route state。
5. 不在畫面完整回顯 token。
6. 頁面卸載後清除記憶體 reference。

若 token遺失，無法重新取得；管理員必須撤銷並重建 invitation。

### 10.3 Invitation URL origin

- 不得直接信任任意 `Host` 或 `X-Forwarded-Host` 產生邀請網址。
- 使用既有可信 runtime config。
- `.env.example` 可新增：

```text
NUXT_PUBLIC_SITE_URL=https://example.invalid
```

- production 必須是正式 canonical HTTPS origin。
- localhost 開發可使用明確的開發 origin。
- response 設定 `Cache-Control: no-store`。

---

## 11. Server API 規格

所有管理 API 必須：

- 第一段授權流程呼叫 `requireAdmin(event)`。
- mutation 執行 existing `requireSameOrigin(event)` 或等效 same-origin 檢查。
- 使用使用者 session Supabase client。
- 不使用 service role。
- 使用共享 validation。
- 不接受 mass assignment。
- 不回傳原始 Supabase error。
- 不記錄 email/password/token/cookie。
- 設定合理 `Cache-Control`。

## 11.1 Admin access routes

建議：

```text
GET    /api/admin/access/admins
GET    /api/admin/access/invitations
POST   /api/admin/access/invitations
POST   /api/admin/access/invitations/:id/revoke
PATCH  /api/admin/access/admins/:userId
GET    /api/admin/access/audit
```

### `GET /admins`

回傳安全 admin list。

查詢不得直接從 client 存取 `auth.users`。

### `GET /invitations`

支援：

- status：all／pending／accepted／revoked／expired。
- 決定性排序。
- pending 優先顯示。
- 不回傳 token hash。

### `POST /invitations`

Body：

```ts
interface CreateAdminInvitationInput {
  email: string
  expiresInDays?: number
}
```

Response：

```ts
interface CreateAdminInvitationResponse {
  invitation: {
    id: string
    email: string
    expiresAt: string
  }
  inviteUrl: string
}
```

要求：

- `inviteUrl` 只回傳一次。
- `Cache-Control: no-store`。
- duplicate pending invitation：409。
- active admin email：409。
- inactive admin email：409，UI 提示使用重新啟用。
- 不得在 log 印出 response。

### `POST /invitations/:id/revoke`

- pending invitation 才能撤銷。
- 不存在：404。
- 已 accepted：409。
- 已 revoked 可 idempotent 200。
- mutation same-origin。

### `PATCH /admins/:userId`

Body：

```ts
interface UpdateAdminAccessInput {
  isActive: boolean
}
```

要求：

- 只接受 `isActive`。
- 不接受 caller 傳 actor id、email、role。
- self-deactivation：409。
- last active admin protection：409。
- 不存在：404。
- 成功回傳更新後安全摘要。

### `GET /audit`

Query：

```text
limit
cursor
action
```

要求：

- limit 1 至 100。
- action 只接受 allowlist。
- 不允許任意 SQL filter。
- no-store 或 private cache。

## 11.2 Invitation acceptance route

建立：

```text
POST /api/auth/admin-invite/accept
```

此 route 不使用 `requireAdmin()`，但必須：

- same-origin。
- 僅接受 HTTPS production origin。
- 使用既有 server-side Supabase auth 流程。
- 不建立公開 sign-up。
- 不在失敗後保留不必要 session。
- 不回傳 Supabase raw auth error。

Body：

```ts
interface AcceptAdminInvitationInput {
  email: string
  password: string
  token: string
}
```

流程：

1. validation。
2. 使用 Email/Password 認證。
3. 認證失敗：清除可能的 partial session，回傳通用 401。
4. 認證成功後，以該使用者 session 呼叫 `accept_admin_invitation(token)`。
5. 接受失敗：
   - 清除此次建立的 session。
   - 不授予權限。
   - 回傳通用 invitation error。
6. 接受成功：
   - 重新驗證 `is_admin()` 為 true。
   - 保留既有 HttpOnly SSR session。
   - 回傳 redirect target `/admin`。
7. 不將 password 或 token傳入 log、analytics、error context。

若 server client 無法在同一 request 中安全完成 sign-in、RPC 與 cookie propagation，Codex 應沿用 Phase 5 已驗證的 auth helper 拆分，但不得建立第二套互相衝突的 session 機制。

---

## 12. API 錯誤契約

沿用 Phase 6 既有錯誤格式。若需擴充，使用：

```ts
type AdminAccessErrorCode =
  | 'AUTH_REQUIRED'
  | 'ADMIN_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'VALIDATION_ERROR'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_CONFLICT'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_REVOKED'
  | 'INVITATION_ALREADY_USED'
  | 'INVITATION_EMAIL_MISMATCH'
  | 'ADMIN_ALREADY_ACTIVE'
  | 'ADMIN_INACTIVE'
  | 'ADMIN_NOT_FOUND'
  | 'SELF_DEACTIVATION_FORBIDDEN'
  | 'LAST_ACTIVE_ADMIN'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
```

狀態碼建議：

| 狀況 | HTTP |
|---|---:|
| 未登入 | 401 |
| 非 active admin | 403 |
| 帳密錯誤 | 401 |
| payload 不合法 | 400 |
| resource 不存在 | 404 |
| duplicate／狀態衝突 | 409 |
| invitation expired | 410 或沿用一致的 409 |
| 未預期錯誤 | 500 |

Invite acceptance UI 對使用者顯示通用訊息，不必逐項暴露：

```text
邀請無效、已失效，或帳號資料不相符。
```

Server log 可記錄安全 error code、request id 與 invitation id；不得記錄 raw token、password、完整 email/password payload 或 cookie。

---

## 13. Admin UI

## 13.1 路由

新增：

```text
/admin/access
/auth/admin-invite
```

可將管理員、邀請與 audit 放在同一頁分區或 tabs，不必拆成多個路由。

所有 `/admin/access` 資料皆由受保護 server API 取得。

`/auth/admin-invite` 必須排除 admin route middleware，且不可使用 admin layout 顯示受保護內容。

## 13.2 `/admin/access`

至少包含：

### 管理員區

欄位：

- email。
- active／inactive badge。
- granted at。
- last sign in。
- deactivated at。
- 啟用／停用按鈕。

行為：

- 不顯示刪除 Auth user。
- 不顯示 role selector。
- 當前登入者的停用按鈕 disabled，並顯示原因。
- 變更前顯示確認 dialog。
- mutation 成功後 refresh。
- 不做無法回復的 optimistic update。
- 403 時清除 stale admin state 並導向 login／無權限狀態。
- pending、empty、error、success 皆有明確 UI。

### 邀請區

欄位：

- email。
- status。
- created at。
- expires at。
- invited by。
- accepted by。
- revoke action。

建立 invitation form：

- email。
- expiry days，預設 7。
- 建立按鈕。
- pending 與重複提交防護。
- validation error。

建立成功後顯示一次性結果：

```text
此連結只顯示一次。關閉後無法重新查看，遺失時請撤銷並重建。
```

提供：

- readonly invite URL。
- Copy button。
- copied feedback。
- close button。

不得將 invite URL 存入全域 state、localStorage 或瀏覽器 console。

### 稽核區

顯示：

- 時間。
- action。
- actor。
- target。
- invitation email。
- 安全 metadata 摘要。

audit 為 read-only。

## 13.3 `/auth/admin-invite`

頁面流程：

1. mounted 後讀取 fragment token。
2. 立即清除網址 fragment。
3. token 缺失時顯示通用無效邀請狀態。
4. 顯示 email、password。
5. 不提供公開註冊。
6. 顯示說明：
   - 此流程只適用於已建立的 Supabase Auth 帳號。
   - 帳號 email 必須與 invitation 相同。
7. submit 至 server API。
8. success 導向 `/admin`。
9. failure：
   - 清除 password input。
   - token 不在 DOM 重複顯示。
   - 顯示通用錯誤。
10. 可返回 `/admin/login`。

安全與可用性：

- password input 正確 autocomplete。
- email 使用 autocomplete。
- Enter 可提交。
- 防止重複提交。
- label、focus、keyboard 操作可用。
- mobile layout 正常。
- 無 hydration mismatch。

---

## 14. Composable、型別與 validation

建議建立或擴充：

```text
shared/schemas/adminAccess.ts
types/adminAccess.ts

composables/useAdminAccess.ts
composables/useAdminInvitations.ts
composables/useAdminAudit.ts
composables/useAcceptAdminInvitation.ts
```

可依現有架構合併，但責任必須清楚。

要求：

- 沿用 Phase 6 現有 validation library／模式。
- 不為單一功能重複安裝第二套 schema library。
- 不使用 `any`。
- 不使用 `@ts-ignore`。
- 不關閉 strict。
- date、nullable 欄位、RPC return type 明確。
- Database generated types 若專案已有流程，migration 後更新。
- UI model 不直接等同原始 `auth.users` row。
- token 類型不得放入可持久化 state interface。
- 錯誤使用 discriminated union 或既有穩定契約。

Email normalization 必須 server／database 一致：

```text
lower(trim(email))
```

Client validation 只改善 UX，server 與 DB 仍需驗證。

---

## 15. 安全細節

### 15.1 Password 與 session

- password 只傳送至受信任 same-origin HTTPS server endpoint。
- 不記錄 request body。
- 不把 password 加入 error context。
- acceptance 失敗時清理 partial session。
- acceptance 成功後再次 server-side 驗證 active admin。
- 不將「已登入 non-admin」誤當 admin。

### 15.2 Email 隱私

- 管理員可查看其他管理員與 invitation email，因其為存取治理必要資訊。
- anon、non-admin 不可列出任何 email。
- Invite acceptance error 不應透露某 email 是否為管理員或是否存在 Auth。
- 不建立可被匿名查詢的 invitation preview API。

### 15.3 CSRF 與 origin

- 所有 mutation 使用 same-origin check。
- production 只接受 canonical HTTPS origin。
- 不依賴 CORS 作為 CSRF 防護。
- GET route 不執行邀請建立、撤銷、接受、啟用或停用。

### 15.4 XSS 與 URL

- invite URL 以文字或安全 input value 顯示。
- 不使用 `v-html`。
- email、audit metadata 以 Vue escaping 顯示。
- 不將 token 填入 query string。
- 不從 untrusted host 建立 URL。

### 15.5 Cache

下列 response 使用：

```text
Cache-Control: no-store
```

- create invitation。
- admin list。
- invitation list。
- audit list。
- invite acceptance。
- admin activation mutation。

### 15.6 Session 失效

停用管理員後：

- 其 Supabase Auth session 可能仍存在。
- 但下一次管理頁 SSR、API request、Phase 6 mutation 必須因 `is_admin() = false` 立即被拒絕。
- 不需也不得在 Phase 7 使用 Auth Admin API 強制撤銷全域 session。
- UI 收到 403 時應退出管理後台，並可執行一般 sign out 清理本機 session。

---

## 16. Migration 規格

新增一個或多個 Phase 7 migration，例如：

```text
supabase/migrations/20260716_001_phase7_admin_access_governance.sql
```

亦可依功能拆分：

```text
20260716_001_phase7_admin_invitations.sql
20260716_002_phase7_admin_access_audit.sql
20260716_003_phase7_admin_access_functions.sql
20260716_004_phase7_admin_access_privileges.sql
```

要求：

- 可重播。
- 使用 `create ... if not exists` 時仍需處理 constraint／function versioning，不可掩蓋 schema drift。
- function 使用 `create or replace` 前先確認不會留下危險 overload。
- 移除不再使用的舊 overload。
- 不修改已套用 migration。
- 不清除正式 admin_users。
- 不更動 Auth schema 結構。
- 不寫入真實 email、UUID、密碼、token。
- 不依賴 service role。
- 明確包含 table、constraint、index、RLS、grant、revoke、function。
- migration transaction 失敗時全部 rollback。
- Supabase SQL Editor 可執行。
- 執行前後皆記錄 verification 結果。

如需 `pgcrypto`：

- 先確認 Supabase 已提供 extension 與實際 schema。
- 不盲目假設 function 位於 `public`。
- 在固定 search_path function 中完整 schema qualification。

---

## 17. Verification SQL

新增：

```text
supabase/verify-admin-access.sql
```

至少驗證：

### Tables

- `admin_users` 欄位與 constraint。
- `admin_invitations` 存在。
- `admin_access_audit_logs` 存在。
- 三表 RLS enabled。
- index 與 partial unique index。
- FK delete behavior。

### Functions

- `is_admin()` 仍存在。
- Phase 7 functions 存在。
- security definer 屬性。
- 固定 search_path。
- owner。
- argument／return signature。
- 不存在危險 overload。

### Grants

- anon 不可 direct 存取三表。
- authenticated 不可 direct 修改三表。
- execute privilege 只授予必要 role。
- public 無 execute。
- 不存在 BYPASSRLS。
- 不存在 authenticated `FOR ALL`。

### Data safety

- 至少一位 active admin。
- 不輸出 token hash。
- 不輸出真實密碼、JWT、cookie。
- pending invitation 不重複。
- accepted 與 revoked constraint 正確。
- audit table 無 update／delete policy。

### Regression

- Phase 5 activities policy 仍正確。
- Phase 6 activity_assets、activity_videos、storage policies 仍正確。
- production `/supabase-test` 行為由應用驗證。

SQL 輸出需可供報告引用，但不得輸出敏感資料。Email 可遮罩，或只輸出 count／boolean。

---

## 18. 測試資料與帳號

Phase 7 驗收至少需要：

```text
primary active admin
phase7 non-admin Auth account
```

要求：

- 測試帳號 email、password 不寫入 repository。
- 透過環境變數提供。
- `.env.example` 只放 placeholder。
- 不使用正式唯一管理員作為受邀測試 target。
- 不刪除 Auth user。
- 測試前記錄 target 原始 admin 狀態。
- 測試後恢復 target 為原始狀態。
- 不得讓 active admin count 變成 0。

建議環境變數名稱沿用現有 smoke 命名規則，例如：

```text
PHASE7_ADMIN_EMAIL
PHASE7_ADMIN_PASSWORD
PHASE7_NON_ADMIN_EMAIL
PHASE7_NON_ADMIN_PASSWORD
PHASE7_BASE_URL
```

不得在 console 完整回顯變數內容。

---

## 19. Phase 7 smoke test

新增：

```text
scripts/phase7-admin-access-smoke.mjs
```

腳本必須：

- fail fast。
- 每一步有明確 PASS／FAIL。
- 不輸出密碼、token、cookie。
- raw invitation token 只保存在 process memory。
- finally 區塊恢復可恢復的 access state。
- 產生唯一 `test_run_id`。
- audit metadata 可記錄 `test_run_id`，但不得記錄 token。
- 若 cleanup 不完整，以非零 exit code 結束。

至少驗證：

### 19.1 anon

- 無法讀取 admin list。
- 無法讀取 invitation list。
- 無法讀取 audit。
- 無法建立／撤銷 invitation。
- 無法停用 admin。
- 無法未登入接受 invitation。

### 19.2 non-admin

- 可正常完成 Supabase Auth login。
- 無法存取 `/admin/access` API。
- 無法建立／撤銷 invitation。
- 無法啟用／停用 admin。
- 無法讀取 audit。

### 19.3 active admin

- 可讀取 admin list。
- 可讀取 invitation list。
- 可建立 invitation。
- response 包含一次性 invite URL。
- DB 不保存 raw token。
- 可撤銷 pending invitation。
- 可重新建立新 invitation。

### 19.4 invitation acceptance

- wrong email account 不可接受。
- wrong token 不可接受。
- revoked token 不可接受。
- expired token 不可接受。
- 正確 non-admin account 可接受。
- 接受後立即成為 active admin。
- 同一 token replay 不可再次授權。
- invitation 狀態為 accepted。
- audit 內容正確。

### 19.5 activation lifecycle

- primary admin 可停用 test admin。
- test admin 下一次 API request 立即得到 403。
- inactive test admin 不可使用 Phase 6 CRUD。
- primary admin 可重新啟用 test admin。
- reactivated admin 可重新進入後台。
- self-deactivation 被拒絕。

### 19.6 最後管理員與 concurrency

建立兩個有效 admin session，並行嘗試互相停用：

```text
Admin A deactivates Admin B
Admin B deactivates Admin A
```

預期：

- 不得兩者都成功。
- 最終 active admin count >= 1。
- 至少一個 request 回傳 conflict／last-admin protection。
- database 狀態與 audit 一致。

若無法穩定建立並行測試，Phase 7 不得宣告完整 DoD；不得只用順序測試取代競態驗證。

### 19.7 cleanup

- 恢復 primary admin 為 active。
- 恢復 test account 為測試前狀態。
- pending invitation 全部撤銷。
- 不留下可用 raw token。
- 不留下 active test admin，除非測試前原本即為 active。
- audit log 與 accepted invitation 歷史可保留，因其為 append-only 安全紀錄。
- 所有保留的測試 audit 必須包含 `test_run_id`。
- 報告明確列出保留的 immutable test history，不得宣稱「0 row」假裝刪除。

---

## 20. Browser 驗收

使用實際瀏覽器完整驗證。

### 20.1 Active admin

- 登入成功。
- `/admin/access` HTTP 200。
- 管理員列表正確。
- 建立 invitation。
- 一次性 modal 正確。
- Copy button 正確。
- close 後無法再次顯示 raw link。
- invitation list 不顯示 token。
- 可撤銷 invitation。
- 可停用／啟用其他 admin。
- 自己的停用按鈕不可操作。
- audit 正確更新。

### 20.2 Invitee

- 開啟 fragment invitation URL。
- token 立即從網址列清除。
- 頁面不在 console 印 token。
- wrong password 顯示通用錯誤。
- wrong email 顯示通用錯誤。
- 正確帳密完成接受。
- 導向 `/admin`。
- 可使用 Phase 6 activity management。
- replay 原 link 不可再次使用。

### 20.3 Inactive admin

- 已存在 session 時刷新 admin page。
- 不得先閃現管理內容。
- 導向 login 或顯示明確無權限。
- 直接呼叫 Phase 6 mutation API 回傳 403。
- browser 不出現 render error。

### 20.4 品質

檢查：

- 無 Vue warning。
- 無 runtime error。
- 無 hydration mismatch。
- 無 browser console error。
- 無 unhandled promise rejection。
- 無重複 listener 警告。
- loading、empty、error、success state。
- desktop／mobile layout。
- keyboard navigation。
- focus management。
- confirm dialog 可用。
- token、password、cookie 不出現在 DevTools console 或 rendered DOM。

Network request 本身會包含 acceptance payload；不得把該 request body截圖或寫入報告。

---

## 21. 品質驗證指令

依現有專案 scripts 執行。至少包含：

```bash
pnpm install --frozen-lockfile
pnpm exec nuxi typecheck
pnpm run build
pnpm run preview
```

再執行：

```bash
node scripts/phase5-auth-smoke.mjs
node scripts/phase6-admin-crud-smoke.mjs
node scripts/phase7-admin-access-smoke.mjs
```

若 package.json 已提供正式 script，優先使用：

```bash
pnpm run test:phase5
pnpm run test:phase6
pnpm run test:phase7
```

要求：

- frozen install 成功。
- typecheck 0 error。
- build 成功。
- preview 可啟動。
- Phase 5 smoke 通過。
- Phase 6 smoke 通過。
- Phase 7 smoke 通過。
- browser 驗收通過。
- verification SQL 通過。
- 無 secret 洩漏。

不得用：

- `--no-verify`
- 關閉 TypeScript strict
- `@ts-ignore`
- `any`
- 暫時關閉 RLS
- 使用 service role
- 跳過 Phase 5、6 regression

來取得表面成功。

---

## 22. 建議檔案範圍

依實際專案調整，可能包含：

```text
package.json
.env.example
nuxt.config.ts

shared/schemas/adminAccess.ts
types/adminAccess.ts

composables/useAdminAccess.ts
composables/useAcceptAdminInvitation.ts

components/admin/AdminAccessTable.vue
components/admin/AdminInvitationTable.vue
components/admin/AdminInvitationForm.vue
components/admin/AdminInvitationResultDialog.vue
components/admin/AdminAccessAuditLog.vue

pages/admin/access.vue
pages/auth/admin-invite.vue

server/api/admin/access/admins.get.ts
server/api/admin/access/admins/[userId].patch.ts
server/api/admin/access/invitations.get.ts
server/api/admin/access/invitations.post.ts
server/api/admin/access/invitations/[id]/revoke.post.ts
server/api/admin/access/audit.get.ts
server/api/auth/admin-invite/accept.post.ts

server/utils/adminAccessValidation.ts
server/utils/adminAccessErrors.ts
server/utils/adminInviteUrl.ts

supabase/migrations/<timestamp>_phase7_admin_access_governance.sql
supabase/verify-admin-access.sql

scripts/phase7-admin-access-smoke.mjs
outputs/phase-7-completion-report.md
```

不要為符合清單而建立無用途的空檔案。優先沿用現有：

- auth helper。
- requireAdmin。
- requireSameOrigin。
- API error helper。
- confirm dialog。
- loading／error components。
- validation schema。
- Supabase server client。
- TypeScript database types。

---

## 23. Definition of Done

只有下列全部成立，Phase 7 才可宣告完成。

### Repository

- [ ] 以 Phase 6 完成 commit／tag 為安全基準。
- [ ] 未覆蓋使用者未提交變更。
- [ ] 無不相關大型重構。
- [ ] 未升級框架 major version。
- [ ] 未提交 `.env`、帳密、token、cookie 或 secret。
- [ ] 未使用 service role。
- [ ] 未使用 Auth Admin API。

### Database

- [ ] Phase 7 migration 可重播。
- [ ] `admin_users` 非破壞性擴充。
- [ ] `admin_invitations` schema、constraint、index 正確。
- [ ] `admin_access_audit_logs` schema 正確。
- [ ] 三表 RLS 正確。
- [ ] authenticated 無危險 direct table writes。
- [ ] token 只保存 digest。
- [ ] security definer functions 固定 search_path。
- [ ] public／anon 無不必要 execute。
- [ ] active admin count 永不為 0。
- [ ] concurrency test 通過。
- [ ] audit append-only。
- [ ] Phase 5、6 policies 未退化。

### Invitation

- [ ] active admin 可建立 invitation。
- [ ] duplicate pending invitation 被阻止。
- [ ] active／inactive admin email conflict 正確。
- [ ] raw token 只顯示一次。
- [ ] URL 使用 fragment。
- [ ] token 不進入 DB、log、audit、localStorage。
- [ ] pending invitation 可撤銷。
- [ ] expired／revoked／accepted token 不可使用。
- [ ] invitation acceptance 原子化。
- [ ] Auth email 必須相符。
- [ ] replay 被阻止。

### Access lifecycle

- [ ] admin list 只對 active admin 可見。
- [ ] non-admin 不可列出 email。
- [ ] active admin 可停用其他 admin。
- [ ] inactive admin 立即失去 Phase 5、6 管理權。
- [ ] inactive admin 可重新啟用。
- [ ] self-deactivation 被阻止。
- [ ] concurrent mutual deactivation 不會留下 0 admin。
- [ ] 不直接修改 `auth.users`。

### Audit

- [ ] invitation created 有 audit。
- [ ] invitation revoked 有 audit。
- [ ] invitation accepted 有 audit。
- [ ] admin activated 有 audit。
- [ ] admin deactivated 有 audit。
- [ ] audit 無 token／password／cookie。
- [ ] client 無法修改或刪除 audit。
- [ ] audit UI read-only。

### API

- [ ] 管理 API 每個 handler 都明確 requireAdmin。
- [ ] mutation same-origin。
- [ ] invite acceptance 不依賴 client admin boolean。
- [ ] acceptance 失敗清除 partial session。
- [ ] API 不暴露 Supabase raw error。
- [ ] response 不可被 public cache。
- [ ] status／error code 穩定。

### UI

- [ ] `/admin/access` 完成。
- [ ] `/auth/admin-invite` 完成。
- [ ] 管理員、邀請、audit state 完整。
- [ ] one-time link dialog 正確。
- [ ] token 從網址列清除。
- [ ] inactive admin 無管理內容閃現。
- [ ] mobile、keyboard、focus 正常。
- [ ] 無 Vue warning、runtime error、hydration mismatch、console error。

### Tests

- [ ] frozen install。
- [ ] typecheck 0 error。
- [ ] build success。
- [ ] preview success。
- [ ] verification SQL 通過。
- [ ] Phase 5 smoke 通過。
- [ ] Phase 6 smoke 通過。
- [ ] Phase 7 smoke 通過。
- [ ] anon／non-admin／inactive-admin／active-admin 全部驗證。
- [ ] browser acceptance flow 通過。
- [ ] 可恢復的 fixture 已恢復。
- [ ] immutable test audit 已標記與報告。
- [ ] secret scan 通過。

### Git

- [ ] 工作樹只包含預期變更。
- [ ] 建立單一清楚 Phase 7 commit，或少量可追蹤 commits。
- [ ] 完成後 commit message 建議：
  `feat: complete Phase 7 admin access governance`
- [ ] 完成後建立 tag：
  `phase-7-admin-access-governance-complete`
- [ ] tag 只在所有 DoD 通過後建立。
- [ ] 未主動 push。
- [ ] Phase 8 尚未開始。

---

## 24. 停止條件

遇到下列狀況不得以不安全 workaround 繞過：

- Phase 6 基準 commit／tag 無法確認。
- 遠端至少一位 active admin 無法確認。
- 缺少獨立 non-admin 測試 Auth 帳號。
- 必須使用 service role 才能完成設計。
- 必須使用 Auth Admin API 才能完成設計。
- 現有 Auth helper 無法安全建立 HttpOnly session。
- migration 會破壞 admin_users 或 Auth data。
- 無法保證最後一位 active admin。
- concurrency test 顯示可能出現 0 admin。
- token 出現在 DB、log、audit、URL query 或 persistent client storage。
- invite acceptance 失敗後留下不應保留的 session。
- Phase 5、6 smoke regression。
- 測試可能停用或鎖死唯一正式管理員。
- 需要暫時關閉 RLS。
- 遠端資料可能因 destructive migration 受損。

處理方式：

1. 先完成所有可安全完成的本機程式、migration 與測試。
2. 不降低權限。
3. 不加入 service role。
4. 不宣告 DoD 通過。
5. 不建立 Phase 7 complete tag。
6. 在最終報告提供：
   - 精確錯誤。
   - 已完成項目。
   - 未完成項目。
   - 影響範圍。
   - 安全原因。
   - 必要人工操作步驟。

---

## 25. 完成報告格式

建立：

```text
outputs/phase-7-completion-report.md
```

至少包含：

### 25.1 執行摘要

- Phase 7 完成／未完成。
- 基準 commit／tag。
- 實際完成範圍。
- 是否建立 complete tag。

### 25.2 架構決策

明確記錄：

- 為何不使用 service role。
- 為何不使用 Auth Admin API。
- 為何 Auth user provisioning 保留在 Supabase Dashboard。
- invitation token 如何產生、保存與傳遞。
- inactive admin session 如何失去管理權。

### 25.3 修改檔案

逐項列出檔案與用途。

### 25.4 Migration

- migration 檔名。
- 遠端是否套用。
- table／function／RLS／grant 結果。
- verification SQL 結果。
- Supabase Security Advisor 與本階段相關警告。

### 25.5 API

逐 route 列出：

- auth requirement。
- input。
- output。
- error。
- same-origin。
- no-store。

### 25.6 身分矩陣

至少列出：

| 身分 | Admin list | Invite | Accept invite | Phase 6 CRUD |
|---|---:|---:|---:|---:|
| anon | deny | deny | deny | deny |
| non-admin | deny | deny | valid invitation only after auth | deny |
| inactive admin | deny | deny | 視 invitation 狀態 | deny |
| active admin | allow | allow | 不需要 | allow |

### 25.7 測試結果

- frozen install。
- typecheck。
- build。
- preview。
- verify SQL。
- Phase 5 smoke。
- Phase 6 smoke。
- Phase 7 smoke。
- concurrency。
- browser。
- console／hydration。

### 25.8 Cleanup 與 audit

- 恢復的測試狀態。
- 撤銷的 pending invitations。
- 保留的 immutable audit/test history。
- `test_run_id`。
- active admin 最終 count。

### 25.9 安全檢查

- service role scan。
- secret scan。
- token storage scan。
- log scan。
- function execute grants。
- direct table grants。
- last-admin protection。

### 25.10 Git

- branch。
- commit hash／message。
- tag。
- push 是否執行。
- git status。
- 未追蹤檔案。
- secret scan。

### 25.11 已知限制

只列真實且不阻塞 DoD 的限制，例如：

- Auth user 建立／刪除仍由 Supabase Dashboard 管理。
- 應用程式不自動寄送邀請 email。
- invitation link 需由 active admin 以安全管道傳遞。
- 不提供 password reset、MFA、RBAC。
- append-only smoke audit 會保留測試歷史。

### 25.12 下一階段

明確寫：

```text
Phase 7 已完成／未完成。
Phase 8 尚未開始。
```

不得提前實作 Phase 8。

---

## 26. Git 完成規格

只有完整 DoD 通過後：

```bash
git status --short
git diff --check
git diff --stat
```

執行 secret 掃描，至少搜尋：

```text
service_role
SUPABASE_SERVICE
eyJ
password=
refresh_token
access_token
admin invite raw token fixtures
```

確認無敏感資訊後：

```bash
git add <Phase 7 related files>
git commit -m "feat: complete Phase 7 admin access governance"
git tag phase-7-admin-access-governance-complete
```

最後驗證：

```bash
git status --short
git log -1 --oneline
git tag --points-at HEAD
```

不得：

- `git add .` 前不檢查。
- 提交 `.env`。
- 提交真實 email/password。
- 提交 raw invitation token。
- force push。
- amend 使用者既有 commit。
- 建立 tag 後才補測試。
- 未經使用者要求 push。

---

## 27. 給 Codex 的最終執行指令

```text
請在 March Out For Love 專案中依本文件完成 Phase 7。

先確認目前 branch、commit、tag、工作樹與 Phase 5/6 安全基準；不要直接開始改檔。以現有 migration、server auth helper、requireAdmin、requireSameOrigin、API error contract 與 Phase 6 測試為 source of truth。

本階段只做管理員邀請、存取權啟用／停用、最後管理員防護與 append-only audit。不要使用 service role，不要使用 Supabase Auth Admin API，不要建立公開註冊，不要直接管理 auth.users，不要做 RBAC、MFA、password reset、CI/CD、Wix 搬遷或 Phase 8。

所有權限變更必須由固定 search_path 的 security definer function 原子化處理；client 不得直接修改 admin_users、admin_invitations 或 audit table。邀請 token 至少 256-bit，資料庫只保存 digest，邀請 URL 使用 fragment，raw token 只顯示一次。

完成後必須依序通過 migration verification、Phase 5 smoke、Phase 6 smoke、Phase 7 smoke、並行停用測試、typecheck、build、preview 與實際 Browser 驗收。所有 DoD 通過前不得建立 Phase 7 complete tag。

最後建立 outputs/phase-7-completion-report.md，清楚記錄架構、安全、測試、cleanup、Git 與已知限制。
```

---

## 28. 技術參考基準

實作時以專案目前鎖定版本為準，不為追求最新 major version進行框架升級。

開始實作前，Codex 應重新查閱最新官方文件，至少包含：

- Supabase JavaScript Email/Password sign-in。
- Supabase Auth Admin API 的 server-secret 要求。
- Supabase Row Level Security。
- Supabase security definer function 安全與固定 search path。
- Supabase API keys 與 publishable／secret key權限差異。
- Supabase TypeScript generated types。
- Nuxt server routes、cookies、runtime config 與 error handling。
- Vue 3 Composition API 與 TypeScript。
- OWASP invitation token、session、CSRF 與 audit logging原則。

若官方文件與本規格的 API 細節因版本差異衝突：

1. 保留本文件的安全目標與 scope。
2. 以目前鎖定套件版本及最新官方文件調整語法。
3. 不得因此引入 service role、降低 RLS 或擴大範圍。
4. 在 completion report 記錄差異與最終實作。
