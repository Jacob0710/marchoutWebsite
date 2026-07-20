# Codex 接續專案報告：Supabase 公開活動前台整合驗證與收尾

**專案名稱：** March Out For Love／愛潮關懷社網站  
**專案路徑：** `C:\Users\Admin\Documents\Codex\2026-06-24\phase-1-phase-2-supabase-mock`  
**技術棧：** Nuxt 3、Vue 3、TypeScript、Tailwind CSS、Supabase  
**目前階段：** Supabase 公開活動前台整合完成，待資料寫入、權限驗證與階段驗收  
**文件用途：** 供 Codex 接續開發、驗證與產出完整結案報告  
**執行原則：** 先檢查、再修改；小幅提交；每一步必須可驗證、可回復、可追蹤

---

## 1. 本次接續工作的目標

完成 Supabase 公開活動前台整合的最後驗證與收尾，確認：

1. `schema.sql` 與 `seed.sql` 可在 Supabase 正確執行。
2. `activities` 資料表存在可公開查詢的 `published` 活動。
3. Nuxt SSR 可正常讀取 Supabase 公開活動資料。
4. 首頁、活動列表、活動詳情頁的資料、錯誤與 404 行為正確。
5. Supabase RLS 僅允許匿名使用者讀取已發布活動。
6. `/supabase-test` 不會洩漏敏感資訊，並在正式上線前有明確處置。
7. TypeScript、建置、開發伺服器與主要路由全部通過驗證。
8. 產出可追蹤的變更紀錄、測試結果、已知限制與下一階段建議。

本階段未經使用者明確指示，不進入管理後台 CRUD、Supabase Auth 或 Storage 圖片上傳開發。

---

## 2. 已完成項目

### 2.1 新增公開活動資料 composable

已新增：

```text
composables/usePublicActivities.ts
```

目前預期行為：

- Supabase 環境已設定時，使用 SSR 查詢公開且已發布的活動。
- Supabase 環境未設定時，保留 mock data fallback。
- 公開頁面不可依賴 `service_role` 金鑰。
- 查詢錯誤應能被頁面辨識與顯示。

### 2.2 更新活動列表頁

已更新：

```text
pages/activities/index.vue
```

目前具備：

- Supabase 公開活動資料來源。
- loading 狀態。
- error 狀態。
- 無資料狀態。
- SSR 查詢行為。

### 2.3 更新活動詳情頁

已更新：

```text
pages/activities/[slug].vue
```

目前具備：

- 依 `slug` 查詢活動。
- 查無活動時回傳正確 Nuxt 404。
- 避免將不存在的活動當作一般空資料頁。
- 預期只顯示已發布活動。

### 2.4 更新首頁精選活動

已更新：

```text
pages/index.vue
```

首頁精選活動已改為讀取公開活動資料來源，不再固定只依賴 mock data。

### 2.5 新增 Supabase 診斷頁

已新增：

```text
pages/supabase-test.vue
```

用途：

- 檢查 Supabase 是否已設定。
- 檢查公開活動查詢是否成功。
- 顯示活動筆數。
- 顯示查詢錯誤狀態。
- 協助判斷環境變數、RLS、查詢條件或資料內容問題。

注意：

- 此頁僅供開發與驗證使用。
- 不得顯示 Supabase key、完整環境變數或敏感伺服器資訊。
- 正式上線前必須移除，或改為具備伺服器端管理員權限驗證的受保護頁面。

### 2.6 新增可重複執行的 seed

已新增：

```text
supabase/seed.sql
```

預期特性：

- 可重複執行。
- 不會因重複執行而無限制新增相同資料。
- 與 `schema.sql` 欄位、型別、限制及活動狀態值一致。

### 2.7 修正 TypeScript 問題

已修正：

```text
composables/useFormValidation.ts
```

修正內容：

- 解決原有 TypeScript 泛型索引錯誤。
- 不應以 `any` 或關閉型別檢查作為替代方案。

### 2.8 補齊開發依賴

已加入：

- `vue-tsc`
- `tailwindcss`

目的：

- 讓正式 Nuxt 型別檢查可執行。
- 確保專案依賴與建置流程完整。

---

## 3. 已完成驗證結果

以下驗證已通過：

```bash
pnpm exec nuxi typecheck
```

結果：

```text
通過，無 TypeScript error
```

以下驗證已通過：

```bash
pnpm run build
```

結果：

```text
建置成功
```

以下驗證已通過：

```bash
npm run dev
```

結果：

```text
開發伺服器可正常啟動
```

已確認路由：

```text
/
```

```text
/activities
```

```text
/supabase-test
```

結果：

```text
HTTP 200
```

開發伺服器日誌：

```text
沒有 Vue warning
沒有 runtime error
```

測試完成後，開發伺服器已停止。

---

## 4. 目前已知狀態

Supabase 連線與匿名查詢目前正常，但：

```text
activities = 0 筆
```

因此：

- 首頁與活動列表可能呈現空資料狀態。
- 所有活動詳情 slug 目前應正確回傳 404。
- 目前無法完成「實際活動資料渲染」的最終驗收。

下一個必要步驟是由使用者在 Supabase SQL Editor 依序執行：

```text
supabase/schema.sql
```

接著執行：

```text
supabase/seed.sql
```

Codex 不得假設遠端資料庫已完成上述操作。若無法直接操作使用者的 Supabase SQL Editor，必須明確區分：

- Codex 可完成的本機程式、SQL 檔案與應用驗證。
- 必須由使用者在 Supabase 後台完成的遠端 SQL 執行。

---

## 5. Codex 接續工作規則

### 5.1 開始修改前必須先檢查

先執行：

```powershell
cd C:\Users\Admin\Documents\Codex\2026-06-24\phase-1-phase-2-supabase-mock
git status
git branch --show-current
git log -5 --oneline
```

再檢查：

```text
package.json
nuxt.config.ts
.env.example
composables/usePublicActivities.ts
pages/index.vue
pages/activities/index.vue
pages/activities/[slug].vue
pages/supabase-test.vue
supabase/schema.sql
supabase/seed.sql
composables/useFormValidation.ts
```

如專案不是 Git repository，請在報告中註明，不得假裝已建立提交紀錄。

### 5.2 不得進行的操作

未經使用者明確同意，不得：

- 升級 Nuxt、Vue、Supabase 或其他主要套件版本。
- 大規模重構既有頁面。
- 修改不相關 UI。
- 刪除 mock data fallback。
- 移除或弱化 RLS。
- 將 `service_role` key 放入前端。
- 將任何 Supabase key、密碼或完整 `.env` 寫入 Git。
- 以 `any`、`@ts-ignore` 或關閉 strict check 逃避型別錯誤。
- 為了通過測試而將真實錯誤吞掉。
- 在未確認資料表欄位前猜測 schema。
- 同時混用 npm 與 pnpm 重新產生不同 lockfile。

### 5.3 套件管理原則

目前驗證流程以 pnpm 為準。

優先使用：

```bash
pnpm install
pnpm exec nuxi typecheck
pnpm run build
pnpm run dev
```

若 repository 已存在 `pnpm-lock.yaml`，不得額外更新或新增 `package-lock.json`。

若已存在 `package-lock.json`，先確認既有專案慣例，再決定是否需要清理；不得直接刪除 lockfile。

---

## 6. 必須依序完成的工作

## Task 0：建立乾淨基準

### 操作

1. 檢查 Git 工作樹。
2. 記錄目前分支與最新 commit。
3. 確認是否存在未提交變更。
4. 不得覆蓋使用者未提交的程式。

### 驗收

- 能清楚列出接手前已存在的變更。
- 新增修改可與原有變更區分。
- 未刪除或覆蓋使用者工作。

---

## Task 1：審查 schema 與 seed 一致性

### 檢查項目

逐一核對：

- `activities` 資料表實際欄位名稱。
- 主鍵型別。
- `slug` 是否唯一。
- 發布狀態欄位名稱與允許值。
- `published_at` 是否允許 null。
- 日期與時間欄位型別。
- 圖片、影片與附件欄位型別。
- `created_at`、`updated_at` 預設值。
- foreign key、index、constraint。
- RLS 是否啟用。
- anon `SELECT` policy 的條件。
- seed 欄位是否全部存在。
- seed 的 enum、check constraint 或 status 值是否合法。
- seed 重複執行機制是否可靠。

### 必要原則

若 seed 使用 `ON CONFLICT`：

- conflict target 必須有 unique constraint 或 primary key。
- 優先以穩定且唯一的 `slug` 作為 upsert 判斷條件。
- 更新欄位不得意外覆蓋資料庫管理欄位。

若 schema 與 seed 不一致：

1. 先確認現有前端查詢依賴。
2. 採最小修改。
3. 修改後再次執行型別檢查與 build。
4. 在報告中列出修改原因與風險。

### 驗收

- `schema.sql` 與 `seed.sql` 可依序執行。
- `seed.sql` 可重複執行。
- 第二次執行不產生重複活動。
- seed 至少包含一筆 `published` 活動。
- seed 至少具有可用且唯一的 `slug`。

---

## Task 2：確認 RLS 與公開查詢安全性

### 必須確認

`activities` 必須啟用 RLS。

匿名公開讀取 policy 的條件必須限制為已發布活動，例如：

```sql
status = 'published'
```

實際條件必須依目前 schema 為準，不得直接照抄範例。

不得使用完全開放條件：

```sql
true
```

除非資料表已被明確定義為全部公開，且有使用者書面同意。

### 建議檢查 SQL

```sql
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'activities';
```

### 必須驗證的情境

1. `published` 活動可被 anon 查詢。
2. `draft` 或未發布活動不可被 anon 查詢。
3. 前端不持有 `service_role` key。
4. 診斷頁不顯示任何 key。
5. 錯誤訊息不輸出完整敏感連線資訊。

### 驗收

- anon 只能讀取已發布資料。
- 未發布資料不會出現在首頁、列表與詳情頁。
- RLS 未被停用。
- 前端 runtime config 僅包含適合公開的 Supabase URL 與 anon key。

---

## Task 3：使用者執行遠端 SQL 後進行資料驗證

使用者需在 Supabase SQL Editor 依序執行：

```text
supabase/schema.sql
supabase/seed.sql
```

完成後，Codex 應要求或使用現有開發環境進行驗證，不得重複詢問已提供的專案路徑與環境資訊。

### 資料庫驗證 SQL

依實際欄位調整：

```sql
select
  id,
  title,
  slug,
  status,
  published_at
from public.activities
order by published_at desc nulls last;
```

計算已發布數量：

```sql
select count(*) as published_count
from public.activities
where status = 'published';
```

檢查重複 slug：

```sql
select slug, count(*)
from public.activities
group by slug
having count(*) > 1;
```

### 驗收

- `activities` 筆數大於 0。
- `published` 筆數大於 0。
- `slug` 無重複。
- 活動欄位符合前端需要。
- 再次執行 seed 後筆數不會異常增加。

---

## Task 4：驗證 Nuxt SSR 公開活動查詢

### 檢查 `usePublicActivities.ts`

確認：

- 使用 Nuxt 3 合適的 SSR 資料取得方式。
- 查詢 key 穩定，避免 SSR hydration mismatch。
- 不在模組頂層直接存取 client-only API。
- Supabase 未設定時才使用 mock fallback。
- Supabase 已設定但查詢失敗時，不應靜默改用 mock data 掩蓋正式環境錯誤。
- 查詢結果有明確 TypeScript 型別。
- 排序條件具決定性。
- 資料轉換集中處理，避免每個頁面重複 mapping。
- 錯誤物件不直接輸出敏感內容。

### 重要邏輯區分

必須區分：

```text
Supabase 未設定
```

與：

```text
Supabase 已設定，但查詢失敗
```

建議行為：

- 未設定：可使用 mock data，方便本機展示。
- 已設定但失敗：回傳可辨識錯誤，不應自動假裝查詢成功。
- 已設定且查詢成功但 0 筆：顯示正式空狀態，不應改用 mock data。

### 驗收

- SSR 初次載入即有活動資料。
- 瀏覽器重新整理活動頁不會出現 hydration warning。
- 不需要等待 client mounted 後才顯示主要資料。
- Supabase 0 筆時為正常空狀態。
- Supabase error 時為錯誤狀態。
- mock fallback 僅在環境未設定時生效。

---

## Task 5：頁面功能驗證

啟動：

```bash
pnpm run dev
```

### 5.1 首頁

檢查：

```text
/
```

必須確認：

- HTTP 200。
- 精選活動來自公開活動資料來源。
- 有資料時可正常顯示。
- 無資料時不發生 runtime error。
- 活動連結能導向正確 slug。
- 圖片缺失時有合理 fallback。
- 頁面重新整理正常。
- 無 Vue warning。
- 無 hydration mismatch。

### 5.2 活動列表

檢查：

```text
/activities
```

必須確認：

- HTTP 200。
- loading、error、empty、success 四種狀態邏輯互斥且清楚。
- 只顯示已發布活動。
- 活動排序正確。
- 每筆活動連結正確。
- 無重複 key。
- 無 console error。

### 5.3 活動詳情

以 seed 實際 slug 測試：

```text
/activities/<existing-slug>
```

必須確認：

- HTTP 200。
- 標題、日期、地點、內容等欄位正確。
- SSR 直接開啟可正常渲染。
- 未發布活動 slug 不可公開顯示。

再測試不存在 slug：

```text
/activities/non-existing-slug-for-404-test
```

必須確認：

- 回傳 Nuxt 404。
- 不得回傳 HTTP 200 搭配「找不到資料」文字冒充 404。
- 不得顯示上一筆活動殘留資料。

### 5.4 Supabase 診斷頁

檢查：

```text
/supabase-test
```

必須確認：

- HTTP 200。
- 顯示 Supabase 設定狀態。
- 顯示活動筆數。
- 顯示簡化後的錯誤狀態。
- 不顯示 anon key。
- 不顯示 service role key。
- 不顯示完整環境變數。
- 不顯示可被濫用的內部 stack trace。

---

## Task 6：完整品質驗證

依序執行：

```bash
pnpm install
pnpm exec nuxi typecheck
pnpm run build
```

若專案已有 lint script，再執行：

```bash
pnpm run lint
```

不得自行假設存在 lint script；先檢查 `package.json`。

### 開發伺服器驗證

啟動：

```bash
pnpm run dev
```

使用瀏覽器或 HTTP 工具檢查：

```text
/
```

```text
/activities
```

```text
/activities/<existing-slug>
```

```text
/activities/non-existing-slug-for-404-test
```

```text
/supabase-test
```

### 驗收

- typecheck：0 error。
- build：成功。
- lint：若存在，0 error；warning 必須記錄。
- 首頁：200。
- 活動列表：200。
- 已存在活動詳情：200。
- 不存在活動詳情：404。
- 診斷頁：200。
- 無 Vue warning。
- 無 runtime error。
- 無 hydration mismatch。
- 無未處理 Promise rejection。

測試完成後停止開發伺服器。

---

## Task 7：診斷頁正式上線策略

本階段需做出明確決策並記錄，不可留為未說明狀態。

### 建議方案 A：正式部署前刪除

最簡單且安全：

```text
刪除 pages/supabase-test.vue
```

適用於：

- 正式網站不需要公開診斷功能。
- 尚未建立管理員驗證。
- 不希望暴露資料表與查詢狀態。

### 建議方案 B：僅開發環境啟用

可使用環境判斷，但必須確保正式建置無法公開存取，不能只在 UI 隱藏連結。

### 建議方案 C：移入管理後台

必須具備：

- Supabase Auth。
- 伺服器端 session 驗證。
- 管理員角色或白名單。
- 未授權時回傳 401 或 403。
- 不得只靠前端 route middleware 或按鈕隱藏。

### 本階段預設

在管理員驗證尚未完成前：

```text
保留於本機開發，正式部署前移除
```

---

## 7. 程式設計規範

### 7.1 Nuxt 與 Vue

- 使用 Vue 3 Composition API。
- 元件優先採用 `<script setup lang="ts">`。
- 保持 SSR 相容。
- 不在 SSR 階段直接使用 `window`、`document`、`localStorage`。
- 需要 client-only API 時，使用明確 client guard。
- 不將資料查詢邏輯散落在多個頁面。
- composable 應維持單一責任。
- 頁面只處理頁面狀態、SEO、路由與畫面組合。

### 7.2 TypeScript

- 保持 strict-compatible。
- 避免 `any`。
- 不使用 `@ts-ignore`。
- Supabase row 型別應明確。
- 可能為 null 的欄位必須處理。
- `slug`、status 與日期欄位不可用不安全型別斷言掩蓋問題。
- API 錯誤需轉為可控的應用錯誤狀態。

### 7.3 Supabase

- 前端只使用 anon key。
- `service_role` 僅可存在於安全伺服器環境，且本階段不需要。
- 所有公開資料表都必須有 RLS。
- SQL migration、schema、seed 必須可追蹤。
- 不直接在 production 手動修改 schema 後不回寫 SQL 檔案。
- 查詢只選取前端需要的欄位，避免無限制 `select('*')`，除非已確認必要性。

### 7.4 錯誤處理

必須區分：

- 環境未設定。
- 網路或 Supabase 查詢錯誤。
- 查詢成功但無資料。
- slug 不存在。
- 資料格式不完整。
- 權限拒絕。

不得將所有情況都顯示為相同錯誤。

### 7.5 UI 狀態

每個資料頁應明確處理：

```text
pending
error
empty
success
```

狀態不可同時顯示。

---

## 8. 問題排查順序

若 `/supabase-test` 仍顯示 0 筆，依序檢查：

1. 使用者是否在正確 Supabase Project 執行 SQL。
2. `schema.sql` 是否成功。
3. `seed.sql` 是否成功。
4. Table Editor 是否可看到資料。
5. seed 資料是否為 `published`。
6. 前端查詢 status 條件是否與 schema 一致。
7. RLS policy 是否允許 anon 讀取 published。
8. `.env` 是否指向同一個 Supabase Project。
9. Nuxt 開發伺服器是否在 `.env` 修改後重新啟動。
10. runtime config 名稱是否與 composable 使用名稱一致。
11. Supabase client 是否讀取正確 URL 與 anon key。
12. 查詢欄位名稱是否存在。
13. 日期、slug 或 status 是否因資料轉換而被過濾。
14. SSR server log 是否有 401、403、400 或資料庫錯誤。

若 SQL Editor 查得到資料，但前端查不到：

- 優先檢查 RLS。
- 再檢查專案 URL 與 anon key。
- 再檢查查詢條件。
- 最後才考慮前端渲染問題。

---

## 9. 變更管理與提交規範

每個 commit 應只處理單一主題。

建議 commit 類型：

```text
fix: align activity seed with Supabase schema
```

```text
test: verify public activity SSR and 404 behavior
```

```text
docs: add Supabase integration verification report
```

不得將以下內容混在同一 commit：

- 大量格式化。
- 套件升級。
- UI 重構。
- SQL policy 修改。
- 不相關 bug 修正。

提交前必須再次執行：

```bash
pnpm exec nuxi typecheck
pnpm run build
```

若使用者未要求 Codex commit 或 push，不得自動推送遠端。

---

## 10. 完成定義 Definition of Done

只有全部符合以下條件，才可宣告本階段完成：

- [ ] 已檢查並記錄接手前 Git 狀態。
- [ ] `schema.sql` 與 `seed.sql` 欄位一致。
- [ ] `seed.sql` 可重複執行。
- [ ] Supabase `activities` 大於 0 筆。
- [ ] 至少一筆活動為已發布狀態。
- [ ] anon 可讀取已發布活動。
- [ ] anon 不可讀取未發布活動。
- [ ] 首頁可顯示公開活動。
- [ ] 活動列表可顯示公開活動。
- [ ] 已存在 slug 回傳 200。
- [ ] 不存在 slug 回傳真實 404。
- [ ] SSR 重新整理正常。
- [ ] 無 hydration mismatch。
- [ ] `/supabase-test` 不洩漏敏感資訊。
- [ ] 已記錄診斷頁正式上線處置。
- [ ] `pnpm exec nuxi typecheck` 通過。
- [ ] `pnpm run build` 通過。
- [ ] 主要路由測試通過。
- [ ] 開發伺服器無 Vue warning。
- [ ] 開發伺服器無 runtime error。
- [ ] 已停止測試伺服器。
- [ ] 已產出完整執行報告。

---

## 11. Codex 最終回報格式

完成工作後，請依下列格式回報，不得只回覆「完成」。

### 11.1 執行摘要

```text
本次完成了哪些工作。
```

### 11.2 修改檔案

逐一列出：

```text
檔案路徑
修改原因
主要變更
```

### 11.3 資料庫狀態

列出：

```text
activities 總筆數
published 筆數
draft／未發布筆數
slug 重複檢查結果
RLS policy 驗證結果
```

若無法直接取得資料庫數據，必須明確標示：

```text
待使用者在 Supabase SQL Editor 執行或提供結果
```

不得猜測數字。

### 11.4 驗證結果

使用表格列出：

| 驗證項目 | 指令或路由 | 結果 |
|---|---|---|
| TypeScript | `pnpm exec nuxi typecheck` | PASS／FAIL |
| Production build | `pnpm run build` | PASS／FAIL |
| 首頁 | `/` | HTTP 狀態 |
| 活動列表 | `/activities` | HTTP 狀態 |
| 活動詳情 | `/activities/<slug>` | HTTP 狀態 |
| 不存在活動 | `/activities/<invalid-slug>` | HTTP 狀態 |
| Supabase 診斷 | `/supabase-test` | HTTP 狀態 |
| Vue warnings | server log | 無／有 |
| Runtime errors | server log | 無／有 |

### 11.5 已知限制

列出所有尚未完成或需使用者處理的事項。

### 11.6 風險與建議

至少包含：

- RLS 風險。
- 診斷頁上線風險。
- 環境變數管理。
- mock fallback 與正式資料的界線。
- 下一階段開始前的必要條件。

### 11.7 下一步

本階段完全驗收後，再建議進入：

1. Supabase Auth 管理員登入。
2. 管理員角色與伺服器端權限。
3. 活動管理列表。
4. 新增活動。
5. 編輯活動。
6. 草稿與發布流程。
7. Supabase Storage 圖片上傳。
8. 圖片、影片、附件管理。
9. 刪除、封存與審計紀錄。
10. 正式部署與環境變數設定。

不得在本階段未通過前，同時展開上述後台功能。

---

## 12. 給 Codex 的直接執行指令

請接續此專案，但先不要開發管理後台。

工作順序：

1. 檢查 Git 狀態、現有檔案與依賴。
2. 審查 `supabase/schema.sql`、`supabase/seed.sql`、`composables/usePublicActivities.ts` 的一致性。
3. 確認 seed 可重複執行，且至少產生一筆已發布活動。
4. 確認 RLS 只允許 anon 讀取已發布活動。
5. 不得使用 `service_role` key，不得輸出任何 key。
6. 使用者完成 Supabase SQL Editor 操作後，驗證 `/supabase-test`、首頁、活動列表、活動詳情與正確 404。
7. 執行 typecheck、build 與主要路由 smoke test。
8. 僅做必要且最小範圍修改。
9. 不升級主要套件、不大規模重構、不刪除 mock fallback。
10. 完成後依本文件第 11 節格式回報完整結果。

若遠端 Supabase SQL 尚未由使用者執行，先完成可在本機完成的審查與修正，並將遠端驗證標記為阻塞項目；不得假裝遠端資料已存在或驗證已通過。
