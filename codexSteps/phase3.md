**Codex 專案交接文件：March Out For Love / 愛潮關懷社網站**

**一、專案背景**

本專案是要製作「March Out For Love / 愛潮關懷社」新版網站。

網站主題：

- 中文名稱：愛潮關懷社

- 英文名稱：March Out For Love

- 首頁主標語：以早餐開始陪伴，以行動實踐關懷

- 技術方向：Nuxt 3 + Vue 3 + TypeScript + Tailwind CSS + Supabase

- 目標：將原 Wix 網站內容搬到新版網站，並建立可由 Supabase
  管理資料的前台網站

------------------------------------------------------------------------

**二、目前已完成事項**

**1. Nuxt 專案已建立**

目前專案已經使用 Nuxt 3 作為前端框架，並搭配：

- Vue 3

- TypeScript

- Tailwind CSS

- Supabase

請先檢查現有專案結構，不要直接重建專案。

------------------------------------------------------------------------

**2. Supabase Project 已由使用者自行建立**

使用者已經在 Supabase 建立 project。

目前已知狀態：

- Supabase project 已存在

- 使用者已在 Supabase SQL Editor 執行過一次 schema SQL

- 執行結果為：

Success. No rows returned

這代表 SQL 有成功執行，但該 SQL 不是查詢資料的 SELECT
指令，因此沒有資料列回傳。

------------------------------------------------------------------------

**3. 已測試 activities 表格查詢**

使用者在 Supabase SQL Editor 執行：

select \* from activities;

結果為：

Success. No rows returned

目前判斷：

- activities 資料表應該已建立成功

- 但 activities 表格目前沒有資料

- 不是錯誤

- 下一步需要建立 seed data 或手動 insert 測試資料

------------------------------------------------------------------------

**4. 目前資料庫設計方向**

目前 activities 應該是網站活動資料的主要資料表。

活動資料預計支援：

- 活動名稱

- slug

- 年度

- 活動分類

- 活動日期

- 地點

- 參與人數

- 活動成果

- 活動內容

- 狀態

- 是否精選

- tags

- 照片

- 影片

- 附件

原始需求中的活動分類為：

- 一般活動

- 服務活動

- 特殊活動

目前資料庫可能使用：

regular

project

exploration

請先檢查 schema 實際定義，不要直接修改 enum/check constraint。

建議暫時對應如下：

<table style="width:43%;">
<colgroup>
<col style="width: 14%" />
<col style="width: 27%" />
</colgroup>
<thead>
<tr>
<th><strong>資料庫值</strong></th>
<th><strong>中文顯示</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>regular</td>
<td>一般活動</td>
</tr>
<tr>
<td>project</td>
<td>服務活動 / 核心計畫</td>
</tr>
<tr>
<td>exploration</td>
<td>特殊活動</td>
</tr>
</tbody>
</table>

------------------------------------------------------------------------

**三、Codex 接手後的第一步**

請先完整檢查目前專案，不要直接覆蓋。

請執行以下檢查：

ls

確認是否存在：

package.json

nuxt.config.ts

pages/

components/

layouts/

server/

.env

接著檢查：

cat package.json

cat nuxt.config.ts

需要確認：

- 是否已安裝 @nuxtjs/supabase

- 是否已安裝 Tailwind

- nuxt.config.ts 裡是否有 Supabase module

- 專案目前有哪些 pages/components

- 是否已有 activities 相關頁面或元件

------------------------------------------------------------------------

**四、Supabase 連線設定**

請確認專案根目錄是否有 .env。

若沒有，請建立：

NUXT_PUBLIC_SUPABASE_URL="使用者的 Supabase Project URL"

NUXT_PUBLIC_SUPABASE_KEY="使用者的 Supabase publishable key 或 anon key"

注意：

不要把 Supabase secret key 放到前端 public env。

禁止在前端使用：

SUPABASE_SERVICE_ROLE_KEY

NUXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

Supabase service role / secret key 只能在 server-side 使用。

------------------------------------------------------------------------

**五、安裝與設定 Supabase Nuxt Module**

若尚未安裝 Supabase module，請執行：

npx nuxi@latest module add supabase

或使用目前專案的 package manager：

npm install @nuxtjs/supabase

然後檢查 nuxt.config.ts：

export default defineNuxtConfig({

modules: \[

'@nuxtjs/supabase',

'@nuxtjs/tailwindcss'

\]

})

如果專案已經有其他 modules，請保留原設定，只加入缺少的 module。

------------------------------------------------------------------------

**六、建立 Supabase 測試頁**

請建立一個測試頁面：

pages/supabase-test.vue

內容如下：

\<script setup lang="ts"\>

const supabase = useSupabaseClient()

const { data: activities, error, pending } = await
useAsyncData('activities-test', async () =\> {

const { data, error } = await supabase

.from('activities')

.select('\*')

.order('event_date', { ascending: false })

if (error) {

throw error

}

return data

})

\</script\>

\<template\>

\<main class="p-6"\>

\<h1 class="mb-4 text-2xl font-bold"\>

Supabase Activities Test

\</h1\>

\<p v-if="pending"\>

Loading...

\</p\>

\<pre v-else-if="error" class="rounded bg-red-50 p-4 text-red-600"\>

{{ error }}

\</pre\>

\<div v-else\>

\<p class="mb-4 text-gray-600"\>

Activities count: {{ activities?.length ?? 0 }}

\</p\>

\<div

v-if="activities && activities.length \> 0"

class="space-y-3"

\>

\<article

v-for="activity in activities"

:key="activity.id"

class="rounded border p-4"

\>

\<h2 class="font-semibold"\>

{{ activity.title }}

\</h2\>

\<p class="text-sm text-gray-500"\>

{{ activity.event_date }}｜{{ activity.location }}

\</p\>

\<p class="mt-2"\>

{{ activity.result_summary }}

\</p\>

\</article\>

\</div\>

\<p v-else class="text-gray-500"\>

activities 表格目前沒有資料。這代表 Supabase
連線成功，但尚未建立活動資料。

\</p\>

\</div\>

\</main\>

\</template\>

啟動專案：

npm run dev

測試網址：

http://localhost:3000/supabase-test

------------------------------------------------------------------------

**七、新增活動測試資料**

因為目前 select \* from activities; 回傳 no rows，所以需要新增測試資料。

請建立一份 Supabase seed SQL，例如：

supabase/seed.sql

內容可先使用：

insert into activities (

title,

slug,

academic_year,

activity_type,

event_date,

location,

participants_count,

result_summary,

content,

status,

is_featured,

tags

)

values

(

'迎新茶會',

'welcome-party-114',

114,

'regular',

'2025-09-15',

'中原大學活動中心',

40,

'讓新成員認識愛潮關懷社的服務理念與年度活動。',

'透過社團介紹、破冰活動與服務經驗分享，協助新成員了解社團方向。',

'published',

true,

array\['迎新', '社團', '交流'\]

),

(

'早餐陪伴服務',

'breakfast-care-114',

114,

'project',

'2025-10-12',

'中壢地區',

30,

'以早餐開始陪伴，實踐日常中的關懷行動。',

'社團成員透過準備早餐與實地陪伴，關心服務對象的生活狀況。',

'published',

true,

array\['早餐', '服務', '陪伴'\]

),

(

'聖誕關懷行動',

'christmas-care-113',

113,

'exploration',

'2024-12-20',

'桃園地區',

35,

'透過節慶活動傳遞溫暖與祝福。',

'本次活動結合禮物準備、關懷探訪與團體互動，讓參與者感受陪伴的價值。',

'published',

false,

array\['聖誕', '關懷', '特殊活動'\]

);

執行後再測試：

select \* from activities;

如果有資料回傳，代表資料庫內容正常。

------------------------------------------------------------------------

**八、注意 RLS / status 問題**

請檢查 Supabase schema 裡是否有 Row Level Security policy。

目前預期公開前台只能讀取：

status = 'published'

所以如果測試資料是：

status = 'draft'

前台可能會查不到。

前台測試資料請使用：

status = 'published'

------------------------------------------------------------------------

**九、建立正式活動頁面**

Supabase 測試完成後，請開始整理正式頁面。

建議頁面結構：

pages/

├─ index.vue

├─ about.vue

├─ activities/

│ ├─ index.vue

│ └─ \[slug\].vue

├─ services.vue

├─ contact.vue

└─ supabase-test.vue

活動列表頁：

pages/activities/index.vue

功能：

- 從 Supabase activities 讀取資料

- 只顯示 status = published

- 依日期新到舊排序

- 支援年度篩選

- 支援活動類型篩選

- 使用卡片式版面呈現活動

查詢範例：

const { data, error } = await supabase

.from('activities')

.select('\*')

.eq('status', 'published')

.order('event_date', { ascending: false })

活動詳細頁：

pages/activities/\[slug\].vue

功能：

- 根據 route params slug 查詢單一活動

- 顯示活動標題、日期、地點、人數、成果、內容、照片、影片、附件

- 查無資料時顯示 404 或友善錯誤訊息

查詢範例：

const route = useRoute()

const supabase = useSupabaseClient()

const { data: activity, error } = await
useAsyncData(\`activity-${route.params.slug}\`, async () =\> {

const { data, error } = await supabase

.from('activities')

.select('\*')

.eq('slug', route.params.slug)

.eq('status', 'published')

.single()

if (error) {

throw error

}

return data

})

------------------------------------------------------------------------

**十、元件整理建議**

請建立或檢查以下元件：

components/

├─ activity/

│ ├─ ActivityCard.vue

│ ├─ ActivityFilter.vue

│ └─ ActivityMeta.vue

├─ common/

│ ├─ SectionTitle.vue

│ ├─ PageHeader.vue

│ └─ EmptyState.vue

└─ layout/

├─ SiteHeader.vue

└─ SiteFooter.vue

注意：

之前專案曾出現 Vue warning：

Failed to resolve component: ActivityActivityCard

請檢查元件命名與引用方式，避免重複命名。

正確範例：

\<ActivityCard /\>

檔案位置：

components/activity/ActivityCard.vue

在 Nuxt 3 中通常可以自動匯入，不需要手動 import。\
但若專案設定關閉 auto import，請手動 import。

------------------------------------------------------------------------

**十一、首頁內容方向**

首頁需呈現：

1.  Hero 區塊

    - 標語：以早餐開始陪伴，以行動實踐關懷

    - 社團名稱：March Out For Love / 愛潮關懷社

2.  社團簡介

    - 說明愛潮關懷社的核心理念

    - 強調陪伴、服務、關懷、行動

3.  精選活動

    - 從 activities 讀取 is_featured = true

    - 顯示 3 至 6 筆活動

4.  服務項目

    - 社團服務

    - 核心計畫

    - 行動方案

    - 計畫內容

5.  聯絡 / 加入我們

    - 可先做靜態區塊

------------------------------------------------------------------------

**十二、活動年度需求**

使用者希望年度資料以以下方式區分：

109、110、111、112、113、114

這是民國年。

資料庫中的 academic_year 可使用：

109

110

111

112

113

114

活動頁面篩選器請優先支援這些年度。

------------------------------------------------------------------------

**十三、活動分類需求**

使用者原始需求是依下列分類：

一般活動

服務活動

特殊活動

目前若資料庫使用：

regular

project

exploration

請在前端建立 mapping：

export const activityTypeLabels: Record\<string, string\> = {

regular: '一般活動',

project: '服務活動',

exploration: '特殊活動'

}

如果日後要更改資料庫欄位值，再另外做
migration，不要在目前階段直接硬改，避免破壞既有資料表。

------------------------------------------------------------------------

**十四、需要避免的事情**

請不要：

1.  不檢查現有專案就重建 Nuxt project

2.  直接覆蓋 nuxt.config.ts

3.  把 Supabase secret key 放進前端

4.  在前端使用 service role key

5.  忽略 RLS policy

6.  忽略 status = published

7.  直接假設 activities 有資料

8.  重複建立錯誤元件名稱，例如 ActivityActivityCard

9.  將 schema.sql 重新亂改後直接套用到正式 Supabase

10. 用 any 到處繞過 TypeScript，除非是暫時測試

------------------------------------------------------------------------

**十五、建議實作順序**

請照以下順序完成：

**Step 1：檢查專案狀態**

- 檢查 package.json

- 檢查 nuxt.config.ts

- 檢查 pages/components

- 檢查是否已安裝 Supabase module

**Step 2：確認 Supabase 環境變數**

- 檢查 .env

- 確認 NUXT_PUBLIC_SUPABASE_URL

- 確認 NUXT_PUBLIC_SUPABASE_KEY

**Step 3：建立 Supabase 測試頁**

- 建立 pages/supabase-test.vue

- 查詢 activities

- 顯示 count

- 處理 loading/error/empty 狀態

**Step 4：補測試資料**

- 新增 seed SQL

- 確認 status = published

- 再查詢 select \* from activities;

**Step 5：建立活動列表頁**

- pages/activities/index.vue

- 顯示活動卡片

- 年度篩選

- 分類篩選

- 空資料提示

**Step 6：建立活動詳細頁**

- pages/activities/\[slug\].vue

- 用 slug 查詢單筆活動

- 顯示完整活動內容

**Step 7：整理首頁**

- Hero

- 社團介紹

- 精選活動

- 服務項目

- 聯絡區塊

**Step 8：修正元件命名問題**

- 檢查 ActivityActivityCard 問題

- 統一使用 ActivityCard

- 確保 Nuxt components auto import 正常

**Step 9：TypeScript 型別整理**

建立型別檔：

types/activity.ts

建議內容：

export interface Activity {

id: string

title: string

slug: string

academic_year: number

activity_type: 'regular' | 'project' | 'exploration'

event_date: string | null

location: string | null

participants_count: number | null

result_summary: string | null

content: string | null

status: 'draft' | 'published'

is_featured: boolean

tags: string\[\] | null

created_at?: string

updated_at?: string

}

如果 schema 實際欄位不同，請以 schema 為準修改。

**Step 10：最後驗收**

請確認以下項目：

- npm run dev 可正常啟動

- /supabase-test 可讀取 Supabase

- /activities 可顯示活動列表

- /activities/\[slug\] 可顯示活動詳細頁

- activities 空資料時不會報錯

- Supabase 查不到資料時有友善提示

- Console 沒有 Vue component warning

- Console 沒有 Supabase env missing error

- Tailwind 樣式正常

- TypeScript 沒有明顯錯誤

------------------------------------------------------------------------

**十六、目前最重要的驗收標準**

目前第一階段不是完成整個網站，而是先完成：

Nuxt 3 前台可以成功連接 Supabase，並從 activities 表格讀取 published
活動資料。

只要完成這個，後續活動頁、首頁、後台管理、圖片上傳才有基礎。

------------------------------------------------------------------------

**十七、請 Codex 最後回報**

完成後請回報：

1.  修改了哪些檔案

2.  新增了哪些檔案

3.  是否已成功連接 Supabase

4.  /supabase-test 測試結果

5.  /activities 測試結果

6.  是否需要使用者去 Supabase SQL Editor 手動執行 seed SQL

7.  目前還有哪些未完成事項
