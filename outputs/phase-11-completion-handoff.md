# Phase 11 完成與發布交接指令

日期：2026-07-29（Asia/Taipei）

## 1. 任務目標

將目前已完成實作與驗證的 Phase 11，從：

`IMPLEMENTATION_COMPLETE / MERGE_AND_RELEASE_PENDING`

推進至：

`MERGED / RELEASED COMPLETE`

本任務是 Phase 11 的合併、發布、治理與證據收尾，不應擴張為新功能開發、介面改版、資料遷移或 production 資料寫入。

## 2. 目前已知狀態

- Repository：`Jacob0710/marchoutWebsite`
- Baseline branch：`main`
- Phase 11 branch：`codex/phase11-automated-testing-ci`
- Phase 11 head：`a8e4307fe47e9042472b9c3e2fdefc714fe738fe`
- Pull request：<https://github.com/Jacob0710/marchoutWebsite/pull/2>
- PR 狀態：Open、Draft、Clean、Mergeable
- PR review／review request：目前沒有
- Phase 11 completion tag：目前沒有
- Phase 11 specification：`codexSteps/phase11.md`
- Phase 11 execution status：`outputs/phase-11-execution-status.md`
- 完整審查報告：`outputs/phase-10-and-11-complete-report.md`

已驗證項目：

- 5 個測試檔、29/29 tests 通過。
- Curated coverage：
  - Statements：92.61%
  - Branches：89.72%
  - Functions：100%
  - Lines：96.66%
- ESLint、typecheck、production build 通過。
- Production dependency audit 沒有已知漏洞。
- Phase 10 regression 通過。
- Built SSR integration 11/11 endpoints 通過。
- PR CI、Dependency Review、Vercel Preview 通過。
- Protected environment-scoped read-only smoke 通過。
- 沒有 production mutation。

## 3. 執行原則

1. 先重新讀取 PR、branch、CI、Vercel 與本機 worktree 現況，不得只依賴本文件中的舊快照。
2. 不得弱化或略過既有 Phase 11 quality gates。
3. 不得在本任務執行 production database、Storage、editorial、redirect 或 release apply 寫入。
4. 保留使用者既有未提交內容，不得覆寫、刪除或擅自納入無關變更。
5. 所有 GitHub Actions checks、merge commit、production deployment 與 tag 必須可相互追溯。
6. 若需要 owner 批准、獨立 reviewer、GitHub 權限、Vercel 權限或重要治理選擇，應停止並請使用者處理或明確授權，不得假設。

## 4. 必要工作

### 4.1 檢查本機與遠端狀態

- 確認目前 branch、HEAD、remote tracking 與 worktree。
- 確認 `main` 是否在 Phase 11 baseline 之後出現新 commit。
- 若 `main` 已前進，先評估是否需要 rebase／merge baseline，並重跑完整驗證。
- 確認 PR #2 仍為 Open、Clean、Mergeable。
- 確認 PR head 與本機／remote Phase 11 branch 一致。
- 確認所有最新 required checks 成功，且沒有 pending、cancelled 或失敗項目。

### 4.2 處理 Phase 11 完整報告

`outputs/phase-10-and-11-complete-report.md` 目前可能是未追蹤檔案。

- 先檢查檔案內容與 Git 狀態。
- 若使用者希望將完整報告保存於 repository：
  - 修正明顯亂碼或過時狀態；
  - 納入 Phase 11 branch；
  - commit 並 push；
  - 等待新 head 的所有 CI checks 通過。
- 若使用者不希望納入 repository：
  - 不得擅自刪除；
  - 在最終報告中說明它仍是本機未追蹤文件。

### 4.3 完成 PR review

- 將 PR 從 Draft 轉為 Ready for review 前，再次確認變更範圍與最新 CI。
- 優先要求一位獨立 reviewer 審查並 approve。
- 若沒有獨立 reviewer，停止並請 owner 決定是否接受單人維護模式。
- 不得自行假造 review、approval 或 reviewer 身分。

Reviewer 至少應確認：

- Coverage 是 curated scope，不是 whole-application coverage。
- SSR integration 不會連線或寫入 Supabase。
- PR jobs 不會取得 production／administrator secrets。
- GitHub Actions 使用 immutable commit SHA。
- Production dependency audit 與 Dependency Review 通過。
- Phase 10 privacy、redirect 與 static regression 沒有退化。
- Product source refactor 沒有引入非 Phase 11 範圍的行為改變。

### 4.4 建議建立不可繞過的 main quality gate

目前應重新確認 `main` 是否已有 branch protection 或 repository ruleset。

建議設定：

- 禁止直接 push 到 `main`。
- 必須透過 pull request 合併。
- 必須通過 Phase 11 `quality` check。
- dependency 變更時必須通過 `dependency-review`。
- 必須通過 Vercel deployment check。
- 要求 branch 在合併前保持最新。
- 視專案協作模式決定是否至少需要一個 approval。

這些設定不是現有 Phase 11 書面 DoD 的硬性項目，但若要宣稱品質閘門不可繞過，應在完成發布前處理。

若 GitHub plan、repository 權限或單人維護模式無法支援上述規則：

- 不得假裝已設定；
- 記錄實際限制；
- 將其列為 accepted residual risk；
- 由 owner 明確接受後才能繼續。

### 4.5 合併 PR

只有在下列條件全部成立時才能合併：

- PR 不再是 Draft。
- 最新 head 的 CI 全部成功。
- 沒有未處理的 requested changes。
- PR 仍為 Clean、Mergeable。
- owner 已接受所有 residual risks。
- 若要求 reviewer，approval 已存在。

合併後必須記錄：

- PR number 與 URL。
- Merge 時間。
- Merge 方法。
- Merge commit SHA 或 squash commit SHA。
- 合併後 `main` SHA。

### 4.6 合併後 main 驗證

等待並確認合併後 `main` workflow 完成：

- Frozen pnpm install。
- Repository／secret verification。
- Manifest determinism。
- ESLint zero warnings。
- Production dependency audit。
- Unit／component coverage。
- Typecheck。
- Phase 10 regression。
- Production build。
- Built SSR integration。
- Coverage artifact。

若 `main` workflow 失敗：

- Phase 11 不得標示為 released complete。
- 調查失敗原因。
- 不得跳過或弱化 gate。
- 修正必須另開 branch／PR，不得直接修改 `main`。

### 4.7 Vercel production 驗收

- 確認 Vercel production deployment 狀態為 Ready。
- 確認 production deployment 對應到包含 Phase 11 的 `main` commit。
- 不得把 PR Preview deployment 當成 production deployment。
- 執行 credential-free production synthetic。
- 執行既有 authenticated read-only smoke 時，確認 mutation count 為零。
- 驗證至少包含：
  - `/api/health`
  - `/api/health/ready`
  - `/`
  - `/about`
  - `/activities`
  - `/files`
  - `/years`
  - `/robots.txt`
  - `/sitemap.xml`
- 記錄 deployment ID、URL、commit SHA、檢查結果與最慢回應時間。

### 4.8 建立 Phase 11 completion tag

僅能在下列條件全部通過後建立 tag：

- PR 已合併。
- `main` CI 成功。
- Vercel production Ready。
- Production read-only synthetic／smoke 成功。
- 沒有 production mutation。

建議 tag：

`phase-11-automated-testing-ci-complete`

Tag 必須指向已驗證的合併後 `main` commit，並推送至 `origin`。推送後重新查詢遠端 tag，確認名稱與 commit SHA 正確。

### 4.9 更新完成報告

更新 `outputs/phase-11-execution-status.md`，必要時同步更新完整報告，至少記錄：

- Phase 11 implementation：Complete。
- PR：Merged。
- Review／approval 狀態。
- Merge commit／main commit。
- Main CI run URL 與結果。
- Vercel production deployment ID、URL、commit 與結果。
- Production smoke／synthetic 結果。
- Completion tag 與其 commit。
- Branch protection／ruleset 實際狀態。
- Accepted residual risks。
- Production mutation：None。
- 最終狀態：`MERGED / RELEASED COMPLETE`。

報告更新後若產生新 commit：

- 必須確認該 commit 是否只修改文件；
- push 後等待必要 checks；
- completion tag 應指向最終被認定為 Phase 11 完成的 `main` commit，不得留下 tag 與最終報告 commit 分離且未說明的狀態。

## 5. Residual risk 必須明確記錄

不得因風險不是 blocker 就從報告中移除：

1. Coverage 僅涵蓋選定的 pure domain／security modules。
2. 沒有完整 browser E2E matrix。
3. Protected `staging` gate 目前可能實際測試 production origin。
4. GitHub `staging` environment 可能沒有 required reviewer。
5. `main` 可能沒有 branch protection／ruleset。
6. Nuxt schema peer metadata warning。
7. `lucide-vue-next` upstream deprecation。
8. Nitro trailing-slash export mapping deprecation warning。
9. GitHub Actions bundled runtime warning。
10. Repository verifier 將 `--others` 納入名為 tracked files 的檢查集合，可能使未追蹤檔案被當成 repository candidate。
11. `git diff --check` 只檢查 whitespace error，不等同完整 clean-worktree assertion。

## 6. Stop conditions

遇到以下情況必須停止並回報，不得自行繞過：

- PR 不可合併或出現 conflict。
- `main` 已前進且尚未完成重新驗證。
- 最新 CI 有失敗、pending 或被取消的 required check。
- 沒有權限調整 PR、branch protection、environment 或 Vercel deployment。
- 需要 reviewer，但沒有可用 reviewer。
- 合併後 production deployment 不對應正確 commit。
- Production smoke 發現資料寫入、敏感資訊洩漏或安全／cache regression。
- Dependency audit 出現 high 或 critical vulnerability。
- Phase 10 regression 失敗。
- Tag 目標與已驗證 commit 不一致。
- 發現使用者未提交內容可能被覆寫或誤納入。

## 7. Definition of Done

只有以下項目全部完成，Phase 11 才能標示為完整發布：

- [ ] 完整報告已依 owner 決定處理。
- [ ] PR #2 已離開 Draft。
- [ ] Review／owner acceptance 已記錄。
- [ ] 最新 PR CI 全部成功。
- [ ] PR #2 已合併至 `main`。
- [ ] 合併後 `main` CI 全部成功。
- [ ] Phase 11 workflow 已存在於 `main`。
- [ ] Vercel production deployment Ready 且對應正確 commit。
- [ ] Production synthetic／read-only smoke 通過。
- [ ] Production mutation 為零。
- [ ] Phase 11 completion tag 已建立並推送。
- [ ] 遠端 tag 指向已驗證的 `main` commit。
- [ ] Phase 11 completion report 已更新。
- [ ] 所有 residual risks 已記錄並由 owner 接受。
- [ ] 最終 repository／PR／CI／deployment／tag 證據可互相追溯。

## 8. 最終回報格式

Codex 完成後應使用繁體中文回報：

1. Executive verdict：`PASS`、`PASS WITH ACCEPTED RISKS` 或 `BLOCK`。
2. Implementation status。
3. PR review 與 merge status。
4. Main CI status 與 run URL。
5. Vercel production deployment status。
6. Production smoke／synthetic 結果。
7. Completion tag 與 commit SHA。
8. Branch protection／ruleset／environment reviewer 狀態。
9. Blockers。
10. Accepted residual risks。
11. 明確回答 Phase 11 是否已達到 `MERGED / RELEASED COMPLETE`。

