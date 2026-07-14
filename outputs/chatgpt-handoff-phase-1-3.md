# March Out For Love / 愛潮關懷社網站 Phase 1-3 交接稿

這份文件是給 ChatGPT 或下一位開發協作者的完整交接版本。它說明目前專案已完成什麼、我每一步做了什麼、目前仍是 mock 的地方，以及接下來 Phase 4 接 Supabase 時應該怎麼延續。

---

## 可直接貼給 ChatGPT 的版本

請你接手一個 Nuxt 3 專案，專案名稱是 `march-out-for-love`，目標是建立「March Out For Love / 愛潮關懷社」網站。

目前已完成 Phase 1、Phase 2、Phase 3：

### 已完成的技術基礎

1. 使用 Nuxt 3 建立專案。
2. 使用 Vue 3 + TypeScript。
3. 使用 Tailwind CSS。
4. 使用 `lucide-vue-next` 作為 icon library。
5. 目前尚未接 Supabase。
6. 目前所有內容資料都來自 `utils/mockData.ts`。
7. 已建立 `.env.example`，但還沒有實際 `.env`。
8. 已建立 `supabase/schema.sql`，作為 Phase 4 Supabase schema 草稿。
9. 已建立 `.gitignore`，排除 `node_modules`、`.nuxt`、`.output`、`.env`。

### 已完成的前台頁面

公開前台頁面已完成：

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

前台功能包含：

1. 首頁 hero、社團介紹、服務主軸、精選活動、年度成果、YouTube embed、最新消息、聯絡入口。
2. 活動列表支援 keyword search、academic year filter、activity type filter。
3. 活動詳情頁支援 metadata、活動照片、影片、相關檔案。
4. 消息列表與消息詳情。
5. 年度成果列表與年度詳情。
6. 檔案下載頁支援 keyword search、academic year filter、category filter。
7. FAQ accordion。
8. 聯絡頁含地圖 placeholder 與社群連結。
9. 使用 `useSeo.ts` 設定基本 SEO。

### 已完成的後台頁面

後台 UI 已完成：

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

後台目前是 mock UI，不會寫入 Supabase，也不會永久修改 `mockData.ts`。

### Phase 3 已完成的後台行為

1. 已建立 admin middleware：
   - `middleware/admin-auth.global.ts`
2. 已保護 `/admin/dashboard` 與所有 `/admin/*` 頁面。
3. `/admin/login` 不需要登入即可進入。
4. `useAuth.ts` 仍是 mock auth，但現在會使用 cookie：
   - cookie name: `mock-admin-auth`
5. 未登入進入 `/admin/dashboard` 會導到：
   - `/admin/login?redirect=/admin/dashboard`
6. 帶 `mock-admin-auth=true` cookie 時可進入 dashboard。
7. 登入成功後會回到 redirect 目標或 `/admin/dashboard`。
8. 登出會清掉 mock auth 並導回 `/admin/login`。
9. 後台表單已加入基本 validation。
10. 後台表單已加入 loading、error、success state。
11. 後台清單頁已加入 loading / error state。
12. 已新增刪除確認 modal：
   - `components/admin/ConfirmModal.vue`
13. 活動、消息、檔案、FAQ 清單頁都有刪除確認 modal。
14. 刪除目前只會改本頁 local state，不會永久改 mock data。

### 重要資料與 composables

主要 mock data：

- `utils/mockData.ts`

主要型別：

- `types/content.ts`

主要 composables：

- `composables/useMockContent.ts`
- `composables/useSeo.ts`
- `composables/useAuth.ts`
- `composables/useFormValidation.ts`

主要 middleware：

- `middleware/admin-auth.global.ts`

主要 admin component：

- `components/admin/AdminDataTable.vue`
- `components/admin/AdminFormSection.vue`
- `components/admin/StatusBadge.vue`
- `components/admin/ConfirmModal.vue`

### 目前 mock data 內容

`utils/mockData.ts` 目前包含：

- 6 筆活動
- 3 筆最新消息
- 6 筆檔案
- 5 筆 FAQ
- 109-114 學年度成果
- 3 個服務計畫
- site settings

### 已驗證

已執行：

```bash
pnpm run build
```

結果：成功。

也已檢查：

1. `/` 回 200。
2. `/admin/login` 回 200。
3. 未登入進 `/admin/dashboard` 回 302，導向 `/admin/login?redirect=/admin/dashboard`。
4. 帶 cookie `mock-admin-auth=true` 進 `/admin/dashboard` 回 200。

### 目前限制

1. 尚未接 Supabase。
2. 後台登入仍是 mock，不是真正 Supabase Auth。
3. 後台 create/edit/delete 不會永久保存資料。
4. 檔案下載 URL 仍是 placeholder。
5. 圖片多數使用外部 Unsplash URL。
6. Supabase Storage 尚未接。
7. Route protection 目前依賴 mock cookie，不是正式 session。

### 下一步建議：Phase 4

Phase 4 建議順序：

1. 安裝 Supabase client。
2. 建立 Supabase client plugin 或 composable。
3. 接 Supabase Auth。
4. 讓 `useAuth.ts` 改用 Supabase session。
5. 保留 mock fallback，避免 env 未設定時前台壞掉。
6. 將 `useMockContent.ts` 逐步改成 Supabase fetch。
7. 後台 activity CRUD 接 Supabase。
8. 後台 posts CRUD 接 Supabase。
9. 後台 files CRUD 接 Supabase。
10. 後台 FAQ CRUD 接 Supabase。
11. 接 Supabase Storage。
12. 加上 RLS policies。
13. 加上 role-based admin permission。

---

## 我做過的每一個步驟

### Step 1：讀取需求與判斷範圍

使用者原始需求是建立「March Out For Love / 愛潮關懷社」網站，技術指定：

- Nuxt 3
- Vue 3 + TypeScript
- Tailwind CSS
- Supabase
- Supabase Auth
- Supabase Storage
- Cloudflare Pages

但第一階段要求是：

- 先完成 Phase 1 和 Phase 2
- 先不要接 Supabase
- 使用 mock data
- 建立完整前台與基本後台畫面

後來又要求繼續 Phase 3：

- admin middleware
- 保護 `/admin/*`
- login 放行
- mock auth 仍保留
- 表單 validation
- 刪除確認 modal
- loading / error state
- build 必須成功

因此目前版本的定位是：

「前台完整、後台 UI 與 mock auth guard 完整、資料仍為 mock、準備進 Phase 4 接 Supabase。」

---

### Step 2：建立 Nuxt 專案基礎

建立了：

- `package.json`
- `nuxt.config.ts`
- `tailwind.config.ts`
- `tsconfig.json`
- `app.vue`
- `assets/css/main.css`

`package.json` 主要 dependencies：

- `nuxt`
- `@nuxtjs/tailwindcss`
- `lucide-vue-next`
- `typescript`

可用 scripts：

```bash
pnpm run dev
pnpm run build
pnpm run generate
pnpm run preview
```

---

### Step 3：建立全站樣式

在 `assets/css/main.css` 建立：

- Tailwind base/components/utilities
- 全站字體設定
- `page-shell`
- `section-y`
- `surface`
- `prose-content`
- focus ring
- hero animation
- reveal animation

視覺方向使用溫暖、明亮、公益服務感的色彩。

---

### Step 4：建立資料型別

建立 `types/content.ts`。

主要型別：

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

1. 讓 mock data 有固定 shape。
2. 讓前台與後台使用一致資料結構。
3. 未來接 Supabase 時可對應 schema。

---

### Step 5：建立 mock data

建立 `utils/mockData.ts`。

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

這讓前台和後台都可以在不接 Supabase 的狀態下完整運作。

---

### Step 6：建立工具函式

建立：

- `utils/date.ts`
- `utils/slug.ts`
- `utils/csv.ts`

用途：

- 日期格式化
- slug 產生
- CSV 匯出

CSV 匯出目前用在：

- `/admin/activities`
- `/admin/posts`
- `/admin/files`

---

### Step 7：建立 composables

建立：

- `composables/useMockContent.ts`
- `composables/useSeo.ts`
- `composables/useAuth.ts`

後來 Phase 3 新增：

- `composables/useFormValidation.ts`

#### `useMockContent.ts`

集中提供：

- activities
- featuredActivities
- files
- posts
- programs
- faq
- years
- settings
- `getActivityBySlug`
- `getPostBySlug`
- `getYear`

這是未來 Phase 4 替換成 Supabase fetch 的主要入口。

#### `useSeo.ts`

集中設定：

- title
- description
- og title
- og description
- og image
- twitter card

#### `useAuth.ts`

一開始只有 Nuxt state：

- `isLoggedIn`
- `login`
- `logout`

Phase 3 後改成：

- Nuxt state + cookie
- cookie name: `mock-admin-auth`

這樣 middleware 可以在 SSR / refresh / direct URL entry 時判斷是否登入。

#### `useFormValidation.ts`

Phase 3 新增，用於後台表單基本驗證。

支援：

- required
- minLength
- pattern
- custom message

---

### Step 8：建立前台 layout

建立：

- `layouts/default.vue`
- `components/layout/AppHeader.vue`
- `components/layout/AppFooter.vue`

前台 header 包含：

- Logo
- 主選單
- 檔案下載
- 後台入口
- mobile menu

---

### Step 9：建立後台 layout

建立：

- `layouts/admin.vue`
- `components/layout/AdminSidebar.vue`
- `components/layout/AdminHeader.vue`

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

### Step 10：建立共用元件

建立：

- `components/common/PageHero.vue`
- `components/common/SectionTitle.vue`
- `components/common/BaseButton.vue`
- `components/common/BaseCard.vue`
- `components/common/EmptyState.vue`
- `components/common/LoadingState.vue`
- `components/common/SearchInput.vue`
- `components/common/YearTabs.vue`
- `components/common/CategoryTabs.vue`

Phase 3 也更新了：

- `components/common/BaseButton.vue`

讓它支援：

- `type`
- `disabled`
- submit button 使用

---

### Step 11：建立活動元件

建立：

- `components/activity/ActivityCard.vue`
- `components/activity/ActivityFilter.vue`
- `components/activity/ActivityGallery.vue`
- `components/activity/ActivityMeta.vue`
- `components/activity/YouTubeEmbed.vue`
- `components/activity/FileList.vue`

用於活動列表與活動詳情。

---

### Step 12：建立 admin 元件

建立：

- `components/admin/AdminDataTable.vue`
- `components/admin/AdminFormSection.vue`
- `components/admin/StatusBadge.vue`

Phase 3 新增：

- `components/admin/ConfirmModal.vue`

Confirm modal 用於：

- 刪除活動
- 刪除消息
- 刪除檔案
- 刪除 FAQ

---

### Step 13：建立前台頁面

建立：

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

這些頁面都使用 mock data，不依賴 Supabase。

---

### Step 14：建立後台頁面

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

Phase 3 後，這些頁面中多數已具備：

- validation
- loading state
- error state
- success state
- delete confirm modal

---

### Step 15：建立 Supabase 準備檔

建立：

- `.env.example`
- `supabase/schema.sql`

`.env.example`：

```env
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`supabase/schema.sql` 包含：

- `activities`
- `activity_images`
- `posts`
- `files`
- `categories`
- `faq`
- `site_settings`

---

### Step 16：建立 README

建立 `README.md`，內容說明：

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

### Step 17：Phase 3 建立 admin middleware

新增：

- `middleware/admin-auth.global.ts`

邏輯：

1. 如果不是 `/admin` 開頭，直接放行。
2. 如果是 `/admin/login`，未登入可進入。
3. 如果未登入且不是 login，導向 `/admin/login?redirect=原本路徑`。
4. 如果已登入又進 login，導向 redirect 或 `/admin/dashboard`。

這完成了：

- 保護 `/admin/dashboard`
- 保護所有 `/admin/*`
- 放行 `/admin/login`

---

### Step 18：Phase 3 更新 mock auth

更新：

- `composables/useAuth.ts`

從純 Nuxt state 改成：

- `useState('mock-admin-auth')`
- `useCookie('mock-admin-auth')`

登入時：

- `isLoggedIn.value = true`
- `authCookie.value = true`
- 導向 redirect target

登出時：

- `isLoggedIn.value = false`
- `authCookie.value = false`
- 導向 `/admin/login`

---

### Step 19：Phase 3 建立表單 validation

新增：

- `composables/useFormValidation.ts`

套用到：

- `pages/admin/login.vue`
- `pages/admin/activities/create.vue`
- `pages/admin/activities/edit/[id].vue`
- `pages/admin/posts/create.vue`
- `pages/admin/posts/edit/[id].vue`
- `pages/admin/faq.vue`
- `pages/admin/settings.vue`

每個表單都加了：

- `novalidate`
- `@submit.prevent`
- required checks
- min length checks
- slug pattern checks
- email pattern checks
- field-level error messages
- submit loading
- submit success/error message

---

### Step 20：Phase 3 新增刪除確認 modal

新增：

- `components/admin/ConfirmModal.vue`

套用到：

- `pages/admin/activities/index.vue`
- `pages/admin/posts/index.vue`
- `pages/admin/files.vue`
- `pages/admin/faq.vue`

目前刪除行為：

- 打開 modal
- 使用者確認
- 顯示 deleting loading
- 從本頁 local ref array 移除
- 不修改 `utils/mockData.ts`
- 不寫入 Supabase

這符合目前 mock 階段。

---

### Step 21：Phase 3 加入 loading / error state

加入 loading/error state 的頁面：

- `pages/admin/dashboard.vue`
- `pages/admin/activities/index.vue`
- `pages/admin/posts/index.vue`
- `pages/admin/files.vue`

加入 submit loading/error/success state 的頁面：

- `pages/admin/login.vue`
- `pages/admin/activities/create.vue`
- `pages/admin/activities/edit/[id].vue`
- `pages/admin/posts/create.vue`
- `pages/admin/posts/edit/[id].vue`
- `pages/admin/faq.vue`
- `pages/admin/settings.vue`

---

### Step 22：Build 驗證

執行：

```bash
pnpm run build
```

結果：

- Nuxt client build 成功
- Nuxt server build 成功
- Nitro server build 成功

---

### Step 23：Middleware 行為驗證

使用 HTTP 檢查：

未登入進入：

```txt
/admin/dashboard
```

結果：

```txt
302 /admin/login?redirect=/admin/dashboard
```

帶 cookie：

```txt
mock-admin-auth=true
```

進入：

```txt
/admin/dashboard
```

結果：

```txt
200
```

確認：

- `/admin/login` 回 200
- `/` 回 200

---

## 現在最重要的專案檔案

### Auth / Middleware

- `composables/useAuth.ts`
- `middleware/admin-auth.global.ts`

### Validation / Modal

- `composables/useFormValidation.ts`
- `components/admin/ConfirmModal.vue`

### Mock Data

- `utils/mockData.ts`
- `types/content.ts`
- `composables/useMockContent.ts`

### Admin Pages

- `pages/admin/login.vue`
- `pages/admin/dashboard.vue`
- `pages/admin/activities/index.vue`
- `pages/admin/activities/create.vue`
- `pages/admin/activities/edit/[id].vue`
- `pages/admin/posts/index.vue`
- `pages/admin/posts/create.vue`
- `pages/admin/posts/edit/[id].vue`
- `pages/admin/files.vue`
- `pages/admin/faq.vue`
- `pages/admin/settings.vue`

### Supabase Preparation

- `.env.example`
- `supabase/schema.sql`

---

## 給下一個 ChatGPT 的建議工作指令

如果要讓 ChatGPT 繼續 Phase 4，可以貼這段：

```txt
請接續目前 Nuxt 3 專案「March Out For Love / 愛潮關懷社網站」。

目前 Phase 1、Phase 2、Phase 3 已完成：
- 前台完整
- 後台 UI 完整
- mock data 完整
- admin middleware 已完成
- mock auth 使用 mock-admin-auth cookie
- 後台表單已有基本 validation
- 後台清單已有 loading/error state
- 活動、消息、檔案、FAQ 已有刪除確認 modal
- pnpm run build 已成功

請進入 Phase 4：Supabase Integration。

請先閱讀：
1. README.md
2. utils/mockData.ts
3. types/content.ts
4. composables/useMockContent.ts
5. composables/useAuth.ts
6. middleware/admin-auth.global.ts
7. supabase/schema.sql
8. pages/admin 下面的後台頁面

Phase 4 請依序完成：
1. 安裝並設定 Supabase client。
2. 建立 Supabase plugin 或 composable。
3. 將 useAuth.ts 從 mock cookie 改成 Supabase Auth，但保留 mock fallback。
4. 讓 middleware 使用 Supabase session 判斷登入。
5. 將 useMockContent.ts 逐步改成 Supabase fetch，但 env 未設定時仍使用 mock data。
6. 將 admin activities create/edit/delete 接上 Supabase CRUD。
7. 將 admin posts create/edit/delete 接上 Supabase CRUD。
8. 將 admin files 與 FAQ 接上 Supabase CRUD。
9. 接 Supabase Storage 上傳圖片與檔案。
10. 加上 RLS policies 與 role-based permission。

請不要破壞現有前台頁面。
請不要移除 mock data fallback。
請確保 pnpm run build 成功。
```

