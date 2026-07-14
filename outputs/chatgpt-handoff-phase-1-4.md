# March Out For Love / 愛潮關懷社網站

## Phase 1 至 Phase 4 ChatGPT 交接文件

這份文件包含兩個部分：

1. 可直接貼給 ChatGPT 的專案狀態與後續工作提示。
2. 目前為止各階段的逐步實作紀錄。

---

# 一、可直接貼給 ChatGPT 的版本

請接續目前的 Nuxt 3 專案「March Out For Love / 愛潮關懷社網站」。

## 專案位置

```text
C:\Users\Admin\Documents\Codex\2026-06-24\phase-1-phase-2-supabase-mock
```

## 技術架構

- Nuxt 3
- Vue 3
- TypeScript
- Tailwind CSS
- Lucide Vue Next
- Supabase JavaScript SDK
- pnpm

主要套件版本：

```json
{
  "@nuxtjs/tailwindcss": "^6.12.2",
  "@supabase/supabase-js": "^2.108.2",
  "lucide-vue-next": "^0.468.0",
  "nuxt": "^3.15.0",
  "typescript": "^5.7.2"
}
```

## 目前進度

Phase 1、Phase 2、Phase 3 已完成。

Phase 4 已完成第一版 Supabase 整合程式，但尚未使用真實 Supabase 專案憑證進行端對端驗證。

系統目前具備以下兩種執行模式：

1. 有設定 Supabase 環境變數時，使用 Supabase Auth、Database 與 Storage。
2. 未設定 Supabase 環境變數時，自動使用原有 mock data 與 mock auth。

請勿移除 mock data fallback。

---

## Phase 1 與 Phase 2：已完成內容

### 前台頁面

已建立：

- `/`
- `/about`
- `/organization`
- `/programs`
- `/programs/breakfast`
- `/programs/exploration`
- `/activities`
- `/activities/[slug]`
- `/news`
- `/news/[slug]`
- `/years`
- `/years/[year]`
- `/files`
- `/faq`
- `/contact`

### 後台頁面

已建立：

- `/admin/login`
- `/admin/dashboard`
- `/admin/activities`
- `/admin/activities/create`
- `/admin/activities/[id]/edit`
- `/admin/posts`
- `/admin/posts/create`
- `/admin/posts/[id]/edit`
- `/admin/files`
- `/admin/categories`
- `/admin/years`
- `/admin/faq`
- `/admin/settings`

### Mock data

`utils/mockData.ts` 保留以下測試資料：

- 6 筆活動
- 3 筆文章
- 6 筆檔案
- 5 筆常見問題
- 民國 109 至 114 年年度資料
- 3 個服務方案
- 網站基本設定

Mock data 不應刪除，因為它是未設定 Supabase 時的 fallback。

---

## Phase 3：Admin UI 與 Auth Guard

### Admin middleware

已建立：

```text
middleware/admin-auth.global.ts
```

行為：

- 所有 `/admin/*` 路由預設需要登入。
- `/admin/login` 不需要登入。
- 未登入進入 `/admin/dashboard` 時會導向：

```text
/admin/login?redirect=/admin/dashboard
```

- 登入後會回到 `redirect` 指定路徑。
- 若沒有 `redirect`，則進入 `/admin/dashboard`。

### Auth composable

已建立並擴充：

```text
composables/useAuth.ts
```

行為：

- 未設定 Supabase 時使用 mock auth。
- Mock 登入狀態保存在 `mock-admin-auth` cookie。
- 設定 Supabase 時使用 `signInWithPassword`。
- Supabase 登入成功後，也會同步 cookie，讓 Nuxt middleware 能判斷狀態。
- 登出會清除 Supabase session 與 mock cookie。

### 表單驗證

已建立：

```text
composables/useFormValidation.ts
```

目前支援：

- `required`
- `minLength`
- `pattern`
- 欄位層級錯誤訊息
- submit loading
- submit error
- submit success

已套用至：

- Admin login
- Activities create/edit
- Posts create/edit
- FAQ
- Settings

### 刪除確認

已建立：

```text
components/admin/ConfirmModal.vue
```

已套用至：

- Activities
- Posts
- Files
- FAQ

### Loading 與 error state

已加入：

- Admin dashboard
- Activities
- Posts
- Files
- FAQ
- Settings
- Create/edit forms

---

## Phase 4：Supabase Integration 第一版

### 1. 安裝 Supabase SDK

已加入：

```text
@supabase/supabase-js
```

### 2. Runtime config

`nuxt.config.ts` 已加入公開 runtime config：

```ts
runtimeConfig: {
  public: {
    supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || ''
  }
}
```

### 3. Supabase client

已建立：

```text
composables/useSupabaseClient.ts
```

用途：

- 檢查 Supabase 環境變數是否完整。
- 建立並共用 Supabase client。
- 未設定環境變數時不會嘗試連線。

### 4. Supabase types 與資料轉換

已建立：

```text
types/supabase.ts
utils/supabaseMappers.ts
```

用途：

- 定義資料庫 row、insert、update 型別。
- 將 Supabase snake_case 資料轉成前端使用的 camelCase model。
- 將前端表單資料轉成 Supabase insert/update payload。

### 5. Admin repository

已建立：

```text
composables/useAdminRepository.ts
```

Repository 會自動選擇資料來源：

- Supabase 已設定：讀寫 Supabase。
- Supabase 未設定：使用 Nuxt `useState` 建立的 mock store。

目前支援：

#### Activities

- list
- get by id
- create
- update
- delete

#### Posts

- list
- get by id
- create
- update
- delete

#### Files

- list
- create
- delete
- upload

#### FAQ

- list
- create
- delete

#### Settings

- get
- update

### 6. Supabase Auth

`useAuth.ts` 已整合：

- `signInWithPassword`
- `getSession`
- `signOut`

執行邏輯：

- 有 Supabase env：使用真實 Supabase Auth。
- 無 Supabase env：使用 mock auth。
- middleware 在 client side 可重新確認 Supabase session。
- cookie 仍保留，供 global route middleware 判斷。

### 7. Admin CRUD 串接

以下後台頁面已改用 `useAdminRepository`：

- Dashboard
- Activities list/create/edit
- Posts list/create/edit
- Files
- FAQ
- Settings

刪除操作：

- Supabase 模式會刪除資料庫資料。
- Mock 模式只修改目前 Nuxt mock store。
- `utils/mockData.ts` 原始資料不會被永久修改。

### 8. Supabase Storage

Files 後台頁面已加入：

- 新增檔案資料表單
- 選擇本機檔案
- 上傳 loading/error state
- Supabase Storage upload
- 取得公開 URL

預設 bucket：

```text
public-files
```

活動圖片預留 bucket：

```text
activity-images
```

Mock 模式使用瀏覽器 object URL，不會永久保存檔案。

### 9. 前台資料更新

`composables/useMockContent.ts` 已保留原名稱與 mock fallback。

行為：

- SSR 初始資料使用 mock data，確保 env 未設定時頁面可正常顯示。
- Supabase 已設定時，client side 會讀取 Supabase 的：
  - activities
  - posts
  - files
  - FAQ
  - site settings
- 取得資料後更新前台 state。
- Supabase request 失敗時維持 mock data。

### 10. Database schema

已更新：

```text
supabase/schema.sql
```

包含：

- `activities`
- `activity_images`
- `posts`
- `files`
- `categories`
- `faq`
- `site_settings`
- indexes
- Row Level Security
- authenticated CRUD policies
- public read policies
- Storage buckets
- Storage policies

Storage buckets：

- `activity-images`
- `public-files`

目前 RLS 設計為：

- 公開訪客可以讀取前台公開資料。
- 已登入 Supabase 使用者可以管理後台資料。

這是第一版權限設計。若之後需要多角色管理，應增加 admin role 或 profiles table，不能只依靠「已登入」判斷。

### 11. Environment variables

`.env.example` 已包含：

```dotenv
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_ACTIVITY_IMAGES_BUCKET=activity-images
SUPABASE_PUBLIC_FILES_BUCKET=public-files
```

未填寫 URL 與 anon key 時，網站應繼續使用 mock 模式。

---

## 已完成驗證

已執行：

```powershell
pnpm run build
```

結果：成功。

已進行基本路由 smoke test：

- `/` 回傳 200。
- `/admin/login` 回傳 200。
- 未登入存取 `/admin/dashboard` 回傳 302。
- 302 目標為 `/admin/login?redirect=/admin/dashboard`。
- 帶有 `mock-admin-auth=true` cookie 時，`/admin/dashboard` 回傳 200。

---

## 尚未完成或尚未驗證

以下項目需明確保留為後續工作：

1. 尚未取得真實 Supabase URL 與 anon key。
2. 尚未在真實 Supabase 專案執行 `supabase/schema.sql`。
3. 尚未建立真實 Supabase Auth 管理員帳號。
4. 尚未實際驗證真實登入、CRUD、RLS 與 Storage upload。
5. 尚未將 `utils/mockData.ts` 的資料批次 seed 至 Supabase。
6. 目前前台 Supabase 資料主要在 client side refresh。
7. 若某個 slug 只存在 Supabase、完全不存在 mock data，直接以 URL 進入動態詳情頁時，SSR 階段可能先得到 404；後續應改成 server-compatible 的資料取得方式。
8. Admin 權限目前是「任何 authenticated user」，尚未建立正式角色授權。
9. Categories 與 Years 後台目前仍以既有畫面和資料為主，尚未完整接上 repository CRUD。
10. Activity images 的多圖上傳與排序尚未完整實作。

---

## 建議下一階段工作

請依序處理：

1. 建立或連接真實 Supabase 專案。
2. 在 Supabase SQL Editor 執行 `supabase/schema.sql`。
3. 建立測試管理員帳號。
4. 設定本機 `.env`。
5. 驗證真實 Supabase Auth 登入與登出。
6. 驗證 Activities、Posts、Files、FAQ、Settings 的 CRUD。
7. 驗證 Storage upload、公開 URL 與刪除。
8. 驗證 RLS：匿名使用者只能讀公開資料，登入者才能寫入。
9. 建立 seed script，將 mock data 寫入 Supabase。
10. 將前台資料取得改為可支援 SSR 的 Supabase query，同時保留 mock fallback。
11. 完成 Categories、Years 與 Activity images 的真實 CRUD。
12. 增加 admin role 或 profiles 權限模型。
13. 每一階段完成後執行 `pnpm run build`。

開發限制：

- 不要破壞現有前台頁面。
- 不要移除 mock data。
- env 未設定時必須仍可運作。
- 不要提交真實 Supabase secret。
- 每次修改後確保 `pnpm run build` 成功。

---

# 二、目前為止的逐步實作紀錄

## Step 1：閱讀需求與拆分階段

先將網站分為：

- 前台內容展示
- 後台內容管理
- Mock data
- Admin auth guard
- 表單驗證與互動狀態
- Supabase Auth
- Supabase Database
- Supabase Storage
- Mock fallback

這樣可以先完成可操作畫面，再逐步替換資料層，而不需要重寫整個 UI。

## Step 2：建立 Nuxt 3 專案基礎

建立 Nuxt 3、TypeScript、Tailwind CSS 與基本目錄結構。

主要目錄：

```text
assets/
components/
composables/
layouts/
middleware/
pages/
supabase/
types/
utils/
```

## Step 3：建立共用型別

在 `types/content.ts` 定義前後台共同使用的資料型別，例如：

- Activity
- Post
- DownloadFile
- FAQ
- Program
- SiteSettings

目的：

- 避免各頁面自行定義不同格式。
- 讓 mock data 與 Supabase data 可以共用畫面。

## Step 4：建立 mock data

在 `utils/mockData.ts` 建立完整展示資料。

目的：

- 不依賴後端即可完成前台。
- 不依賴 Supabase 即可完成後台 UI。
- Supabase 未設定或失敗時仍有 fallback。

## Step 5：建立共用工具

建立日期、slug、CSV 等工具，讓頁面不要重複處理格式轉換。

## Step 6：建立前台 layout 與元件

完成：

- Header
- Footer
- Navigation
- Activity card
- Common section components
- Responsive layout

## Step 7：完成前台頁面

使用 mock data 完成首頁、關於、組織、方案、活動、消息、年度、檔案、FAQ 與聯絡頁。

動態路由使用 slug 或 year 找到對應內容。

## Step 8：建立 Admin layout

完成：

- Admin sidebar
- Top bar
- Mobile navigation
- Dashboard summary
- 各資源管理頁面

## Step 9：完成 Admin 基本表單

完成 Activities、Posts、Files、FAQ、Settings 等管理畫面。

此階段只建立 UI 與 local state，不連接真實資料庫。

## Step 10：建立 global admin middleware

新增 `middleware/admin-auth.global.ts`。

每次路由切換時：

1. 檢查是否為 `/admin` 路徑。
2. `/admin/login` 直接放行。
3. 其他 Admin 頁面檢查登入狀態。
4. 未登入時保留原目標路徑至 `redirect` query。
5. 已登入且進入 login 頁時，可導回 dashboard 或 redirect。

## Step 11：建立 mock auth

`useAuth.ts` 使用 Nuxt state 與 cookie 保存 mock 登入狀態。

Cookie 名稱：

```text
mock-admin-auth
```

使用 cookie 的原因是 middleware 在重新整理頁面時仍需知道登入狀態。

## Step 12：加入表單驗證

建立 `useFormValidation.ts`，集中處理：

- 必填
- 最小長度
- 格式 pattern
- 欄位錯誤
- 清除錯誤
- 整份表單驗證

各表單只需提供規則，不必重複撰寫驗證流程。

## Step 13：加入提交狀態

表單加入：

- loading
- error
- success
- disabled submit

避免重複送出，也讓使用者知道操作結果。

## Step 14：建立 ConfirmModal

建立共用刪除確認 modal。

刪除流程：

1. 點擊刪除。
2. 保存待刪項目。
3. 顯示確認 modal。
4. 使用者確認後執行刪除。
5. 更新列表或顯示錯誤。

## Step 15：驗證 Phase 3

執行 build 與路由測試，確認：

- 前台正常。
- Login 可公開存取。
- Admin 頁面受保護。
- Redirect 正常。
- Mock cookie 可保存狀態。

## Step 16：安裝 Supabase SDK

加入 `@supabase/supabase-js`，作為 Auth、Database 與 Storage 的官方 client。

## Step 17：加入 Supabase runtime config

在 `nuxt.config.ts` 讀取：

- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_ANON_KEY`

空值代表啟用 mock 模式。

## Step 18：建立共用 Supabase client

建立 `useSupabaseClient.ts`：

1. 取得 runtime config。
2. 判斷 URL 與 key 是否存在。
3. 只在設定完整時建立 client。
4. 共用 client，避免每個頁面重複初始化。

## Step 19：建立 Supabase 型別與 mapper

資料庫採 snake_case，前端 model 採 camelCase。

因此建立 mapper 處理：

- DB row 到前端 model。
- 前端表單到 DB insert/update。
- nullable 欄位。
- date 與 timestamp。
- JSON 或陣列欄位。

## Step 20：建立 repository abstraction

建立 `useAdminRepository.ts`，把資料存取從 UI 抽離。

頁面不直接判斷目前是 Supabase 或 mock，而是呼叫：

```ts
repository.listActivities()
repository.createActivity(payload)
repository.updateActivity(id, payload)
repository.deleteActivity(id)
```

Repository 內部再決定：

- 呼叫 Supabase。
- 或更新 mock state。

這讓兩種模式共用同一套後台頁面。

## Step 21：整合 Supabase Auth

修改 `useAuth.ts`：

1. 檢查是否有 Supabase config。
2. 有 config 時呼叫 `signInWithPassword`。
3. 取得 session 後設定登入狀態。
4. 同步 middleware 使用的 cookie。
5. 登出時呼叫 `signOut` 並清除 cookie。
6. 無 config 時沿用 mock auth。

## Step 22：強化 middleware session 判斷

Middleware 在 Supabase 模式下會於 client side 重新取得 session。

目的：

- 避免只依賴舊 cookie。
- Session 過期後可正確導回 login。

目前仍保留 cookie，因為 Nuxt global middleware 在 SSR 與 client navigation 的狀況不同，需要一個可快速讀取的狀態。

## Step 23：串接 Activities CRUD

Activities list/create/edit/delete 改為呼叫 repository。

保留：

- validation
- loading
- error
- success
- confirm modal
- mock fallback

## Step 24：串接 Posts CRUD

Posts list/create/edit/delete 改為呼叫 repository。

資料轉換包含：

- title
- slug
- excerpt
- content
- published state
- publish date

## Step 25：串接 Files 與 Storage

Files 頁面加入：

- metadata form
- file input
- upload
- 建立 files table record
- 刪除確認

Supabase 模式：

1. 上傳檔案到 `public-files`。
2. 取得公開 URL。
3. 將 metadata 與 URL 寫入 `files` table。

Mock 模式：

1. 建立 object URL。
2. 寫入 local mock store。
3. 不永久儲存。

## Step 26：串接 FAQ

FAQ list/create/delete 改為 repository。

保留原有表單驗證與刪除確認。

## Step 27：串接 Settings

Settings 讀取與更新改為 repository。

若 Supabase 沒有 settings row，repository 必須能使用 mock default，避免頁面空白。

## Step 28：讓前台可讀取 Supabase

更新 `useMockContent.ts`：

1. 初始 state 仍使用 mock data。
2. Supabase 已設定時，在 client side 請求資料。
3. 成功後替換對應 collection。
4. 失敗時保留 mock data。

這個作法優先保證既有前台不被破壞。

已知代價是動態詳情頁尚未完全 server-side Supabase 化，後續需改善。

## Step 29：建立 Supabase schema

更新 `supabase/schema.sql`，建立資料表、indexes、RLS 與 Storage policies。

RLS 目標：

- 匿名使用者可讀公開內容。
- 已登入使用者可執行 Admin CRUD。

Storage 目標：

- 公開可讀。
- 已登入使用者可上傳、更新與刪除。

## Step 30：更新 env example

加入 Supabase URL、anon key 與 bucket 名稱。

沒有放入任何真實 secret。

## Step 31：更新 README

README 說明：

- 安裝方式
- 啟動方式
- Build
- Supabase 設定
- Mock fallback
- Schema 執行方式
- 目前限制

## Step 32：執行 build

執行：

```powershell
pnpm run build
```

確認 Nuxt production build 成功。

## Step 33：執行路由 smoke test

測試首頁、登入頁與 Admin guard。

結果符合預期：

- 公開頁面可開啟。
- Login 可開啟。
- 未登入 Admin 會 redirect。
- Mock cookie 登入狀態可進入 Dashboard。

## Step 34：保留真實整合限制

由於尚未提供真實 Supabase 專案資料，不能宣稱以下功能已完成端對端驗證：

- 真實 Auth
- 真實 Database CRUD
- 真實 RLS
- 真實 Storage

目前可確認的是：

- 程式整合路徑已建立。
- Mock fallback 可用。
- Production build 成功。
- Admin guard 基本行為正確。

---

# 三、接手時優先閱讀的檔案

```text
README.md
package.json
nuxt.config.ts
.env.example
middleware/admin-auth.global.ts
composables/useAuth.ts
composables/useSupabaseClient.ts
composables/useAdminRepository.ts
composables/useMockContent.ts
composables/useFormValidation.ts
types/content.ts
types/supabase.ts
utils/mockData.ts
utils/supabaseMappers.ts
supabase/schema.sql
components/admin/ConfirmModal.vue
pages/admin/
```

---

# 四、接手後的基本指令

```powershell
pnpm install
pnpm run dev
pnpm run build
```

建立本機環境檔：

```powershell
Copy-Item .env.example .env
```

然後填入：

```dotenv
NUXT_PUBLIC_SUPABASE_URL=你的 Supabase URL
NUXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
```

不要把 `.env` 或任何 secret 提交到版本控制。
