# Phase 7 完成報告

## 25.1 執行摘要

- 狀態：Phase 7 已完成。
- Phase 6 基準：`f79af10` / `phase-6-admin-activity-crud-storage-complete`。
- 開始時實際 HEAD：`26a1eae02891e65ea073e677b1256b4c674cb81f`（`main` 與 `origin/main` 一致）。該 merge commit 包含 Phase 6 commit，且 `git diff f79af10..26a1eae` 無檔案差異，因此以 Phase 6 tag 為功能與安全基準繼續。
- 完成範圍：管理員存取治理 schema、一次性邀請、啟用/停用、最後管理員與併發防護、append-only audit、server API、管理 UI、邀請接受 UI、migration verification、smoke test 與 Browser 驗收。
- Complete tag：只在本報告所列 DoD 全部通過後建立 `phase-7-admin-access-governance-complete`。
- 未開始 Phase 8，未 push。

## 25.2 架構決策

- 不使用 Supabase service role：本階段所有應用程式請求維持使用 anon key 加上使用者 JWT，權限判定交由 RLS 與固定 `search_path` 的 `SECURITY DEFINER` functions 執行，避免建立可繞過 RLS 的長期憑證。
- 不使用 Auth Admin API：應用程式只治理既有 Auth account 的管理權，不建立、刪除或直接修改 `auth.users`。
- Auth user provisioning 保留在 Supabase Dashboard：帳號生命週期由受信任人工流程管理；應用程式只建立對既有 email 的存取邀請。
- 邀請 token：由 atomic database function 以 `gen_random_bytes(32)` 產生 256-bit cryptographically secure random token；資料庫只保存 SHA-256 digest。raw token 只由該 function 回傳給 server 一次並出現在建立成功回應中，放在 URL fragment，未寫入 DB、audit、log 或 localStorage，並由 active admin 透過安全管道傳遞。
- 邀請接受：使用者先以既有 Auth account 登入，server function 在單一交易中核對 token digest、email、狀態與到期時間，再啟用管理權並消耗邀請；失敗時只清除該請求建立的 local session。
- Inactive admin：每個管理頁與 API request 都重新執行 active-admin 檢查；停用後即使原 Auth session 尚未到期，也無法取得 Phase 5、6 或 7 管理內容。
- 最後管理員防護：權限變更 function 使用 transaction-scoped advisory lock，在鎖內重新讀取狀態與 active count；禁止 self-deactivation，並確保併發互停不會產生 0 位 active admin。

## 25.3 修改檔案

- `.env.example`：新增 public site URL 與 Phase 7 smoke placeholders；僅含範例值。
- `nuxt.config.ts`：公開 `siteUrl` runtime config，供 fragment invitation URL 建立使用。
- `package.json`：新增 `test:phase7` script；未升級 dependency major version。
- `components/layout/AdminSidebar.vue`：加入管理員存取治理導覽。
- `middleware/admin-auth.global.ts`：允許登入後進入 `/admin/access`，並保留 inactive admin 防閃現行為。
- `server/middleware/admin-auth.ts`：將 Phase 7 管理 API 納入既有 server authorization 流程。
- `pages/admin/login.vue`：支援登入後返回 `/admin/access`。
- `server/utils/apiErrors.ts`：加入 Phase 7 穩定錯誤碼。
- `components/admin/AdminAccessAuditLog.vue`：唯讀稽核紀錄表。
- `components/admin/AdminAccessTable.vue`：管理員狀態表與啟用/停用確認流程。
- `components/admin/AdminInvitationForm.vue`：邀請建立表單與 validation。
- `components/admin/AdminInvitationResultDialog.vue`：只顯示一次的邀請 URL、copy feedback、focus 與 keyboard 行為。
- `components/admin/AdminInvitationTable.vue`：邀請狀態與撤銷操作。
- `composables/useAcceptAdminInvitation.ts`：fragment token 擷取、立即清除與接受流程。
- `composables/useAdminAccess.ts`：管理員、邀請、audit 載入與 mutations。
- `pages/admin/access.vue`：Phase 7 管理介面。
- `pages/auth/admin-invite.vue`：既有 Auth account 登入與 invitation acceptance 介面。
- `types/adminAccess.ts`：Phase 7 client/server shared types。
- `shared/schemas/adminAccess.ts`：email、expiry、UUID、active-state 與 audit cursor validation。
- `server/utils/adminAccessErrors.ts`：RPC error 到穩定 HTTP contract 的安全映射。
- `server/utils/adminAccessMappers.ts`：database RPC rows 到 response DTO 的映射。
- `server/utils/adminAccessValidation.ts`：server-side request/query validation。
- `server/utils/adminInviteUrl.ts`：256-bit token、SHA-256 digest 與 fragment URL 產生。
- `server/api/admin/access/admins.get.ts`：active-admin-only 管理員清單。
- `server/api/admin/access/admins/[userId].patch.ts`：管理員啟用/停用。
- `server/api/admin/access/invitations.get.ts`：active-admin-only 邀請清單。
- `server/api/admin/access/invitations.post.ts`：建立一次性邀請。
- `server/api/admin/access/invitations/[id]/revoke.post.ts`：撤銷 pending invitation。
- `server/api/admin/access/audit.get.ts`：active-admin-only、唯讀、cursor-based audit list。
- `server/api/auth/admin-invite/accept.post.ts`：登入使用者接受邀請。
- `supabase/migrations/20260716_001_phase7_admin_access_governance.sql`：schema、constraints、indexes、triggers、RLS、grants 與 atomic functions。
- `supabase/verify-admin-access.sql`：可回滾的 schema/security/invariant verification。
- `scripts/phase7-admin-access-smoke.mjs`：權限矩陣、邀請生命週期、atomic acceptance、replay、Phase 6 denial、併發與 cleanup 測試。
- `outputs/phase-7-completion-report.md`：本完成報告。

## 25.4 Migration

- Migration：`supabase/migrations/20260716_001_phase7_admin_access_governance.sql`。
- 遠端：已於 Supabase SQL Editor 套用。第一次嘗試因 PL/pgSQL composite `INTO` 語法錯誤而由 transaction 完整 rollback；修正後重新以完整 SQL 執行並成功 commit，未留下半套 schema。
- `admin_users`：非破壞性加入 granted/deactivated lifecycle metadata、state constraint、default 與 timestamp trigger。
- `admin_invitations`：normalized email、digest-only token、expiry/state constraints、pending uniqueness partial index。
- `admin_access_audit_logs`：append-only schema 與 mutation-prevention trigger。
- Functions：create/accept/revoke invitation、set admin active、list admins/invitations/audit；皆為固定 `search_path` 的 `SECURITY DEFINER` function。
- RLS/grants：三表皆啟用 RLS；anon/public 無 execute；authenticated 只取得必要 RPC execute，沒有危險 direct table write grants。
- Verification SQL 快照：`active_admin_count=1`、`pending_invitation_count=0`、`immutable_audit_count=24`、`phase7_schema_security_verified=true`。其後最後一輪 smoke 依 append-only 設計再追加 audit；最終讀取總數為 30。
- Supabase Security Advisor：遠端套用後 Dashboard 顯示 `Advisor found no issues` / `No security or performance issues found`，沒有本階段相關警告。

## 25.5 API

所有 route 都回傳 `Cache-Control: private, no-store`（或等價 no-store）、不回傳 Supabase raw error；mutation route 均檢查 same-origin。

| Route | Auth | Input | Output | 主要錯誤 | Same-origin |
|---|---|---|---|---|---:|
| `GET /api/admin/access/admins` | active admin | 無 | `{ admins }` | 401/403 | 不適用 |
| `PATCH /api/admin/access/admins/:userId` | active admin | `{ isActive }` | `{ admin }` | validation、self、last-admin、conflict | 是 |
| `GET /api/admin/access/invitations` | active admin | 無 | `{ invitations }` | 401/403 | 不適用 |
| `POST /api/admin/access/invitations` | active admin | `{ email, expiresInDays? }` | `{ invitation, invitationUrl }` | duplicate pending、active/inactive conflict、validation | 是 |
| `POST /api/admin/access/invitations/:id/revoke` | active admin | UUID path | `{ invitation }` | not found、not pending、validation | 是 |
| `GET /api/admin/access/audit` | active admin | `limit?`, `cursor?`, `action?` | `{ auditLogs, nextCursor }` | validation、401/403 | 不適用 |
| `POST /api/auth/admin-invite/accept` | existing Auth account credentials；server-side sign-in | `{ email, password, token }` | `{ success: true, redirectTo }` | invalid credentials；invalid/expired/revoked/accepted/email mismatch；統一安全錯誤 | 是 |

## 25.6 身分矩陣

| 身分 | Admin list | Invite | Accept invite | Phase 6 CRUD |
|---|---:|---:|---:|---:|
| anon | deny | deny | deny | deny |
| non-admin | deny | deny | valid invitation only after auth | deny |
| inactive admin | deny | deny | 視 invitation 狀態 | deny |
| active admin | allow | allow | 不需要 | allow |

## 25.7 測試結果

- `pnpm install --frozen-lockfile`：PASS（lockfile unchanged）。
- `pnpm exec nuxi typecheck`：PASS，0 error。專案未定義 `typecheck` package script，因此使用 Nuxt 官方 CLI entry。
- `pnpm run build`：PASS。只有 dependency 的 Node deprecation warning，無 build error。
- `pnpm run preview`：PASS，production build 於 `http://127.0.0.1:3000` 啟動。
- `supabase/verify-admin-access.sql`：PASS。
- `pnpm run test:phase5`：PASS，4 groups。
- `pnpm run test:phase6`：PASS，13 groups，cleanup complete。
- `pnpm run test:phase7`：PASS，10 groups，包含 anon、non-admin、inactive-admin、active-admin 與 Phase 5/6 regression。
- Concurrency：PASS；兩個 active admin 互相停用的 concurrent requests 不會同時成功，至少一方受 conflict/last-admin protection 阻擋，最終 active count 保持 1。
- Browser：PASS；anonymous redirect、active-admin login、invite create、one-time dialog、copy feedback、fragment 清除、matching-account accept、replay deny、deactivate、inactive login deny、revoke、390x844 mobile layout 與 keyboard/focus 均驗證。
- Console/hydration：0 Vue warning、0 runtime console error、0 hydration mismatch。

## 25.8 Cleanup 與 audit

- Primary admin：恢復並保持 active。
- 測試 Auth account：回復為 inactive admin；Auth account 本身未修改或刪除。
- Pending invitation：Phase 7 smoke 與 Browser synthetic invitation 均已撤銷或消耗；最終 count 0。
- Raw token：只存在於一次建立回應與 Browser 記憶體中；dialog 關閉/fragment 清除後不可再取得，無可用 raw-token fixture 留存。
- Immutable audit：最終保留 30 筆 Phase 7 歷史，包含 invite created/revoked/accepted、admin activated/deactivated 與 smoke/browser 測試事件；這些紀錄依設計不可 cleanup。
- `test_run_id`：最後一輪 smoke 為 `phase7-1784218242960-izdl8w6`；Browser cleanup run 為 `phase7-browser-1784217990041`。兩者均以 synthetic target email 留在 immutable audit。
- 最終 active admin count：1。

## 25.9 安全檢查

- 高權限金鑰/API scan：實作未引用高權限 server key，未呼叫 Auth Admin API。
- Secret scan：Phase 7 staged content 無真實帳密、JWT、cookie、access/refresh token、raw invite fixture 或 `.env.phase6.local`；`.env.example` 只有明確 placeholder。
- Token storage scan：DB column 為 `token_hash bytea`；audit verification 拒絕 64-hex/token/password/cookie-like metadata；client 未寫 localStorage。
- Log scan：server/test 不輸出 raw invitation URL、token、password 或 cookie。
- Function execute grants：public/anon 已 revoke；authenticated 僅必要 functions。
- Direct table grants：authenticated/anon 無三表 direct writes；client direct update/delete audit 的 smoke 測試被拒絕。
- Last-admin：advisory lock、鎖內 recheck、self protection 與 concurrent test 均通過。
- Append-only：DB trigger、revoked direct grants、verification 與 smoke mutation tests 均通過。

## 25.10 Git

- Branch：`main`。
- Phase 7 commit：本報告所在單一 commit，message `feat: complete Phase 7 admin access governance`；精確 hash 由 `phase-7-admin-access-governance-complete^{commit}` 解析，避免在同一 commit 內容中建立 self-referential hash。
- Tag：`phase-7-admin-access-governance-complete`，只在所有 DoD 與 staged secret scan 通過後建立。
- Push：未執行。
- Git status：Phase 7 commit 只納入 25.3 所列檔案。開始前已存在的 `codexSteps/project.md`、`codexSteps/project2.md` 刪除，以及未追蹤 `codexSteps/phase3.md` 至 `phase7.md`，均視為使用者變更，未覆蓋、未 stage、未提交，因此完成後 working tree 仍會顯示這些既有文件狀態。
- Secret scan：PASS；staged-only 掃描完成後才 commit/tag。

## 25.11 已知限制

- Auth user 建立/刪除仍由 Supabase Dashboard 管理。
- 應用程式不自動寄送 invitation email；一次性連結需由 active admin 透過安全管道傳遞。
- 不提供 password reset、MFA 或 RBAC。
- Append-only smoke/browser audit 依法保留測試歷史，無法也不應刪除。
- Supabase Dashboard 的 migration history 卡片不會辨識由 SQL Editor 手動套用的 migration；schema verification 與遠端行為測試已確認實際資料庫狀態。

## 25.12 下一階段

Phase 7 已完成。
Phase 8 尚未開始。
