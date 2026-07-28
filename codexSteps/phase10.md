# March Out For Love — Phase 10 Codex 獨立執行規格

> 文件用途：本文件可直接交給 Codex，在 March Out For Love 專案儲存庫中獨立執行 Phase 10。
>
> 階段主軸：內容審核與分批發布、舊網址 redirect activation、正式上線與維運基礎。
>
> 文件日期：2026-07-22（Asia/Taipei）

---

## 0. Codex 執行指令

你現在負責 March Out For Love 網站 Phase 10。請先完整閱讀本文件、儲存庫內的 `AGENTS.md`、既有 `codexSteps/phase3.md` 至 `phase9.md`（若存在）、Phase 7–9 完成報告、架構文件、部署準備文件、migration、verification SQL、smoke scripts 與 `package.json`，再開始修改。

請直接在既有專案上工作，不要另建一個示範專案，不要重做 Phase 3–9，亦不要以 mock、假資料或只更新文件宣稱 Phase 10 完成。

執行原則：

1. 先驗證基準，再修改。
2. 優先沿用現有命名、型別、server API、RLS、audit、migration、smoke 與報告格式。
3. 若儲存庫已有等價功能，擴充現有實作，不要建立第二套平行系統。
4. 不猜測 Wix 內容、不猜測個資是否已取得公開同意、不猜測部署平台能力。
5. 缺少內容事實時維持 `draft`；缺少公開授權或無法完成遮蔽時不得發布。
6. 安全且可回復的工作可繼續；需要真實帳號、DNS、hosting、Supabase、備份或人工內容決策時，先完成所有不受阻塞的部分，再明確列出 operator checkpoint。
7. Phase 10 Definition of Done 全部通過前，不得建立 completion tag，不得宣稱完成。

---

## 1. 唯一合法基準

Phase 10 必須從下列 Phase 9 成果開始：

- Branch：`main`
- Baseline commit：`0784b22893ba2cf8cc2505536c079a6e2d7dd217`
- Baseline tag：`phase-9-wix-content-migration-complete`
- 預期狀態：本機 `HEAD`、`origin/main`、本機 tag target、遠端 tag target 全部相同，工作樹乾淨。

開始前必須執行唯讀檢查並保存輸出：

```bash
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git rev-list -n 1 phase-9-wix-content-migration-complete
git ls-remote --tags origin refs/tags/phase-9-wix-content-migration-complete
```

若 hash 不一致、工作樹不乾淨、tag 不存在，或存在非本階段的使用者修改：

- 不得 reset、restore、stash、刪除或覆蓋使用者變更。
- 先辨識差異來源及是否與 Phase 10 重疊。
- 無法安全避開時停止修改，回報實際狀態與阻塞原因。

不得使用 `git reset --hard`、不得強制推送、不得重寫 Phase 9 tag。

---

## 2. Phase 9 已驗證事實

以下數字是 Phase 10 的 reconciliation 基準，不得自行改寫：

### 2.1 Wix 與 migration snapshot

- Authoritative Wix source：`https://a0903080125.wixsite.com/website`
- Snapshot SHA-256：`3a6a00bcd5a5b8030ab5da6b61cd597f2df4c0762edb46dd9f8655e003cceb60`
- 83 個頁面、398 個安全資產、251/251 份 PDF/DOCX 已完成證據解析。
- Source inventory 共 526 項，disposition：migrate 423、merge 6、redirect-only 25、archive 2、skip 70。

### 2.2 已匯入內容

| 模組 | Phase 9 匯入 | Phase 9 結束狀態 |
| --- | ---: | --- |
| Activities | 46 | 全部 draft |
| Files | 18 | 全部 draft |
| Year Summaries | 6 | 全部 draft |
| Site Settings | 1 merge | 維持公開 singleton |

注意：Activities 全站總計為 3 published / 47 draft，其中只有 46 筆是 Phase 9 新匯入。既有的 1 筆 Activity draft 不得因「處理 70 筆匯入草稿」而被誤發布。

### 2.3 資產與 review

- 私有 Storage：360 個 Activity assets、18 個 Files，共 378 objects / 378 references / 120,109,005 bytes。
- Phase 9 結束時：0 orphan、0 missing。
- 70 筆匯入內容全數為 draft。
- 122 筆 publication review，其中 40 筆 high severity；122 筆都阻擋發布，但不阻擋 Phase 9 migration。
- review 涵蓋個資遮蔽、缺少活動／成果／參與資訊、年度敘事與 draft-target redirect。

### 2.4 redirect manifest

- 83 條來源路徑。
- 29 條 structural 301 candidates。
- 52 條 draft-target mappings，Phase 9 以 `status_code=0` 保持 inactive。
- 2 條 Wix utility routes 已 archive。
- 0 條已核准 410、0 loop、0 chain、0 conflict。
- Phase 9 僅完成 redirect 文件與 manifest，完成報告明載 redirect configuration 尚未部署。Phase 10 必須以實際 HTTP 行為重新確認，不可因 manifest 存在便宣稱已啟用。

---

## 3. Phase 10 目標

Phase 10 必須交付以下結果：

1. 建立可稽核的 editorial review queue，完整涵蓋 Phase 9 的 122 筆 publication review。
2. 逐筆完成 70 筆匯入草稿的內容校對、缺漏處理、個資與敏感資料審查、資產處理及明確發布決策。
3. 只發布已通過審核的內容，並採小批次、可驗證、可回復的發布流程。
4. 將 redirect manifest 轉為實際部署設定；只啟用目標已公開且通過驗證的 301。
5. 建立 production 上線最低必要基礎：環境分離、備份與還原演練、CI quality gate、health/monitoring、redacted logging、安全標頭、cache policy、release/rollback/incident runbook。
6. 保留 Phase 5–9 的所有安全邊界，完成 regression、Browser、mobile、accessibility、console、hydration、Storage reconciliation 與遠端 Git hash 驗證。

Phase 10 的成功不是「把 70 筆全部改成 published」。成功標準是每筆內容及每條 deferred redirect 都有可追溯、符合證據與隱私要求的結論；不符合公開條件者必須保持 draft/inactive。

---

## 4. 非目標

除非是完成本階段所必需，不得在 Phase 10 進行：

- Nuxt、Vue、Supabase 或 Tailwind 主要版本升級。
- UI 全站重設計或資訊架構大改。
- 新增與 Wix 無關的大型內容模組。
- 恢復 browser direct write、`service_role`、Auth Admin API 或廣泛的 `authenticated FOR ALL` policy。
- 將 private bucket 改為 public。
- 以 `v-html` 顯示 migration 或 editor 內容。
- 自動臆測日期、年度、類別、參與人數、活動成果、姓名、職稱或授權狀態。
- 導入未經核准的第三方 analytics、廣告追蹤、cookie banner 或付費監控服務。
- 把所有未知舊網址導向首頁、admin 頁面或任意「最接近」頁面。
- 清除或改寫 Phase 9 provenance、source snapshot、migration run、source reference 或原始 hash。

---

## 5. 不可破壞的安全與架構邊界

所有 Phase 10 實作必須保留：

1. Public pages 使用 Nuxt/Nitro SSR 與 same-origin server API。
2. Browser 不擁有資料庫 mutation authority；所有管理寫入通過受保護的 Nitro server API。
3. 每個管理 API 都必須 server-side `requireAdmin()`，並保留 anon / non-admin / active-admin 三種身分邊界。
4. Mutation 保留 same-origin / CSRF 防護、輸入驗證、穩定 error code 與不洩漏 stack/path/Supabase raw error 的回應。
5. Supabase runtime 只使用 anon key 加使用者 JWT；不得加入、提交或記錄 `service_role`、database password、access token、signed URL 或測試帳密。
6. RLS 必須維持啟用；新增 table、function、view、RPC 或 Storage policy 必須採 least privilege。
7. `security definer` 僅在確有必要時使用，必須固定 `search_path`、撤銷 public/anon execute，並以 verification SQL 證明權限範圍。
8. Private Storage 保持 private。公開檔案與圖片仍由既有 proxy 在 target 已 published 時授權回傳；draft/unpublished 永遠公開 404。
9. Auth、admin、private asset proxy、會寫入 cookie 或含使用者資料的回應不得使用 public/shared cache；需明確 `private, no-store` 或等價設定，並在實際 hosting/CDN 驗證。
10. Migration 內容仍以 plain text / escaped rendering 顯示，禁止未消毒 HTML 注入。
11. Audit 保持 append-only；不得提供 UI 或一般 API 修改、刪除既有 audit event。
12. Mock fallback 只在兩個 public Supabase 環境變數都缺少時啟用；部分設定不得靜默 fallback。

---

## 6. 執行順序與停損點

必須依序完成：

1. Baseline 與 repository inspection。
2. Phase 9 reconciliation 與完整備份。
3. Editorial data model、API、UI、audit 與 verification。
4. 個資遮蔽與內容品質處理。
5. Staging dry-run 與分批發布。
6. Redirect deployment 與真實 HTTP 驗證。
7. Production readiness、monitoring、restore rehearsal、security/cache checks。
8. 全回歸、cleanup、reconciliation、完成報告。
9. 最終 commit、tag、push、remote hash verification。

遇到下列情況必須 fail closed：

- baseline 或 Phase 9 counts 無法對帳；
- 備份不可用或無法確認還原方式；
- 原始與 redacted 資產無法可靠區分；
- 個資是否可公開沒有證據；
- review target 與 source provenance 不一致；
- redirect target 不是同站公開 canonical URL；
- 產生 redirect loop、chain、conflict 或 final 404；
- 任何 anon/non-admin 可讀 draft、可執行 editorial mutation 或可下載 private draft asset；
- RLS、same-origin、stable error、private bucket、audit append-only 任一退化；
- production hostname、DNS/TLS 或 hosting redirect ownership 未確認。

---

## 7. Preflight 與 Phase 9 reconciliation

### 7.1 儲存庫盤點

先列出並閱讀：

- `AGENTS.md` 與子目錄規則；
- `package.json` scripts、lockfile、Node/pnpm 約束；
- server API、middleware、`requireAdmin()`、same-origin helper、stable error helper；
- activities/files/year summaries 的 schema、types、composables、admin/public pages；
- private asset proxy 與 Storage policy；
- Phase 7 audit、Phase 8 CRUD、Phase 9 provenance/review/redirect manifests；
- migrations、verification SQL、smoke、Browser scripts、deployment docs；
- 現有 hosting adapter、CI workflow、headers、route rules、robots/sitemap 與 environment 文件。

先輸出一份簡短 inspection summary，說明將沿用哪些元件、需要新增哪些最小元件，以及任何與本規格不同的實際儲存庫情況。

### 7.2 資料庫與 Storage 對帳

建立 Phase 10 開始前的 machine-readable snapshot，至少包含：

- 各 content module 的 total / draft / published counts；
- 明確辨識 70 筆 Phase 9 imported targets，不得只用 `status='draft'` 全選；
- 122 筆 review 的 source ref、target type/id、severity、issue、recommended action 與 blocking state；
- 83 條 redirect 的 source、target、status、reason；
- 五個既有 bucket 的 object count、bytes、reference count、orphan、missing；
- provenance target integrity 與 terminal migration run state；
- active admin、policy、function grant 與 audit append-only 狀態。

輸出需可重複執行、排序穩定、不含個資全文、signed URL 或 secret。

### 7.3 備份 checkpoint

在第一次真實 mutation 前：

- 建立可回復的 database backup 或確認 hosting/Supabase 現有 backup restore point。
- 另外保存 private Storage inventory（bucket、path、size、hash、reference；不得保存 signed URL）。
- 保存 70 targets、122 reviews 與 83 redirects 的 pre-change snapshot。
- 記錄 backup timestamp、環境、baseline commit/tag、restore owner role 與還原步驟。

不得假設 database backup 已包含可重建的 Storage object bytes。若目前方案無法提供完整備份，至少完成官方支援的 database export、Storage inventory，以及小範圍 restore rehearsal；若仍無法證明回復能力，Phase 10 保持 BLOCKED，不建立 completion tag。

---

## 8. Editorial review queue

### 8.1 單一真相來源

優先延伸既有 Phase 9 review/provenance model。只有既有資料結構無法保存以下狀態時，才建立新的 additive migration。不得以只有本機的 Markdown/CSV 當成 production review state。

每筆 review 最低需具備：

- stable review id；
- Phase 9 source reference 與 target type/id；
- issue category、severity、publication blocker；
- current state：`pending`、`in_review`、`resolved` 或 `deferred`；
- content decision：`publish`、`keep_draft` 或 `archive`；
- redirect decision：`activate`、`remain_inactive` 或 `archive`；
- redaction state：`not_required`、`required`、`completed` 或 `blocked`；
- decision reason；
- reviewed by、reviewed at；
- target version / `updated_at` guard，防止審核後內容又被修改仍沿用舊核准；
- audit correlation id / request id。

不得把姓名、電話、地址、身分證字號、email、完整文件擷取文字或其他敏感內容複製進 audit/log。review reason 應使用必要且最少的描述。

### 8.2 狀態規則

- `pending` / `in_review` / `deferred` 不得發布。
- 只有 content decision=`publish`、所有 publication blocker resolved、redaction 非 `required`/`blocked`、target version 未改變時才可發布。
- target 在核准後被修改，核准自動失效並回到需要複查狀態。
- `keep_draft` 是合法終局決策，但必須有 reason。
- `archive` 必須保留 provenance，不得物理刪除 source evidence。
- redirect 只有 target 實際公開 200 且 canonical 合法時可 `activate`。

### 8.3 RLS、RPC 與 audit

若新增 table/RPC：

- anon、non-admin 不得 SELECT/INSERT/UPDATE/DELETE。
- active admin 只能透過受控 server API 或 narrow RPC 執行必要操作。
- 不得提供任意 target type/id 的泛用 SQL mutation。
- 發布、撤回、redaction asset replacement、review decision、redirect activation 均寫 append-only audit。
- audit 至少記錄 actor id、action、target、before/after 安全摘要、timestamp、request/correlation id；不得記錄 secret 或敏感全文。
- 新增 verification SQL，檢查 RLS、grants、fixed `search_path`、target integrity、invalid state combinations 與 audit immutability。

---

## 9. Admin editorial UI 與 API

建立或擴充管理介面，使唯一管理員可完成 122 筆 review，而不需直接進入 Supabase Dashboard 改資料。

### 9.1 Queue 頁

至少提供：

- progress：total、pending、in review、resolved、deferred、high severity；
- filter：module、severity、issue category、redaction state、content decision、redirect decision；
- stable sort 與 pagination；
- source/target identity、目前 draft 狀態與 blocker 摘要；
- 不以顏色作唯一狀態提示；keyboard 與 screen reader 可操作。

### 9.2 Review detail

至少顯示：

- migration provenance 與 authoritative source link；
- current target preview；
- 欄位級差異與缺漏；
- assets/attachments 清單、hash、MIME、size、redaction state；
- 對應 redirect 及是否具備 activation 資格；
- review checklist、decision reason、audit history。

Source evidence 與 extracted text 必須用 plain text 呈現，並遵守最少顯示；不得把原始個資加入 client log、telemetry 或錯誤回應。

### 9.3 Mutation UX

- 儲存 review、替換 redacted derivative、發布、撤回、啟用 redirect 都需明確 server validation。
- 發布與 redirect activation 前顯示確認摘要：目標、資產、blocker、公開網址、影響的舊網址。
- 可對「已逐筆核准」的選取項目執行 batch release，但不得用一個全選動作略過逐筆審核。
- batch API 必須有上限、idempotency、逐項結果與 partial-failure reconciliation；不可回傳模糊的整批成功。
- stale version、duplicate request、權限失效、invalid transition 都使用穩定 error code。

---

## 10. 內容校對與個資遮蔽標準

### 10.1 禁止補猜

缺少日期、年度、類別、參與人數、地點、活動成果或其他事實時：

- 回到 Wix snapshot、已驗證 PDF/DOCX 或組織提供的 authoritative evidence 查核。
- 無證據就保留 `null`、清楚標示資料未提供，或維持 draft。
- 不得從檔名、相鄰活動、照片內容或常識推測。

### 10.2 必查敏感資料

逐一檢查 title、summary、body、alt text、filename、image、PDF、DOCX 與 metadata，至少涵蓋：

- 姓名與可識別學生資料；
- 電話、email、住址、身分證／學號／生日；
- 簽名、名冊、簽到表、評量、醫療或家庭資訊；
- 未成年人臉部、名牌、制服識別、車牌與精確位置；
- 文件 comments、track changes、hidden text、author/company properties；
- 圖片 EXIF/GPS；
- QR code、barcode 或可還原個資的連結。

自動偵測只能提供 flag，不得自動判定可公開。無法確認同意或合法公開依據時，採遮蔽或不發布。

### 10.3 Redacted derivative

- 不直接覆寫 Phase 9 原始 private object。
- 建立新的 redacted derivative，保存來源 hash、derivative hash、處理者、時間、方法與 target reference。
- 原始物仍限 active admin 存取，不得由 public proxy 回傳。
- derivative 必須重新驗證 magic bytes、MIME、size、檔名、惡意內容與可讀性。
- 圖片移除不必要 EXIF/GPS，遮蔽後以實際像素輸出，不能只覆蓋可移除的圖層。
- PDF 遮蔽後重新擷取文字，確認被遮內容無法搜尋、複製或從 annotation/layer 還原。
- DOCX 若含個資，優先產生經核准的 flattened/redacted PDF 公開版本；若必須公開 DOCX，還要清除 comments、revisions、hidden text、custom XML 與 document properties，解壓檢查 package 內容並再次全文搜尋。
- 不將原始或 redacted 文件全文提交到 Git。

### 10.4 公開內容品質

每筆準備發布的內容需確認：

- slug 唯一且穩定；
- status 與 `published_at` 一致；
- title、summary、body 與 source evidence 相符；
- 日期、年度、分類與關聯正確；
- 圖片尺寸合理、alt 有意義且不含不必要個資；
- attachment 使用安全 filename、正確 MIME 與 download headers；
- internal links、external links、video links 可用且安全；
- canonical、title/description、Open Graph 等 metadata 不洩漏 draft；
- SSR 首次載入與 client navigation 顯示一致。

---

## 11. 分批發布流程

### 11.1 Dry-run

新增可重複執行的 Phase 10 release dry-run。輸入必須是明確 review ids/target ids，不得使用「所有 draft」。輸出至少包含：

- eligible / blocked / stale / already-published；
- 預計 status/`published_at` 變更；
- 預計公開的 asset/attachment；
- 可連動啟用的 redirect；
- before/after counts；
- 0 mutation 證明。

### 11.2 Release batches

使用下列波次，實際筆數以風險而非湊數決定：

1. Pilot：3–5 筆低風險、無敏感附件且代表不同 module 的內容。
2. Low-risk wave：已核准、無 redaction 或只有可明確驗證 metadata cleanup 的內容。
3. Redacted-assets wave：含已完成且驗證過 derivative 的內容。
4. Deferred：缺資料、缺授權、redaction 未完成或有任何不確定者，維持 draft。

每個 batch 必須：

- 使用穩定 manifest，記錄 batch id、review ids、target ids、expected versions 與 redirect ids；
- 先 dry-run，再 apply，再 verify；
- idempotent：相同 batch 重跑不得重複上傳、重複 audit 或改變 publish timestamp；
- 支援 checkpoint/resume；
- 發生部分失敗時停止後續 batch，精確列出成功、失敗與未執行項目；
- 驗證 public 200、draft 404、asset authorization、SSR metadata、mobile、console/hydration；
- 完成 counts、Storage reference 與 orphan reconciliation 後才能進下一波。

### 11.3 Rollback

建立經測試的 batch rollback：

- 可撤回本 batch 發布內容並停用本 batch redirects；
- 不刪除 provenance、review decision 或 audit；
- 不影響 Phase 5–9 既有資料與其他 batch；
- redacted derivative 若不再被引用，依既有安全 cleanup 規則處理，且先證明不是共享資產；
- rollback 後 public route/asset 回到 404、admin 仍可見、Storage 0 orphan/0 missing。

正式 production rollback 是重大操作，需依 runbook 與 operator 確認執行；smoke fixture rollback 可自動化。

---

## 12. Redirect activation

### 12.1 實作來源

以 Phase 9 的 83-row redirect manifest 為唯一來源，產生 deployment-specific、可版本控制的 redirect configuration。若 hosting 平台有原生 redirect 規則，優先使用平台支援的 server/CDN 301；否則使用 Nitro server redirect。不可同時維護兩份人工清單。

設定 generator 必須 deterministic，輸入排序穩定，拒絕：

- duplicate source；
- source/target conflict；
- loop 或 chain；
- external target；
- admin/API/private asset target；
- draft/unpublished/404 target；
- 未核准 410；
- catch-all homepage fallback。

### 12.2 29 + 52 + 2 的處理

- 29 structural candidates：確認 deployment 中是否真的回 301；若尚未部署，納入 Phase 10 config 並逐條驗證。
- 52 draft-target mappings：只有對應 target 已在本階段核准並公開 200 時，才從 inactive 轉為 301。仍為 draft 的 target 必須維持 inactive。
- 2 archived utility routes：保持 archive；沒有人工核准不得改為 301 或 410。

因此 Phase 10 不以「52/52 全部啟用」作假性成功標準；以「52/52 全部有正確決策，所有 eligible redirects 均已啟用且驗證，所有 ineligible redirects 仍安全 inactive」為準。

### 12.3 HTTP 驗收

在 staging 與 production hostname 逐條驗證：

- source response 為預期 301；
- `Location` 為同站 canonical HTTPS URL/path；
- 一次跳轉後 final 200；
- 0 chain、0 loop、0 conflict、0 final 404；
- query string 是否保留依既有 manifest 規則一致處理並測試；URL fragment 不得被 server-side 測試誤判；
- Unicode、percent encoding、trailing slash、大小寫與重複斜線依 canonical policy 一致；
- draft target 沒有公開 redirect、內容或 asset 洩漏。

必須區分「應用程式新 hostname 的 legacy path」與「Wix 原 hostname」。若 `a0903080125.wixsite.com` 不受目前 hosting/DNS 控制，就不能宣稱該 hostname 已啟用 redirect；在報告中記錄可控制範圍及所需 Wix/DNS operator action。

---

## 13. 正式環境與 CI/CD 基礎

### 13.1 環境分離

至少文件化 local、staging、production：

- hostname、deployment target、Supabase project、migration state；
- runtime 需要的 public Supabase URL 與 anon key；
- secret owner 與 rotation procedure，但不得記錄 secret value；
- production 不得指向 staging database，staging 不得操作 production content；
- `.env`、測試帳密、DB URL、access token 不得 commit。

若目前只有一個 Supabase project，不可假裝具備完整 staging isolation；需明確記為風險，使用 fixture namespace、dry-run 與嚴格 cleanup，並提出建立獨立 staging project 的 operator checkpoint。

### 13.2 CI quality gate

依 repo 實際 scripts 建立或擴充 CI，至少執行：

- frozen dependency install；
- TypeScript/Nuxt typecheck；
- lint（若 repo 已有；不得為 Phase 10 任意導入造成大範圍格式改動）；
- production build；
- 不需真實 secret 的 unit/integration tests；
- migration/manifest static verification；
- secret scan 與 committed generated/cache artifact check。

需要真實 Supabase/admin 身分的 smoke 與 Browser acceptance 可設為受保護的 release gate，不得在 fork PR 暴露 secrets。CI failure 不得部署 production。

### 13.3 Deployment promotion

- commit/build artifact 與部署版本可追溯；staging 驗收的 artifact 應與 production promotion 相同，避免 production 重新產生未驗證內容。
- database migrations additive、排序明確、可驗證；不得把 SQL Editor history 當 migration registry。
- 部署順序需避免 code/schema 不相容，並在 runbook 記錄 rollback boundary。
- production deploy 後記錄 commit、tag、deployment id、migration version、content batch ids 與 redirect manifest hash。

---

## 14. Observability、logging 與 health

### 14.1 Structured logging

為必要 server request 建立結構化且 redacted 的 log，至少可關聯：

- timestamp、environment、request id、route template、method、status、duration；
- auth state 僅記 anon/non-admin/admin 類別，不記 token/cookie；
- content/asset 操作記 safe target id、action、result、stable error code；
- redirect 記 source path hash 或已核准的 path，不記 query 中可能的個資。

禁止記錄 password、cookie、JWT、Authorization header、Supabase raw error、signed URL、文件全文、個資、完整 request body。

### 14.2 Health checks

建立適合 hosting 的 health/readiness 檢查：

- liveness 不查詢敏感資料；
- readiness 可用最小權限確認 server runtime 與必要依賴，但不得回傳 project ref、schema、secret、stack 或 database detail；
- 失敗回 stable status/error code；
- health route 不接受 mutation、不寫 cookie、不使用 shared user client。

### 14.3 最低告警

若平台提供原生監控，至少為下列事件建立文件化門檻與 owner role：

- 持續 5xx / health failure；
- auth/admin route 異常錯誤率；
- private asset proxy 403/404/5xx 異常增加；
- redirect final 404 或 loop；
- release batch partial failure；
- Storage orphan/missing；
- backup/restore checkpoint 失敗。

若無可用的告警服務，建立可重複執行的 synthetic check 與人工值班步驟，不得虛構已啟用監控。

---

## 15. Security headers、TLS 與 cache policy

先在 staging 盤點所有第一方與必要第三方來源，再逐步配置：

- `Content-Security-Policy-Report-Only` 觀察後才切換 enforcement；避免直接加入寬鬆 `unsafe-eval`。如 Nuxt runtime 需要 inline script，使用現有框架相容的 nonce/hash 方案或保留 report-only 並記錄 blocker。
- CSP 至少考慮 `default-src`、`script-src`、`style-src`、`img-src`、`font-src`、`connect-src`、`media-src`、`frame-src`、`object-src 'none'`、`base-uri 'self'`、`form-action 'self'`、`frame-ancestors 'none'`。
- `X-Content-Type-Options: nosniff`。
- 合理的 `Referrer-Policy` 與最小 `Permissions-Policy`。
- 可保留相容性的 `X-Frame-Options: DENY`，但以 CSP `frame-ancestors` 為主要控制。
- 不啟用過時或可能降低安全性的 `X-XSS-Protection`；若平台預設存在，依 OWASP 建議明確評估。
- HTTPS 正常且所有 subdomain 都符合條件後才啟用 HSTS；不得在 localhost/staging 或未確認 subdomain 時使用 `includeSubDomains`/preload。
- 移除不必要的 server technology disclosure。

Cache 規則：

- `/admin/**`、auth/session/logout/login、所有 mutation API、private asset proxy、會回 `Set-Cookie` 或 user-specific data 的 SSR/API：`private, no-store`，CDN TTL 0 或等價 bypass。
- 公開已發布內容可在驗證 invalidation 策略後使用短期 cache/SWR/ISR；不得讓 publish/unpublish、redaction replacement 後仍長時間提供舊內容。
- draft 404 與權限錯誤不得被共享快取成跨使用者結果。
- 實際以兩個不同 session/身分驗證 CDN 不會交換 cookie 或個人化回應。

---

## 16. SEO、索引與公開面驗收

正式發布內容需更新或驗證：

- canonical URL；
- sitemap 僅含 public published routes，不含 admin、API、draft、preview、asset proxy token 或 legacy source；
- robots 規則不把 admin/API 當成存取控制，真正保護仍靠 auth/RLS；
- draft/unpublished 頁面維持 404，不靠 `noindex` 假裝安全；
- 301 source 不重複出現在 sitemap；
- title、description、Open Graph、structured metadata 不含個資或 draft evidence；
- 404、500 頁不洩漏 stack、path、database 或 runtime detail。

第三方 analytics 不屬於強制 DoD。若沒有明確隱私、cookie、資料保留與 owner 決策，只完成介面與文件，不得自行導入追蹤器。

---

## 17. 必要測試

### 17.1 Static 與 build

- frozen install PASS；
- typecheck PASS；
- production build PASS；
- lint/test（若存在）PASS；
- 無新增嚴重 warning；既有 warning 必須列出且證明非 Phase 10 regression。

### 17.2 Database verification

新增 `verify-phase10-...sql` 或沿用 repo 命名，至少驗證：

- review coverage 正好涵蓋預期 122 筆，無 duplicate/orphan target；
- 70 個 Phase 9 imported targets 都有明確 content decision；
- 52 個 deferred redirect 都有明確 redirect decision；
- publish eligibility state combinations 合法；
- published status/`published_at` 一致；
- RLS、grants、RPC execute、fixed `search_path` 正確；
- anon/non-admin 無 editorial read/write；
- audit append-only；
- provenance target integrity 與 Phase 9 terminal run state仍通過；
- 378 個 Phase 9 object 的來源與 derivative reference 可對帳；
- 0 orphan、0 missing。

若 redaction derivative 使 object/reference counts 改變，報告必須分開列出 original、derivative、active public reference 與 bytes，不能仍硬寫 Phase 9 的 378 當作 Phase 10 final count。

### 17.3 三身分 smoke

至少驗證 anon、non-admin、active-admin：

- admin review routes/API access；
- queue/detail read；
- review mutation；
- stale version；
- publish/unpublish；
- batch dry-run/apply/second-apply/partial failure/rollback；
- draft/public asset proxy；
- redirect eligibility/activation；
- stable errors、same-origin、session refresh/logout。

Anon 與 non-admin 不得因知道 UUID、slug、Storage path 或 API route 而繞過權限。

### 17.4 Phase 5–9 regression

執行 repo 內所有適用的 Phase 5–9 verification/smoke：

- Phase 5 auth/RLS；
- Phase 6 Activity CRUD/private assets；
- Phase 7 access governance/invitation/audit；
- Phase 8 Posts/Files/FAQ/Years/Settings；
- Phase 9 migration lifecycle/provenance/rollback/reconciliation。

不得為了讓舊測試通過而降低 Phase 10 security assertion。

### 17.5 Browser、mobile、a11y、console

Production preview 與正式 staging 至少涵蓋：

- 首頁、About、Activities list/detail、Files、Year Summaries、404；
- admin login、editorial queue/detail、內容 preview、publish confirmation；
- 代表性的 published、redacted、仍為 draft 內容；
- 代表性的 301、inactive draft-target、archive route；
- desktop 與至少 390×844 mobile；
- keyboard 操作、focus、label、heading、alt、contrast、horizontal overflow；
- 0 console error、0 hydration mismatch/warning、0 Vue runtime warning；
- SSR HTML 與 client navigation 一致；
- draft/admin/private 資料不出現在 page source、payload、metadata、prefetch 或 browser cache。

### 17.6 Privacy leak test

為 redacted fixtures 建立不含真實個資的測試 token，驗證：

- public HTML/JSON/header/filename 不含 token；
- 圖片 metadata 不含 token/GPS；
- PDF extracted text、annotation、layer、metadata 不含 token；
- DOCX package（若公開）不含 token、comment、revision、hidden/custom XML 殘留；
- logs、audit safe summary 與 error response 不含 token。

不得把真實敏感字串加入自動測試或 Git。

---

## 18. Cleanup 與 final reconciliation

完成所有測試後：

- 刪除 Phase 10 smoke/synthetic rows、objects、review fixtures、redirect fixtures、invitation/session 測試資料；
- 還原測試前 site settings 與既有資料；
- 確認 primary admin 保持 active；
- 清除 local raw documents、render、download cache、extracted text、logs、screenshots 中的敏感資料；
- 停止測試 server/listener；
- 確認 repository 未追蹤 runtime/cache/output；
- 重跑 counts、RLS、provenance、Storage orphan/missing、redirect manifest 與 secret scan。

Final report 必須精確列出：

- 70 筆 imported drafts：published / keep draft / archive 各多少；
- 122 reviews：resolved / deferred、high severity remaining；
- 29 structural redirects 實際 active 數；
- 52 deferred redirects：active / remain inactive / archive；
- 2 utility archives 狀態；
- 各 module before/after published/draft counts；
- Storage original/derivative/object/reference/bytes/orphan/missing；
- deployed hostname 與不可控制的 Wix hostname 範圍；
- backup checkpoint 與 restore rehearsal 結果；
- monitoring/alerting 真實啟用項目與僅文件化項目；
- 所有 test/build/Browser/security/cache 結果。

---

## 19. Definition of Done

只有以下全部成立，Phase 10 才可標記完成：

- [ ] Baseline hash/tag/remote 與乾淨工作樹已驗證。
- [ ] Phase 9 counts、70 targets、122 reviews、83 redirects、Storage 與 provenance 已建立 pre-change snapshot 並對帳。
- [ ] Database 與 Storage 有可回復 checkpoint，且完成不破壞 production 的 restore rehearsal。
- [ ] Editorial queue 完整涵蓋 122 reviews，無 duplicate/orphan。
- [ ] 70 個 Phase 9 imported targets 全部有具理由的終局或 deferred 決策；既有第 47 筆 Activity draft 未被誤納入。
- [ ] 所有 published item 都有 resolved review、有效 target version 與通過的 privacy/content checklist。
- [ ] 個資資產採不可還原的 redacted derivative；原始 private object 不會公開。
- [ ] 52 個 draft-target redirects 全部有明確決策；只有 public 200 target 被啟用。
- [ ] 29 structural candidates 與所有 eligible 52 mappings 已在實際部署 hostname 驗證 301 → 一跳 → 200。
- [ ] 2 utility routes 保持 archive，0 未核准 410、0 chain、0 loop、0 conflict、0 final 404。
- [ ] Release dry-run/apply/verify/second-apply/checkpoint-resume/fixture rollback 全部通過。
- [ ] RLS、same-origin、stable errors、fixed `search_path`、private Storage、audit append-only、strict mock mode 全部通過。
- [ ] Auth/admin/private asset response 不被 public/shared cache；跨 session/CDN 測試通過。
- [ ] Security headers 已在 staging 驗證；CSP enforcement 若未安全完成，必須保持 report-only 並列為明確 blocker，不得假裝完成。
- [ ] Health、redacted structured logging、最低監控/合成檢查、incident/release/rollback runbook 可用。
- [ ] Sitemap/canonical/robots/metadata 不含 draft、admin、private 或個資。
- [ ] Frozen install、typecheck、build、CI、Phase 5–10 smoke/verification 全部 PASS。
- [ ] Browser desktop/mobile/a11y PASS，0 console error、0 hydration/Vue warning。
- [ ] Cleanup 完成，0 test fixture、0 orphan、0 missing、0 secret、0 sensitive raw artifact committed。
- [ ] Phase 10 completion report 已完成，所有數字來自 final reconciliation。
- [ ] 最終工作樹只含 Phase 10 scope，review diff 無意外大型或破壞性改動。

若 production hosting、DNS/TLS、Wix hostname ownership、真實 backup/restore 或正式監控缺少必要權限，應回報 `BLOCKED` 或 `PARTIALLY READY`，不得建立 completion tag。

---

## 20. Git、tag 與 release

### 20.1 Completion commit

DoD 全部通過且 cleanup 完成後，建立單一 Phase 10 completion commit。建議訊息：

```text
feat: complete Phase 10 editorial release and operations
```

不得提交：

- `.env`、token、password、database URL、signed URL、cookie、測試帳密；
- 真實個資、raw extracted text、未遮蔽文件副本；
- crawl/download/render cache、runtime log、測試 screenshot 中的敏感資料；
- 與 Phase 10 無關的使用者變更。

### 20.2 Completion tag

建議 tag：

```text
phase-10-editorial-release-operations-complete
```

只在 Phase 10 completion commit 建立 annotated 或沿用 repository 慣例的 durable tag。不得移動或重用既有 tag。

### 20.3 Push 與 hash 驗證

依既有 release 慣例推送 `main` 與 tag，然後驗證：

```bash
git push origin main
git push origin phase-10-editorial-release-operations-complete
git fetch origin main --tags
git rev-parse HEAD
git rev-parse origin/main
git rev-list -n 1 phase-10-editorial-release-operations-complete
git ls-remote --tags origin refs/tags/phase-10-editorial-release-operations-complete
git status --short --branch
```

最終交接必須回報完整 40-character commit hash，並證明 local HEAD、origin/main、local tag target、remote tag target 全部一致，工作樹乾淨。

---

## 21. 必交付檔案／成果

實際檔名依 repo 慣例調整，但功能不可缺少：

- additive Phase 10 migration(s)；
- Phase 10 verification SQL；
- editorial review server API、types、composable 與 admin UI；
- redaction derivative metadata/validation workflow；
- deterministic batch release manifest/runner 與 dry-run/apply/verify/rollback；
- deterministic redirect config generator 與 HTTP verifier；
- Phase 10 anon/non-admin/admin smoke；
- privacy leak fixtures/tests；
- CI/release quality gate；
- health、redacted logging、cache/security-header configuration；
- backup/restore、deployment、incident、rollback runbook；
- machine-readable before/after reconciliation；
- Phase 10 completion report。

不得用 TODO、空殼 UI、只輸出 SQL 但未驗證、只在 local dev 成功、只更新 README 或只產生報告取代真實交付。

---

## 22. 官方技術參考

實作時以專案鎖定版本及官方文件為準，不因文件已有較新 major version 就升級本專案：

- Nuxt 3 Route Rules、server redirects、headers 與 cache：[Nuxt 3 Rendering Modes](https://nuxt.com/docs/3.x/guide/concepts/rendering)
- Supabase SSR cookie/session 與 cache 注意事項：[Supabase SSR Advanced Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- Supabase RLS：[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Supabase database backup/PITR：[Database Backups](https://supabase.com/docs/guides/platform/backups)
- OWASP HTTP security headers：[HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- OWASP CSP：[Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

---

## 23. 最終回覆格式

完成或阻塞時，Codex 最終回覆至少包含：

1. 狀態：`COMPLETE`、`PARTIALLY READY` 或 `BLOCKED`。
2. Baseline 與 final commit/tag/hash。
3. 實作範圍與主要修改檔案。
4. 70 targets、122 reviews、29/52/2 redirects 的 final reconciliation。
5. Published/keep-draft/archive 與 redaction derivative 統計。
6. Database/RLS/Storage/provenance/audit 驗證。
7. Batch dry-run/apply/idempotency/resume/rollback 結果。
8. Redirect staging/production HTTP 驗證與 Wix hostname 控制範圍。
9. Backup/restore、CI/deployment、health/monitoring、security headers/cache 結果。
10. Phase 5–10 regression、Browser/mobile/a11y/console/hydration 結果。
11. Cleanup、orphan/missing、secret/privacy scan。
12. 尚需 operator 執行的真實外部步驟與風險。
13. Git push 與 local/remote hash 一致性。

不得用「應該通過」「看起來正常」「大致完成」代替實際命令、HTTP、SQL、Browser 與 reconciliation 證據。
