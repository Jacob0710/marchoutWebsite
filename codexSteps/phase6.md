# March Out For Love
# Phase 6 Codex 實作規格：管理員活動 CRUD、發布流程與私有資產管理

> 文件用途：將本文件直接交給 Codex，讓 Codex 在既有 Phase 5 基準上完成 Phase 6。  
> 專案根目錄：`C:\Users\Admin\Documents\Codex\2026-06-24\phase-1-phase-2-supabase-mock`  
> 基準分支：`main`  
> 基準 Commit：`bb2778b feat: complete Phase 5 admin auth and read-only activities`  
> 基準 Tag：`phase-5-admin-auth-readonly-complete`

---

## 1. 任務目標

在不破壞 Phase 5 驗證、安全邊界與公開前台的前提下，完成真實 Supabase 後台活動管理功能：

1. 管理員新增活動。
2. 管理員編輯活動。
3. 管理員刪除活動。
4. 管理員將活動由草稿發布，或由已發布撤回為草稿。
5. 管理員上傳、排序、設定封面與刪除活動圖片。
6. 管理員上傳與刪除活動附件。
7. 管理員新增、排序與刪除外部影片連結。
8. 公開前台只顯示已發布活動及其資產。
9. anon、non-admin、admin 的資料庫與 API 權限必須持續隔離。
10. 建立可重複執行且會自行清理測試資料的 Phase 6 smoke test。

Phase 6 完成後，網站應由 Phase 5 的「管理員唯讀後台」提升為「可安全管理活動內容的後台」。

---

## 2. 必須保留的 Phase 5 安全基線

下列條件不可被弱化：

- Supabase Email/Password Auth。
- HttpOnly cookie SSR session。
- 既有 server-side `requireAdmin(event)`。
- 管理頁面與管理 API 的伺服器端授權。
- `admin_users` 已啟用 RLS。
- `is_admin()` 為 `security definer`，固定 `search_path`，只依 `auth.uid()` 判斷。
- anon 只能讀取 published 活動。
- non-admin 不能讀取 draft。
- admin 可讀取 published 與 draft。
- production 的 `/supabase-test` 必須維持 404。
- 不得在程式碼、migration、測試腳本、Git commit 或文件中引用或暴露 `service_role` key。
- 不得恢復任何 `authenticated` 全權 `FOR ALL` policy。
- 管理後台的 client route middleware 只負責使用者體驗，不能取代 server API 與 RLS。

所有新增管理 API 都必須在 handler 內明確呼叫 `requireAdmin(event)`；不得只依賴全域 middleware、頁面 middleware 或前端按鈕隱藏。

---

## 3. Phase 6 範圍

### 3.1 In scope

- `activities` 真實 CRUD。
- draft／published 狀態切換。
- 發布前完整欄位驗證。
- 私有 Supabase Storage bucket。
- 圖片及一般文件附件上傳。
- 活動圖片封面指定、排序與替代文字。
- 外部影片網址管理。
- 公開活動 API／頁面整合新資產資料。
- 管理端表單、錯誤顯示、載入狀態與確認操作。
- 資料庫 migration、RLS、grants、驗證 SQL。
- 可重複執行的 API／Auth smoke test。
- TypeScript typecheck、Nuxt build、preview、browser console 與 hydration 驗證。

### 3.2 Out of scope

不得實作下列功能：

- 管理員邀請。
- 新增多角色或權限群組。
- 使用者管理介面。
- 直接上傳影片檔案。
- TUS resumable upload。
- 圖片裁切器、轉檔、壓縮服務或 CDN 最佳化。
- 批次匯入 Wix 內容。
- 活動版本歷史、審核流程或排程發布。
- 富文字編輯器套件。
- Realtime。
- CI/CD。
- Phase 7 或其他未在本文件定義的功能。
- 主動 push 到遠端 Git repository。

影片在 Phase 6 僅保存 YouTube、Facebook、Instagram、Vimeo 或其他合法的 HTTPS 外部網址；不得將大型影片二進位檔混入本階段。

---

## 4. 執行原則

### 4.1 先檢查，再修改

開始前必須執行並記錄：

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git tag --points-at HEAD
pnpm --version
node --version
```

接著檢查：

- `package.json`
- `nuxt.config.ts`
- `types/`
- `utils/`
- `composables/useAdminAuth.ts`
- `composables/useAdminActivities.ts`
- `pages/admin/`
- `server/api/`
- `server/utils/`
- `server/middleware/`
- `supabase/migrations/`
- `supabase/verify-admin-auth.sql`
- `scripts/phase5-auth-smoke.mjs`
- 現有 `activities` table schema、欄位名稱、constraint、index、trigger 與 policy
- Phase 3 mock CRUD 頁面及其實際路由

既有資料庫 schema 是 source of truth。不得憑空假設欄位名稱後直接重建 `activities`。

### 4.2 不做破壞性重構

- 不得 drop 或 rename 現有公開前台正在使用的欄位。
- 若舊欄位已被新資料模型取代，本階段先保留相容性，不做破壞性移除。
- 不得清空或重建遠端 `activities`。
- 不得改寫既有 migration。
- 新增一個或多個新的 Phase 6 migration。
- 不得修改與 Phase 6 無關的未追蹤文件或 `codexSteps` 檔案。
- 不得提交 `.env`、測試帳密、cookie、token、Supabase secret 或本機輸出檔。

### 4.3 現有 Phase 3 mock CRUD

檢查舊 mock CRUD 頁面：

- 可安全沿用其 UI 時，改接 Phase 6 server API。
- 與正式管理路由重複時，移除或改名，避免存在兩組可操作路由。
- 不可繼續以 mock array、localStorage 或純前端狀態作為正式資料來源。
- 不得誤刪與公開前台仍有依賴的共用 component。

---

## 5. 資料模型

## 5.1 `activities`

沿用既有 `activities` table。Codex 必須先讀取現有 migration 和型別，再將下列「領域需求」映射到現有欄位。

活動至少需要支援：

- ID。
- 標題。
- slug。
- 活動日期。
- 年度。
- 分類：一般活動、服務活動、特殊活動。
- 地點。
- 參與人數。
- 活動成果／正文。
- 狀態：draft 或 published。
- 是否精選；若現有 schema 已支援則保留。
- 建立時間。
- 更新時間。
- 發布時間。
- 建立者／最後更新者；若現有 schema 尚未支援，使用非破壞性 migration 新增 nullable 欄位。
- 封面圖片 reference。

若現有狀態欄位不是 `status`，應沿用現有設計，不得同時建立第二套互相衝突的發布欄位。

若尚無封面 reference，新增：

```text
cover_asset_id -> activity_assets.id
ON DELETE SET NULL
```

先建立 `activity_assets`，再以 `ALTER TABLE` 增加外鍵。既有 `cover_image_url` 等欄位暫時保留，但公開 mapper 應逐步改由資產 metadata 產生顯示網址。

### 5.1.1 slug

- slug 必須唯一。
- 格式：小寫英數字，以單一 `-` 分隔。
- 建議 regex：

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

- 前端可以由標題提出預設 slug，但 server 必須再次驗證。
- duplicate slug 回傳 HTTP 409，不得回傳模糊的 500。

### 5.1.2 draft 與 published

draft 可以保存尚未完整的內容，但至少必須有可識別的標題。

發布時必須符合：

- 標題有效。
- slug 有效且唯一。
- 活動日期有效。
- 年度有效。
- 分類有效。
- 地點不為空。
- 活動成果／正文不為空。
- 參與人數若有值，必須為大於或等於 0 的整數。
- `cover_asset_id` 若有值，必須屬於同一活動且為圖片。
- 不強制必須有圖片；沒有圖片時沿用現有 fallback cover。

撤回發布時：

- 狀態改回 draft。
- 公開列表與公開 slug 立即不可見。
- 是否清除 `published_at` 應依現有 schema 慣例決定；不得同時產生互相矛盾的狀態。

---

## 5.2 `activity_assets`

若不存在，建立活動資產 metadata table。欄位概念如下，實際 FK 型別必須與現有 `activities.id` 完全一致：

```text
id                uuid primary key default gen_random_uuid()
activity_id       foreign key -> activities.id on delete cascade
kind              text check in ('image', 'attachment')
storage_bucket    text not null default 'activity-assets'
storage_path      text not null unique
original_name     text not null
mime_type         text not null
size_bytes        bigint not null check (size_bytes > 0)
alt_text          text null
sort_order        integer not null default 0
created_by        uuid null
created_at        timestamptz not null default now()
updated_at        timestamptz not null default now()
```

要求：

- `storage_path` 不可保存完整 Supabase URL。
- API response 不得對公開前台暴露原始 bucket path。
- `kind = image` 才能被設為封面。
- `alt_text` 對圖片可編輯；附件可以為 null。
- `sort_order` 必須可調整。
- 為 `activity_id`、`kind`、`sort_order` 建立適當 index。
- 若專案已有一致的 `updated_at` trigger，沿用既有方式。

---

## 5.3 `activity_videos`

影片只保存外部連結。若現有 schema 沒有可支援多筆影片的結構，建立：

```text
id                uuid primary key default gen_random_uuid()
activity_id       foreign key -> activities.id on delete cascade
url               text not null
title             text null
sort_order        integer not null default 0
created_by        uuid null
created_at        timestamptz not null default now()
updated_at        timestamptz not null default now()
```

要求：

- 只接受 `https://`。
- 不允許 `javascript:`、`data:`、相對路徑或空字串。
- 若要嵌入影片，必須由 server-side allowlist mapper 轉換；不得直接將任意 URL 塞入 `iframe src`。
- 無法安全轉換的 URL 以一般外部連結顯示。
- 不得保存任意 iframe HTML。

---

## 6. Storage 設計

## 6.1 Bucket

建立單一私有 bucket：

```text
activity-assets
```

要求：

- `public = false`。
- 不得使用 public bucket 暫存 draft 圖片。
- bucket 可透過新 migration 可重現建立。
- 不得直接對 `storage.objects` 執行手動 INSERT、UPDATE 或 DELETE；物件操作必須經由 Supabase Storage API。
- bucket 層級最大檔案限制設為 20 MB。
- API 再依資產種類執行更嚴格限制。

### 6.1.1 允許的圖片格式

- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif`

圖片最大 10 MB。

### 6.1.2 允許的附件格式

至少支援：

- PDF
- TXT
- DOC／DOCX
- XLS／XLSX
- PPT／PPTX

附件最大 20 MB。

不得只依副檔名判斷。必須同時檢查：

- MIME type allowlist。
- 原始檔名副檔名。
- 實際 server 接收到的大小。
- 空檔案。

不接受可執行檔、HTML、SVG、JavaScript、壓縮執行檔或未在 allowlist 的 MIME。

## 6.2 Storage path

使用不可預測且不覆寫的 immutable path：

```text
<activity-id>/<kind>/<random-uuid>.<normalized-extension>
```

例如：

```text
8c1.../image/71f....webp
8c1.../attachment/cc2....pdf
```

要求：

- 不將使用者原始檔名直接放入 storage path。
- 原始檔名只保存在 `activity_assets.original_name`。
- 使用 server 產生的 UUID。
- 移除 path traversal 風險。
- `upload(..., { upsert: false })`。
- 替換檔案採「上傳新物件 → 更新 metadata/reference → 刪除舊物件」，不使用固定檔名覆寫。
- 因採 immutable path，Phase 6 不需要開放一般 Storage UPDATE policy。

## 6.3 私有資產存取

不要在 SSR payload 中永久保存長效 signed URL。

建立穩定的 server proxy route：

```text
GET /api/public/activity-assets/:assetId
GET /api/admin/activity-assets/:assetId/file
```

### Public route

- 查詢 asset 與 parent activity。
- parent 必須為 published。
- 不符合條件一律 404，避免透露 draft 是否存在。
- 使用匿名 Supabase client 依 RLS 建立短效 signed URL。
- 回傳 302 redirect。
- 設定適當的 `Cache-Control`，避免長期快取過期 signed URL。
- 可支援 `?download=1`；附件下載檔名採 metadata 中的安全原始檔名。

### Admin route

- 第一行執行 `requireAdmin(event)`。
- 可預覽 draft 與 published 資產。
- 建立短效 signed URL 後 302 redirect。
- 不直接回傳 bucket path。

公開活動 API 應回傳穩定 proxy URL，例如：

```text
/api/public/activity-assets/<asset-id>
```

而不是回傳 bucket path、public URL 或長效 signed URL。

---

## 7. Database RLS 與 grants

所有 policy 必須使用明確 operation。不得使用 `FOR ALL`。

## 7.1 `activities`

保留既有 anon published SELECT policy 與 Phase 5 admin SELECT policy，再新增：

### INSERT

```sql
FOR INSERT
TO authenticated
WITH CHECK ((select public.is_admin()));
```

### UPDATE

```sql
FOR UPDATE
TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));
```

### DELETE

```sql
FOR DELETE
TO authenticated
USING ((select public.is_admin()));
```

實際 SQL 必須符合目前函式 schema 與命名。

## 7.2 `activity_assets`

建立分離 policy：

- anon／authenticated：只 SELECT parent activity 為 published 的 metadata。
- authenticated admin：SELECT 所有 metadata。
- authenticated admin：INSERT。
- authenticated admin：UPDATE。
- authenticated admin：DELETE。

公開 SELECT policy 應以 `EXISTS` 檢查 parent activity 是否符合既有 published 條件。

## 7.3 `activity_videos`

與 `activity_assets` 相同：

- 公開只可讀 published parent。
- admin 可讀全部。
- INSERT、UPDATE、DELETE 各自獨立 admin policy。

## 7.4 `storage.objects`

只針對 `bucket_id = 'activity-assets'` 建立精確 policy。

### Public SELECT

允許 anon／authenticated 取得 published activity 的物件。storage path 第一層必須可安全解析為 activity ID，並能對應 published activity。

可使用：

```sql
(storage.foldername(name))[1]
```

搭配 parent activity 查詢。實際 cast 必須依 `activities.id` 型別處理，且不可讓無效 path 造成 query error。

### Admin SELECT

```text
bucket 正確 AND is_admin()
```

### Admin INSERT

條件至少包含：

- bucket 正確。
- `is_admin()`。
- folder 第一層為現有 activity ID。
- folder 第二層只允許 `image` 或 `attachment`。
- 檔案 extension 符合 allowlist。

### Admin DELETE

```text
bucket 正確 AND is_admin()
```

不新增一般 UPDATE policy。

## 7.5 grants

RLS policy 不能取代 table privilege。migration 必須檢查並明確設定最小必要 grants：

- `anon`：只授予公開查詢所需的 `SELECT`。
- `authenticated`：對 `activities`、`activity_assets`、`activity_videos` 授予執行管理操作所需的 table privileges，再由 RLS 限制是否為 admin。
- 不授予 non-admin 可繞過 RLS 的權限。
- 不新增對 `admin_users` 的不必要直接存取。
- 不授予任何 role `BYPASSRLS`。
- 不在應用程式使用 postgres role 或 service role。

migration 完成後執行 Supabase Security Advisor；若有新警告，記錄並修正與本階段有關的項目。

---

## 8. Server API

所有 API 必須：

- 使用現有 server-side Supabase client。
- 使用請求 cookie 中的使用者 session。
- 不使用瀏覽器 Supabase client直接寫入。
- 管理 API 明確呼叫 `requireAdmin(event)`。
- 使用共享 validation schema。
- 正確轉換 Supabase error，不暴露 SQL、policy、內部 table 結構或 token。
- 對預期錯誤回傳穩定 status code 與 error code。
- mutation route 驗證 same-origin `Origin`；若 header 存在且不是本站 origin，拒絕請求。
- 不在 server log 印出密碼、access token、refresh token、完整 cookie 或測試憑證。

## 8.1 Activity routes

沿用現有唯讀 route，並新增或擴充：

```text
GET    /api/admin/activities
POST   /api/admin/activities
GET    /api/admin/activities/:id
PATCH  /api/admin/activities/:id
DELETE /api/admin/activities/:id
POST   /api/admin/activities/:id/publish
POST   /api/admin/activities/:id/unpublish
```

### `GET /api/admin/activities`

支援：

- status filter：all／draft／published。
- category filter。
- year filter。
- 關鍵字查詢標題或 slug。
- 穩定排序。
- 查詢結果包含必要的資產摘要，但不要產生大量不必要 signed URL。

若資料量尚小，可先不做複雜 pagination；但 API response 結構應避免未來無法擴充。

### `POST /api/admin/activities`

- 建立 draft。
- 不允許直接利用不完整 payload 發布。
- server 設定 created/updated user。
- 回傳建立後的 activity。
- duplicate slug：409。
- validation error：400。

### `PATCH /api/admin/activities/:id`

- 只接受 allowlist 欄位。
- 不允許 mass assignment。
- 一般編輯不得繞過 publish validation 將非法資料直接變成 published。
- 若活動目前已 published，更新後仍須符合 publish validation；否則回傳 400。
- 更新 updated user／updated timestamp。
- 不存在：404。

### `DELETE /api/admin/activities/:id`

- 明確要求管理員。
- 先取得所有 asset path。
- 刪除 activity row，使 metadata／videos 依 FK cascade。
- 再使用 Storage API 移除物件。
- 正常路徑不得留下 DB metadata 或 Storage object。
- Storage cleanup 若失敗：
  - 不得假裝完整成功。
  - 回傳清楚且不洩漏敏感資訊的 cleanup warning。
  - server log 記錄可重試的 object path，但不得記錄 token。
  - 提供可重複執行的維護 helper 或 smoke cleanup 邏輯。
- 刪除不存在 activity：404。

資料庫與 Storage 無法形成同一個 transaction。實作必須採可重試、可補償的 cleanup 流程，並在交接報告說明順序與失敗處理。

### `POST /publish`

- 使用完整 publish schema 驗證。
- 確認 cover asset 所屬活動與 kind。
- 將狀態改為 published。
- 設定必要發布時間。
- 回傳更新後活動。

### `POST /unpublish`

- 將狀態改為 draft。
- 公開 API 隨即不可見。
- 回傳更新後活動。

## 8.2 Asset routes

```text
POST   /api/admin/activities/:id/assets
PATCH  /api/admin/activity-assets/:assetId
DELETE /api/admin/activity-assets/:assetId
POST   /api/admin/activities/:id/cover
GET    /api/admin/activity-assets/:assetId/file
GET    /api/public/activity-assets/:assetId
```

### Upload

`POST /api/admin/activities/:id/assets` 使用 `multipart/form-data`。

欄位：

- `file`
- `kind`: image 或 attachment
- `altText`: optional
- `sortOrder`: optional

流程：

1. `requireAdmin(event)`。
2. 驗證 activity 存在。
3. 解析 multipart。
4. 驗證只有一個主要檔案。
5. 驗證大小、MIME、extension、kind。
6. 建立 immutable storage path。
7. Storage upload，`upsert: false`。
8. 寫入 `activity_assets` metadata。
9. 若 metadata insert 失敗，立即嘗試刪除剛上傳的 object。
10. 回傳 asset DTO，不能回傳 raw path 給公開 client。

### Asset metadata update

`PATCH /api/admin/activity-assets/:assetId` 只允許更新：

- `alt_text`
- `sort_order`

不得允許 client 修改：

- storage bucket
- storage path
- activity ID
- MIME
- size
- created_by

### Set cover

`POST /api/admin/activities/:id/cover`

payload：

```json
{
  "assetId": "..."
}
```

要求：

- asset 必須屬於 activity。
- asset kind 必須為 image。
- 設定 activities 的 cover reference。
- `assetId: null` 可清除封面並回到 fallback。

### Delete asset

- `requireAdmin(event)`。
- 查詢 metadata。
- 先移除 Storage object。
- Storage object 已不存在時可視為 idempotent cleanup。
- 再刪除 metadata。
- 若它是 cover，外鍵應自動 `SET NULL` 或由 server 清除。
- 不能刪除其他活動的資產。

## 8.3 Video routes

```text
POST   /api/admin/activities/:id/videos
PATCH  /api/admin/activity-videos/:videoId
DELETE /api/admin/activity-videos/:videoId
```

- 只保存 HTTPS URL、title、sort order。
- 使用 allowlist mapper 產生可嵌入 URL。
- 不接受 HTML。
- 不 fetch 或下載遠端影片。
- 不接受本機檔案路徑。

---

## 9. Validation 與錯誤契約

若 package 尚未包含 schema validator，可加入 `zod`。所有 validation schema 應放在可供 server 與 client 共用但不包含 server secret 的目錄，例如 `shared/` 或現有一致位置。

不得只做前端 validation。

建議錯誤格式：

```ts
interface ApiErrorResponse {
  statusCode: number
  code:
    | 'AUTH_REQUIRED'
    | 'ADMIN_REQUIRED'
    | 'VALIDATION_ERROR'
    | 'NOT_FOUND'
    | 'SLUG_CONFLICT'
    | 'FILE_TOO_LARGE'
    | 'UNSUPPORTED_FILE_TYPE'
    | 'STORAGE_ERROR'
    | 'CONFLICT'
    | 'INTERNAL_ERROR'
  message: string
  fieldErrors?: Record<string, string[]>
}
```

狀態碼：

| 狀況 | Status |
|---|---:|
| 未登入 | 401 或沿用 Phase 5 已驗證契約 |
| 已登入但非 admin | 403 |
| payload 不合法 | 400 |
| activity／asset 不存在 | 404 |
| duplicate slug／資料衝突 | 409 |
| 檔案超過上限 | 413 |
| MIME 不支援 | 415 |
| 未預期錯誤 | 500 |

若 Phase 5 現有 API 已有固定錯誤格式，應延伸該格式，不建立第二套互相衝突的契約。

---

## 10. Admin UI

## 10.1 路由

完成或改造：

```text
/admin/activities
/admin/activities/new
/admin/activities/:id/edit
```

所有頁面沿用 Phase 5 auth middleware，並且所有資料仍由受保護的 server API 提供。

## 10.2 活動列表

顯示：

- 標題。
- 年度。
- 分類。
- 活動日期。
- 狀態。
- 最後更新時間。
- 編輯按鈕。
- 發布／撤回按鈕。
- 刪除按鈕。

功能：

- status filter。
- year filter。
- category filter。
- 關鍵字搜尋。
- 載入、空資料、錯誤狀態。
- mutation 成功後 refresh。
- 不採取無法回復的 optimistic delete。
- 登出或 auth 狀態改變時不得因舊資料變為 null 而產生 render error。

## 10.3 新增／編輯表單

欄位依既有 schema 命名，但 UI 至少涵蓋：

- 標題。
- slug。
- 活動日期。
- 年度。
- 分類。
- 地點。
- 參與人數。
- 活動成果／正文。
- 精選狀態；只有既有 schema 支援時才顯示。
- draft save。
- publish。
- unpublish。
- delete。

要求：

- label 與 input 正確關聯。
- 錯誤訊息靠近欄位。
- submit 時按鈕 disabled。
- 防止連續送出。
- 顯示 server field errors。
- 未建立 activity 前不可上傳資產；新增成功後導向 edit page 再管理資產。
- 草稿可以先保存不完整內容。
- publish 失敗時保留表單內容。
- 離開有未保存內容的頁面時，至少使用瀏覽器／Nuxt route guard 提醒；若現有架構不適合，可列為非阻塞限制，但不得造成資料自動遺失。

## 10.4 圖片與附件管理

編輯頁加入資產區：

- 圖片列表。
- 圖片預覽。
- alt text。
- sort order。
- 設為封面。
- 刪除。
- 附件列表。
- 原始檔名、類型、大小。
- 下載／預覽。
- 刪除。
- 上傳進度可至少顯示 processing 狀態；不強制實作精確百分比。
- 上傳失敗後 file input 可再次使用。
- UI 不顯示 storage path。

## 10.5 影片連結

- URL。
- 顯示名稱。
- sort order。
- 新增、編輯、刪除。
- 支援安全 provider 時顯示 preview。
- 其他 HTTPS URL 顯示外部連結。
- 所有外部連結使用安全的 `rel` 設定。

## 10.6 確認操作

- delete activity：顯示活動名稱及不可回復警告。
- delete asset：顯示檔名／圖片預覽。
- publish：列出仍缺少的必要欄位。
- unpublish：說明公開頁面會立即不可見。
- 不使用原生 `window.confirm` 作為唯一長期 UI；可先沿用專案既有 modal pattern。若專案沒有 modal component，可建立簡潔、可鍵盤操作的 confirm dialog。

---

## 11. Composables 與 types

擴充或重構：

```text
composables/useAdminActivities.ts
```

可視需要新增：

```text
composables/useAdminActivityForm.ts
composables/useAdminActivityAssets.ts
types/adminActivity.ts
shared/schemas/activity.ts
```

要求：

- SSR initial read 使用 `useFetch`／`useAsyncData`，沿用專案現有模式。
- 使用者觸發的 mutation 使用 `$fetch`。
- 不在 composable 直接使用 Supabase browser client 寫資料。
- 明確區分 `idle`、`loading`、`success`、`error`。
- 所有 reactive array 在 session 清除時有安全預設值。
- 不建立與 server response 不一致的重複 TypeScript type。
- DTO 不包含 raw storage path、內部 policy 資訊或使用者 token。

---

## 12. 公開前台整合

公開頁面既有行為不得退化：

- anon published slug：200。
- anon draft slug：404。
- invalid slug：404。
- 公開列表只顯示 published。
- draft 的 asset proxy：404。
- published 的 asset proxy：可存取。
- activity unpublish 後，既有公開 URL 立即 404。
- activity delete 後，公開 URL 404。
- 沒有封面時仍使用 fallback。
- 舊資料沒有 `activity_assets` 時仍能正常 render，不得 hydration error。

更新 Supabase mapper／public activity DTO：

- `coverUrl` 由 cover asset proxy URL產生。
- 圖片陣列由 asset metadata 產生。
- 附件使用 proxy download URL。
- 影片由安全 mapper 產生。
- 不將 signed URL 寫入資料庫。
- 不將 signed URL 當作永久 cache key。

如現有公開 API 使用 Nitro cache 或 prerender，必須確保 publish、unpublish、update 後不會長時間顯示過期資料。不要對 admin API 套用公開 cache。

---

## 13. 安全要求

- 所有 mutation server-side 授權。
- 所有資料庫寫入受 RLS 保護。
- Storage 受 `storage.objects` RLS 保護。
- 不使用 service role。
- 不將 Supabase secret 放入 `runtimeConfig.public`。
- 不將 auth token 存入 localStorage。
- 不接受任意 HTML。
- 不使用 `v-html` render 活動成果；若現有內容為純文字，保持純文字安全 render。
- 檔案名稱輸出到 header 前必須 sanitize。
- 所有 ID route param server-side parse。
- 所有 update 使用欄位 allowlist。
- delete query 必須以唯一 ID 精確 filter。
- 外部 URL 僅允許 HTTPS。
- 外部連結使用 `target="_blank"` 時同時使用 `rel="noopener noreferrer"`。
- 不在錯誤訊息中回傳 SQL 或 Supabase internal detail。
- mutation endpoint 檢查 same-origin。
- cookie 屬性維持 Phase 5 的 HttpOnly、合理 SameSite，production 使用 Secure。
- 不因 UI 已隱藏操作而省略 API 或 RLS 驗證。

---

## 14. Migration 規格

建立有明確名稱的新 migration，例如：

```text
supabase/migrations/<timestamp>_phase6_activity_crud_assets.sql
```

若內容過長，可拆成：

```text
<timestamp>_phase6_activity_crud.sql
<timestamp>_phase6_activity_assets.sql
<timestamp>_phase6_activity_rls.sql
```

要求：

- 不修改已執行的舊 migration。
- migration 順序可在全新資料庫重播。
- constraint 與 index 有明確名稱。
- policy 名稱可辨識角色與 operation。
- 不建立 `FOR ALL` policy。
- 不使用 service role。
- 不建立無限制 authenticated policy。
- bucket 為 private。
- object metadata 操作由 Storage API 執行。
- migration 執行後重新 dump／inspect policy，確認沒有舊全權 policy 回來。

---

## 15. SQL 驗證

新增：

```text
supabase/verify-admin-crud.sql
```

可重複使用現有 `verify-admin-auth.sql` helper，但不可破壞 Phase 5 驗證。

至少驗證：

### anon

- 可 SELECT published。
- 不可 SELECT draft。
- 不可 INSERT activity。
- 不可 UPDATE activity。
- 不可 DELETE activity。
- 不可讀 draft asset metadata。
- 不可上傳或刪除 Storage object。

### non-admin authenticated

- 可讀 published。
- 不可讀 draft。
- 不可 INSERT。
- 不可 UPDATE。
- 不可 DELETE。
- 不可寫入 asset metadata。
- 不可寫入 video。
- 不可操作 Storage。

### admin authenticated

- 可建立 draft。
- 可更新 draft。
- 可發布。
- 可讀 draft 與 published。
- 可寫入／更新／刪除 asset metadata。
- 可寫入／更新／刪除 video。
- 可撤回發布。
- 可刪除 activity。
- 測試完成後清除資料。

### policy inventory

輸出並人工確認：

- `activities` 各 operation policy。
- `activity_assets` 各 operation policy。
- `activity_videos` 各 operation policy。
- `storage.objects` 對 `activity-assets` bucket 的 policy。
- 活動寫入 policy 不再是 0。
- 不存在 authenticated `FOR ALL`。
- `admin_users` RLS 仍啟用。
- `is_admin()` 屬性仍符合 Phase 5。

SQL Editor 以高權限執行時不能直接代表 anon/authenticated 行為。驗證腳本必須使用現有可行方式模擬 role 與 JWT claim，或搭配 smoke test 實際登入驗證；不得只因 SQL Editor query 成功就宣稱 RLS 通過。

---

## 16. Phase 6 smoke test

新增：

```text
scripts/phase6-admin-crud-smoke.mjs
```

並在 `package.json` 增加清楚的 script，例如：

```json
{
  "scripts": {
    "test:phase6": "node scripts/phase6-admin-crud-smoke.mjs"
  }
}
```

若專案已有一致 naming，沿用現有風格。

### 16.1 憑證

只從環境變數讀取：

```text
PHASE6_NON_ADMIN_EMAIL
PHASE6_NON_ADMIN_PASSWORD
PHASE6_ADMIN_EMAIL
PHASE6_ADMIN_PASSWORD
PHASE6_BASE_URL
```

- 不提供預設真實帳密。
- 不輸出密碼或 token。
- 缺少必要 env 時，清楚 fail。
- `.env.example` 只放變數名稱與假值。
- 暫存測試帳號由使用者或既有遠端資料提供，不在應用程式建立管理員邀請功能。

### 16.2 測試案例

至少執行：

1. anon 可開公開 published 活動。
2. anon 對所有 admin mutation endpoint 被拒絕。
3. non-admin 登入成功，但 POST／PATCH／DELETE／publish／upload 全部 403。
4. admin 登入。
5. admin 建立帶唯一測試 slug 的 draft。
6. admin GET 可見該 draft。
7. anon 公開 slug 為 404。
8. admin 更新活動欄位。
9. 不完整 draft publish 回傳 400。
10. 補齊必要欄位。
11. 上傳一張小型合法測試圖片。
12. 上傳一個小型合法測試附件。
13. 設定封面。
14. 新增一個 HTTPS 影片連結。
15. admin draft asset proxy 可存取。
16. anon draft asset proxy 為 404。
17. publish 成功。
18. anon 公開 slug 200。
19. anon published asset proxy 可存取。
20. duplicate slug 回傳 409。
21. 不合法 MIME／副檔名被拒絕。
22. 超過限制檔案被拒絕；若不適合在 repo 放大型 fixture，可測 server validator unit 或以產生 buffer 的方式執行。
23. unpublish 成功。
24. anon slug 與 asset proxy 重新 404。
25. 再次 publish 或依流程保持 draft。
26. 刪除單一 asset 後 metadata 與 object 均不存在。
27. 刪除 activity 後 activity、asset metadata、video 與 Storage object 均清除。
28. admin logout。
29. logout 後 admin route 重新導向登入。
30. browser／API 不殘留舊活動資料。

### 16.3 清理

- 使用唯一前綴，例如 `phase6-smoke-<timestamp>-<random>`。
- 所有建立資料在 `finally` 中清除。
- 測試中途失敗也必須嘗試清理 DB 與 Storage。
- cleanup 不得刪除非 smoke test 建立的資料。
- 結束時輸出 PASS／FAIL summary，不輸出敏感資訊。
- script 結束後不得留下 listener 或背景 process。

---

## 17. Browser 驗收矩陣

必須實際使用 browser 驗證，不只執行 HTTP script。

| 身分 | 路由／操作 | 預期 |
|---|---|---|
| anon | `/admin/login` | 200 |
| anon | `/admin` | 302／導向登入 |
| anon | `/admin/activities` | 302／導向登入 |
| anon | admin POST/PATCH/DELETE API | 401／拒絕 |
| non-admin | 登入 | Auth 成功、顯示無管理權限 |
| non-admin | 管理 CRUD API | 403 |
| admin | `/admin/activities` | 200 |
| admin | `/admin/activities/new` | 200 |
| admin | 建立 draft | 成功 |
| admin | refresh edit page | session 與資料保持 |
| admin | 上傳圖片／附件 | 成功 |
| admin | 設封面／排序 | 成功 |
| admin | publish | 成功 |
| anon | published slug | 200 |
| anon | draft／invalid slug | 404 |
| admin | unpublish | 成功 |
| anon | 原 published slug | 404 |
| admin | delete | 成功且列表更新 |
| 已登出 | browser back／直接開 admin URL | 不顯示舊資料，導向登入 |
| production | `/supabase-test` | 404 |

所有流程確認：

- Vue warning：0。
- runtime error：0。
- hydration mismatch：0。
- browser console error：0。
- redirect loop：0。
- logout 舊資料閃現：0。
- broken image／attachment request：0。
- 重複送出：0。

---

## 18. 品質驗證

依序執行：

```bash
pnpm install --frozen-lockfile
pnpm exec nuxi typecheck
pnpm run build
pnpm run preview
pnpm run test:phase6
```

若新增 package，必須先合理更新 lockfile；完成後再以 frozen lockfile 重跑。

專案目前沒有 lint script：

- 不得虛構 lint PASS。
- 可修正此次修改範圍內明顯格式問題。
- 不強制在 Phase 6 引入完整 lint 工具鏈。

Build 的既有 Nuxt／Nitro deprecation warning 可以記錄，但新增的 warning 必須判斷並修正。

另外檢查：

```bash
git diff --check
git status --short
```

若可用，執行 Supabase migration status、database diff 或相同等級的 schema inspection，確認遠端與 migration 一致。

---

## 19. 預期檔案範圍

實際路徑依現有專案結構調整，但預期可能包含：

```text
package.json
pnpm-lock.yaml
.env.example

shared/schemas/activity.ts
types/adminActivity.ts
types/activityAsset.ts

composables/useAdminActivities.ts
composables/useAdminActivityForm.ts
composables/useAdminActivityAssets.ts

components/admin/AdminActivityForm.vue
components/admin/AdminActivityAssetManager.vue
components/admin/AdminActivityVideoManager.vue
components/admin/AdminConfirmDialog.vue

pages/admin/activities/index.vue
pages/admin/activities/new.vue
pages/admin/activities/[id]/edit.vue

server/api/admin/activities/index.get.ts
server/api/admin/activities/index.post.ts
server/api/admin/activities/[id].get.ts
server/api/admin/activities/[id].patch.ts
server/api/admin/activities/[id].delete.ts
server/api/admin/activities/[id]/publish.post.ts
server/api/admin/activities/[id]/unpublish.post.ts
server/api/admin/activities/[id]/assets.post.ts
server/api/admin/activities/[id]/videos.post.ts
server/api/admin/activities/[id]/cover.post.ts

server/api/admin/activity-assets/[assetId].patch.ts
server/api/admin/activity-assets/[assetId].delete.ts
server/api/admin/activity-assets/[assetId]/file.get.ts

server/api/admin/activity-videos/[videoId].patch.ts
server/api/admin/activity-videos/[videoId].delete.ts

server/api/public/activity-assets/[assetId].get.ts

server/utils/activityValidation.ts
server/utils/activityAssets.ts
server/utils/apiErrors.ts
server/utils/requireSameOrigin.ts

utils/supabaseMappers.ts
composables/usePublicActivities.ts

supabase/migrations/<timestamp>_phase6_*.sql
supabase/verify-admin-crud.sql

scripts/phase6-admin-crud-smoke.mjs
scripts/fixtures/phase6-test-image.png
scripts/fixtures/phase6-test-attachment.txt
```

不要為符合此清單而建立沒有用途的空檔案。應優先沿用現有 utility、type 與 component。

---

## 20. Definition of Done

只有下列項目全部成立，Phase 6 才可宣告完成：

### Repository

- [ ] 以 Phase 5 commit／tag 為基準。
- [ ] 未覆蓋使用者既有未追蹤檔案。
- [ ] 未提交 secret、帳密、token 或 `.env`。
- [ ] 未使用 service role。
- [ ] 沒有無關的大規模重構。

### Database

- [ ] 新 migration 可重播。
- [ ] `activities` 有獨立 admin INSERT／UPDATE／DELETE policy。
- [ ] 沒有 authenticated `FOR ALL`。
- [ ] `activity_assets` schema、index、RLS、grants 正確。
- [ ] `activity_videos` schema、index、RLS、grants 正確。
- [ ] private `activity-assets` bucket 存在。
- [ ] Storage SELECT／INSERT／DELETE policy 正確。
- [ ] anon 不可見 draft。
- [ ] non-admin 不可寫。
- [ ] admin 可完成所有 CRUD。
- [ ] `admin_users` 與 `is_admin()` 安全屬性未退化。

### API

- [ ] 每個 admin route 明確呼叫 `requireAdmin`。
- [ ] server validation 完整。
- [ ] duplicate slug 為 409。
- [ ] invalid payload 為 400。
- [ ] file size／MIME 錯誤 status 正確。
- [ ] 不存在資源為 404。
- [ ] 公開 draft 不洩漏存在性。
- [ ] mutation 有 same-origin protection。
- [ ] API 不回傳 raw storage path 或敏感錯誤。

### UI

- [ ] 管理員可新增 draft。
- [ ] 管理員可編輯。
- [ ] 管理員可發布／撤回。
- [ ] 管理員可刪除。
- [ ] 圖片可上傳、排序、設封面、刪除。
- [ ] 附件可上傳與刪除。
- [ ] 外部影片連結可管理。
- [ ] 載入、空資料、錯誤、成功狀態明確。
- [ ] 登出後無舊資料 render error。
- [ ] 頁面 refresh session 保持。

### Public frontend

- [ ] published 列表與 slug 正常。
- [ ] draft／invalid slug 404。
- [ ] published asset 可存取。
- [ ] draft asset 404。
- [ ] unpublish 後公開內容立即不可見。
- [ ] fallback cover 正常。
- [ ] 無 hydration mismatch。

### Tests

- [ ] `pnpm install --frozen-lockfile` PASS。
- [ ] `pnpm exec nuxi typecheck` PASS，0 error。
- [ ] `pnpm run build` PASS。
- [ ] `pnpm run preview` PASS。
- [ ] Phase 5 auth smoke 仍 PASS。
- [ ] Phase 6 CRUD／Storage smoke 全部 PASS。
- [ ] SQL RLS 驗證符合 anon／non-admin／admin 矩陣。
- [ ] browser console error 0。
- [ ] Vue warning 0。
- [ ] runtime error 0。
- [ ] hydration mismatch 0。
- [ ] 測試資料與 Storage fixture 已清理。
- [ ] 所有 listener／preview process 已停止。

### Git

- [ ] 只有全部 DoD 通過後才建立 Phase 6 commit。
- [ ] 只有遠端 migration、三身分、CRUD、Storage 與 browser 驗收全部通過後才建立 tag。
- [ ] 未執行 push。

---

## 21. Git 交付

全部 Definition of Done 通過後：

```bash
git add <only-phase-6-files>
git commit -m "feat: complete Phase 6 admin activity CRUD and storage"
git tag phase-6-admin-activity-crud-storage-complete
```

不得直接使用會誤收未追蹤檔的寬泛操作，除非已逐一確認：

```bash
git add .
```

不是預設做法。

完成後輸出：

```bash
git status --short
git log -1 --oneline
git tag --points-at HEAD
```

Push 不屬於 Phase 6。除非使用者另外明確指示，否則不要執行：

```bash
git push
git push --tags
```

若任何 DoD 未通過：

- 可以建立尚未完成的工作 commit，但 commit message 不得宣稱 complete。
- 不得建立完成 tag。
- 必須列出阻塞項目、已完成部分與下一個精確操作。

---

## 22. Codex 最終回報格式

完成工作後，最終回覆必須使用下列章節，不得只回覆「完成」：

### 22.1 執行摘要

- 是否完成 Phase 6。
- 是否全部通過 Definition of Done。
- 是否進入 Phase 7。
- 是否有未完成項目。

### 22.2 修改檔案

依類型列出：

- migrations。
- server utilities／API。
- composables／types。
- admin pages／components。
- public frontend integration。
- scripts／SQL verification。
- package／config。

### 22.3 Migration 與資料庫狀態

列出：

- 新 table／column／index／constraint。
- bucket 狀態。
- RLS policy inventory。
- grants。
- anon／non-admin／admin 實際結果。
- Security Advisor 結果。
- service role 掃描結果。

### 22.4 API 驗證

列出每個 route、身分與 status code。

### 22.5 CRUD 與 Storage 驗證

列出：

- create draft。
- edit。
- upload image。
- upload attachment。
- set cover。
- video URL。
- publish。
- public visibility。
- unpublish。
- delete。
- cleanup。

### 22.6 Browser 與品質驗證

列出：

- frozen install。
- typecheck。
- build。
- preview。
- Phase 5 smoke。
- Phase 6 smoke。
- Vue warning。
- runtime error。
- hydration。
- console。
- listener。
- fixture cleanup。

### 22.7 已知限制

只列出真實存在且未阻塞 DoD 的限制。

### 22.8 風險與建議

至少說明：

- DB 與 Storage 非單一 transaction 的補償策略。
- private asset proxy／signed URL expiry。
- 未來直接影片上傳需獨立設計 resumable upload。
- 未來管理員邀請需獨立 Phase 與 policy。

### 22.9 Git 狀態

列出：

- branch。
- commit hash 與 message。
- tag。
- push 是否執行。
- 未追蹤檔是否保留。
- secret 掃描。

### 22.10 下一階段

明確寫：

```text
Phase 6 已完成／未完成。
Phase 7 尚未開始。
```

---

## 23. 停止條件

遇到下列狀況時，不得以不安全 workaround 繞過：

- 無法取得遠端 migration 權限。
- admin／non-admin 測試帳號無法使用。
- Supabase project URL 或 anon key 缺失。
- 現有 schema 與本規格重大衝突。
- Storage bucket／policy 無法部署。
- 遠端資料可能因 destructive migration 受損。
- 需要 service role 才能讓目前設計運作。
- 測試會刪除非測試資料。

處理方式：

1. 先完成所有可安全完成的本機程式、migration 與測試。
2. 不降低 RLS。
3. 不把 service role 放進 Nuxt app。
4. 不宣告 DoD 通過。
5. 不建立 Phase 6 complete tag。
6. 在最終回報提供精確錯誤、影響範圍與人工操作步驟。

---

## 24. 技術參考基準

實作時以專案目前鎖定的 Nuxt 3、Vue 3、TypeScript、Tailwind CSS 與 `@supabase/supabase-js` 版本為準，不得為追求最新 major version而進行框架升級。

參考官方文件：

- Nuxt 3 Server：<https://nuxt.com/docs/3.x/getting-started/server>
- Nuxt 3 Server directory：<https://nuxt.com/docs/3.x/directory-structure/server>
- Nuxt 3 Data Fetching：<https://nuxt.com/docs/3.x/getting-started/data-fetching>
- Nuxt 3 Sessions and Authentication：<https://nuxt.com/docs/3.x/guide/recipes/sessions-and-authentication>
- H3 Request validation／multipart：<https://v1.h3.dev/utils/request>
- Supabase Row Level Security：<https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase Storage Access Control：<https://supabase.com/docs/guides/storage/security/access-control>
- Supabase Storage private downloads：<https://supabase.com/docs/guides/storage/serving/downloads>
- Supabase Storage helper functions：<https://supabase.com/docs/guides/storage/schema/helper-functions>
- Supabase Standard Uploads：<https://supabase.com/docs/guides/storage/uploads/standard-uploads>

---

# 最終指令

請直接在現有專案中實作本規格，先完成 repository／schema inventory，再依 migration、server API、admin UI、public integration、tests、Git delivery 的順序執行。

不得進入 Phase 7。  
不得 push。  
不得使用 service role。  
不得弱化 Phase 5 RLS。  
不得在 Definition of Done 尚未全部通過時建立完成 tag。
