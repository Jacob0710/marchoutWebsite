# March Out For Love / 愛潮關懷社網站 Phase 1-2 交接稿

這份文件可以直接交給 ChatGPT，讓它理解目前專案已完成的內容、每一步做了什麼、目前限制是什麼，以及下一階段應該如何接續。

---

## 可直接貼給 ChatGPT 的版本

請你接手一個 Nuxt 3 專案，專案名稱是 `march-out-for-love`，目標是建立「March Out For Love / 愛潮關懷社」網站。使用者要求先完成 Phase 1 和 Phase 2，先不要接 Supabase，先用 mock data 建立完整前台與基本後台畫面。

目前已完成：

1. 建立 Nuxt 3 + Vue 3 + TypeScript + Tailwind CSS 專案。
2. 建立全站前台 layout：header、footer、主視覺、區塊標題、按鈕、卡片、搜尋、年度 tabs、分類 tabs。
3. 建立後台 layout：Admin sidebar、Admin header、資料表、表單區塊、狀態 badge。
4. 建立 mock data，位置在 `utils/mockData.ts`：
   - 6 筆活動
   - 3 筆最新消息
   - 6 筆檔案
   - 5 筆 FAQ
   - 109-114 學年度成果
   - 3 個服務計畫
   - site settings
5. 建立型別定義，位置在 `types/content.ts`。
6. 建立 composables：
   - `composables/useMockContent.ts`
   - `composables/useSeo.ts`
   - `composables/useAuth.ts`
7. 建立前台頁面：
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
8. 建立基本後台頁面：
   - `/admin/login`
   - `/admin/dashboard`
   - `/admin/activities`
   - `/admin/activities/create`
   - `/admin/activities/edit/[id]`
   - `/admin/posts`
   - `/admin/posts/create`
   - `/admin/posts/edit/[id]`
   - `/admin/files`
   - `/admin/categories`
   - `/admin/years`
   - `/admin/faq`
   - `/admin/settings`
9. 建立 Supabase 之後會用到的準備檔：
   - `.env.example`
   - `supabase/schema.sql`
10. 建立 CSV 匯出工具：
   - `utils/csv.ts`
11. 建立 README 與 `.gitignore`。
12. 已安裝依賴並通過 production build。

目前限制：

1. 尚未接 Supabase。
2. 後台登入是 mock 狀態，不是真正 Supabase Auth。
3. 後台表單目前是 UI-only，尚未真正寫入資料。
4. 檔案下載 URL 目前是 placeholder。
5. 圖片目前使用 Unsplash 外部 URL。

已驗證：

1. `pnpm run build` 成功。
2. 以下路由回應 200：
   - `/`
   - `/activities`
   - `/activities/morning-breakfast-care`
   - `/news/volunteer-recruiting-114`
   - `/years/114`
   - `/files`
   - `/admin/dashboard`
   - `/admin/login`

如果要繼續下一階段，建議從 Phase 3 / Phase 4 開始：

1. 補 admin route middleware。
2. 接 Supabase client。
3. 接 Supabase Auth login/logout。
4. 將 `useMockContent.ts` 的資料來源替換成 Supabase fetch。
5. 將後台 create/edit 表單接到真正 CRUD。
6. 接 Supabase Storage，上傳活動圖片與檔案。
7. 建立 role-based permission。

---

## 我做的每一個步驟

### Step 1：讀取需求與確認範圍

使用者提供的規格要求使用：

- Nuxt 3
- Vue 3 + TypeScript
- Tailwind CSS
- Supabase 作為未來資料庫、Auth、Storage
- Cloudflare Pages 作為部署目標

但這次明確要求：

- 先完成 Phase 1 和 Phase 2
- 先不要接 Supabase
- 使用 mock data
- 建立完整前台與基本後台畫面

所以我把本階段定義成「可跑、可 build、資料集中在 mock data、未來可替換 Supabase」的版本。

---

### Step 2：建立 Nuxt 3 專案骨架

建立了核心設定檔：

- `package.json`
- `nuxt.config.ts`
- `tailwind.config.ts`
- `tsconfig.json`
- `app.vue`
- `assets/css/main.css`

`package.json` 目前包含：

- `nuxt`
- `@nuxtjs/tailwindcss`
- `lucide-vue-next`
- `typescript`

可用指令：

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run generate
pnpm run preview
```

---

### Step 3：建立全站樣式與設計基礎

在 `assets/css/main.css` 建立：

- Tailwind base/components/utilities
- 全站字體設定
- 基礎背景色
- `page-shell`
- `section-y`
- `surface`
- `prose-content`
- focus ring
- hero fade-in
- section reveal animation

色彩方向是溫暖、明亮、公益服務感：

- coral
- honey
- teal
- sage
- ink
- paper
- cloud

---

### Step 4：建立資料型別

在 `types/content.ts` 建立主要型別：

- `Activity`
- `ActivityImage`
- `Program`
- `Post`
- `FileResource`
- `FAQItem`
- `YearSummary`
- `SiteSettings`
- `ContentStatus`
- `ActivityType`

目的：

1. 讓 mock data 有一致資料格式。
2. 讓未來 Supabase 回傳資料有明確對應。
3. 降低後續改資料欄位時的風險。

---

### Step 5：建立 mock data

在 `utils/mockData.ts` 建立所有本階段資料來源。

內容包含：

- `activityTypeLabels`
- `academicYears`
- `siteSettings`
- `mockPrograms`
- `mockActivities`
- `mockPosts`
- `mockFiles`
- `mockFaq`
- `mockYearSummaries`

mock data 內容規模：

- 活動：6 筆，分別對應 109-114 學年度
- 最新消息：3 筆
- 檔案：6 筆
- FAQ：5 筆
- 服務計畫：3 筆
- 年度成果：109-114

這樣前台可以完整展示：

- 活動列表
- 活動詳情
- 年度頁
- 檔案下載
- FAQ
- 最新消息
- 首頁精選活動

---

### Step 6：建立工具函式

建立了：

- `utils/date.ts`
- `utils/slug.ts`
- `utils/csv.ts`

用途：

- `date.ts`：格式化日期、民國日期顯示
- `slug.ts`：未來可由標題產生 slug
- `csv.ts`：後台活動、消息、檔案匯出 CSV

---

### Step 7：建立 composables

建立了：

- `composables/useMockContent.ts`
- `composables/useSeo.ts`
- `composables/useAuth.ts`

用途：

#### `useMockContent.ts`

集中提供資料存取：

- activities
- featuredActivities
- posts
- files
- faq
- years
- settings
- `getActivityBySlug`
- `getPostBySlug`
- `getYear`

未來接 Supabase 時，這裡是主要替換點。

#### `useSeo.ts`

集中管理頁面 SEO：

- title
- description
- og:title
- og:description
- og:image
- twitter card

#### `useAuth.ts`

目前是 mock admin auth：

- `isLoggedIn`
- `login`
- `logout`

未來要改成 Supabase Auth。

---

### Step 8：建立 layout

建立前台 layout：

- `layouts/default.vue`
- `components/layout/AppHeader.vue`
- `components/layout/AppFooter.vue`

建立後台 layout：

- `layouts/admin.vue`
- `components/layout/AdminSidebar.vue`
- `components/layout/AdminHeader.vue`

前台 header 包含：

- Logo
- 主選單
- 檔案下載
- 後台入口
- mobile menu

後台 sidebar 包含：

- Dashboard
- 活動管理
- 消息管理
- 檔案管理
- 分類管理
- 年度成果
- FAQ
- 設定

---

### Step 9：建立共用元件

建立在 `components/common`：

- `PageHero.vue`
- `SectionTitle.vue`
- `BaseButton.vue`
- `BaseCard.vue`
- `EmptyState.vue`
- `LoadingState.vue`
- `SearchInput.vue`
- `YearTabs.vue`
- `CategoryTabs.vue`

這些元件讓前台各頁一致，減少重複 UI。

---

### Step 10：建立活動相關元件

建立在 `components/activity`：

- `ActivityCard.vue`
- `ActivityFilter.vue`
- `ActivityGallery.vue`
- `ActivityMeta.vue`
- `YouTubeEmbed.vue`
- `FileList.vue`

用途：

- 活動卡片
- 活動搜尋與篩選
- 活動詳情 metadata
- 活動照片
- YouTube iframe
- 相關檔案列表

---

### Step 11：建立 admin 元件

建立在 `components/admin`：

- `AdminDataTable.vue`
- `AdminFormSection.vue`
- `StatusBadge.vue`

用途：

- 後台資料表容器
- 後台表單區塊
- draft / published 狀態顯示

---

### Step 12：建立前台頁面

建立首頁：

- `pages/index.vue`

首頁包含：

- Hero
- 統計數字
- 社團介紹
- 服務主軸
- 精選活動
- 年度成果
- YouTube 影片區
- 最新消息
- 檔案 / 聯絡 / 公告入口

建立靜態資訊頁：

- `pages/about.vue`
- `pages/organization.vue`
- `pages/contact.vue`
- `pages/faq.vue`

建立服務計畫頁：

- `pages/programs/index.vue`
- `pages/programs/breakfast.vue`
- `pages/programs/exploration.vue`

建立活動頁：

- `pages/activities/index.vue`
- `pages/activities/[slug].vue`

活動列表支援：

- keyword search
- academic year filter
- activity type filter
- empty state

建立消息頁：

- `pages/news/index.vue`
- `pages/news/[slug].vue`

建立年度成果頁：

- `pages/years/index.vue`
- `pages/years/[year].vue`

建立檔案下載頁：

- `pages/files.vue`

檔案頁支援：

- keyword search
- academic year filter
- category filter
- empty state

---

### Step 13：建立基本後台頁面

建立：

- `pages/admin/index.vue`
- `pages/admin/login.vue`
- `pages/admin/dashboard.vue`
- `pages/admin/activities/index.vue`
- `pages/admin/activities/create.vue`
- `pages/admin/activities/edit/[id].vue`
- `pages/admin/posts/index.vue`
- `pages/admin/posts/create.vue`
- `pages/admin/posts/edit/[id].vue`
- `pages/admin/files.vue`
- `pages/admin/categories.vue`
- `pages/admin/years.vue`
- `pages/admin/faq.vue`
- `pages/admin/settings.vue`

目前後台功能定位：

- UI first
- mock data display
- 表單畫面已建立
- CSV 匯出已可產生 client-side CSV
- 還沒有真正儲存資料

---

### Step 14：建立 Supabase 準備檔

建立：

- `.env.example`
- `supabase/schema.sql`

`.env.example` 包含：

```env
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`supabase/schema.sql` 包含資料表：

- `activities`
- `activity_images`
- `posts`
- `files`
- `categories`
- `faq`
- `site_settings`

也加了常用 index：

- activities slug
- activities academic year
- posts slug
- files academic year

---

### Step 15：建立 README

建立 `README.md`，說明：

- 專案用途
- 技術棧
- setup
- scripts
- env
- content model
- public pages
- admin pages
- Cloudflare Pages 設定
- next phases

---

### Step 16：安裝依賴與處理環境問題

一開始系統 PATH 沒有直接可用的 `node` / `npm`，所以改用 Codex desktop 內建 runtime：

- Node executable
- pnpm executable

安裝依賴時遇到網路權限問題，之後允許下載套件後完成安裝。

pnpm 也要求核准 build scripts：

- `@parcel/watcher`
- `esbuild`

核准後，依賴安裝完成。

---

### Step 17：Build 驗證

執行 production build：

```bash
pnpm run build
```

結果：

- Build 成功
- Nuxt server output 產生成功
- `.output` 產生成功

中途曾發現 `postcss.config.js` 對 Nuxt + Tailwind module 不必要，且 Nuxt 會提示不建議同時存在，所以後來移除。

---

### Step 18：啟動 dev server

啟動本地 dev server：

```bash
pnpm exec nuxt dev --host 0.0.0.0 --port 3000
```

本機網址：

```txt
http://localhost:3000/
```

後台入口：

```txt
http://localhost:3000/admin/login
```

---

### Step 19：路由健康檢查

已用 HTTP request 確認以下路由回 200：

- `/`
- `/activities`
- `/activities/morning-breakfast-care`
- `/news/volunteer-recruiting-114`
- `/years/114`
- `/files`
- `/admin/dashboard`
- `/admin/login`

---

### Step 20：清理與版本管理

清理了因錯誤參數轉送產生的暫存目錄 `--port`。

新增 `.gitignore`：

```gitignore
node_modules
.nuxt
.output
.env
.DS_Store
*.log
```

保留 `pnpm-workspace.yaml`，因為裡面記錄了 pnpm 已核准的 build packages：

```yaml
allowBuilds:
  '@parcel/watcher': true
  esbuild: true
```

---

## 目前專案重點檔案

### 設定

- `package.json`
- `nuxt.config.ts`
- `tailwind.config.ts`
- `tsconfig.json`
- `.env.example`
- `.gitignore`

### 資料與型別

- `types/content.ts`
- `utils/mockData.ts`
- `utils/date.ts`
- `utils/slug.ts`
- `utils/csv.ts`
- `composables/useMockContent.ts`
- `composables/useSeo.ts`
- `composables/useAuth.ts`

### Layout

- `layouts/default.vue`
- `layouts/admin.vue`
- `components/layout/AppHeader.vue`
- `components/layout/AppFooter.vue`
- `components/layout/AdminSidebar.vue`
- `components/layout/AdminHeader.vue`

### 前台頁

- `pages/index.vue`
- `pages/about.vue`
- `pages/organization.vue`
- `pages/programs/index.vue`
- `pages/programs/breakfast.vue`
- `pages/programs/exploration.vue`
- `pages/activities/index.vue`
- `pages/activities/[slug].vue`
- `pages/news/index.vue`
- `pages/news/[slug].vue`
- `pages/years/index.vue`
- `pages/years/[year].vue`
- `pages/files.vue`
- `pages/faq.vue`
- `pages/contact.vue`

### 後台頁

- `pages/admin/login.vue`
- `pages/admin/dashboard.vue`
- `pages/admin/activities/index.vue`
- `pages/admin/activities/create.vue`
- `pages/admin/activities/edit/[id].vue`
- `pages/admin/posts/index.vue`
- `pages/admin/posts/create.vue`
- `pages/admin/posts/edit/[id].vue`
- `pages/admin/files.vue`
- `pages/admin/categories.vue`
- `pages/admin/years.vue`
- `pages/admin/faq.vue`
- `pages/admin/settings.vue`

### Supabase 準備

- `supabase/schema.sql`

---

## 下一階段建議

### Phase 3：Admin UI 強化

建議補：

1. Admin route middleware。
2. 表單 validation。
3. mock local store，讓新增/編輯可以先在 client 暫存。
4. image/file uploader UI。
5. Admin mobile sidebar。
6. 刪除確認 modal。
7. loading / error state。

### Phase 4：Supabase Integration

建議順序：

1. 安裝 Supabase client。
2. 建立 `plugins/supabase.client.ts` 或 composable client。
3. 接 Supabase Auth。
4. 建立 middleware 保護 `/admin`。
5. 將 `useMockContent.ts` 的 fetch 替換為 Supabase query。
6. 活動 CRUD。
7. 消息 CRUD。
8. 檔案 CRUD。
9. FAQ CRUD。
10. Supabase Storage 上傳。
11. RLS policy。
12. role-based admin permission。

---

## 給下一個 ChatGPT 的工作指令建議

如果要讓 ChatGPT 繼續工作，可以貼這段：

```txt
請接續目前 Nuxt 3 專案「March Out For Love / 愛潮關懷社網站」。

目前 Phase 1 和 Phase 2 已完成，並已建立基本後台 UI。資料都在 utils/mockData.ts，尚未接 Supabase。

請先閱讀：
1. README.md
2. utils/mockData.ts
3. types/content.ts
4. composables/useMockContent.ts
5. supabase/schema.sql
6. pages/admin 下面的後台頁面

下一步請進行 Phase 3 / Phase 4：
1. 建立真正的 admin middleware。
2. 接 Supabase client。
3. 接 Supabase Auth。
4. 將 mock data fetching 改成 Supabase fetching。
5. 將 admin create/edit 表單接成真正 CRUD。
6. 接 Supabase Storage 上傳圖片與檔案。

請不要破壞現有前台頁面與 mock data fallback。若 Supabase env 尚未設定，請保留 mock fallback。
```

