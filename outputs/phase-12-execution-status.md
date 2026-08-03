# Phase 12 Execution Status

更新時間：2026-08-03（Asia/Taipei）

## 最終狀態

| 範圍 | 狀態 | 判定 |
| --- | --- | --- |
| implementation complete | `COMPLETE` | Phase 12 E2E、staging isolation、cleanup、promotion 與 production read-only verifier 已合併 |
| pre-merge staging complete | `COMPLETE` | 最終 verifier SHA `51e0bda69ba68f96350c5e67d70abbf30427c291` 為 90/90，無 skipped、unexpected 或 flaky |
| merged/released complete | `COMPLETE` | application release SHA `f99e335b20b311d1c101a7ad60fe125ee045bdf0` 已完成 protected-main staging、production deploy 與兩種唯讀 smoke |
| blocker | `NONE` | 所有必須 gate 與 production evidence 已通過 |
| production mutations | `0` | 沒有 production migration、reset、repair、seed、Auth／Storage 或內容 mutation |

- Repository：`C:\Users\Admin\Documents\BuildWeb\marchoutWebsite`
- Application release SHA：`f99e335b20b311d1c101a7ad60fe125ee045bdf0`
- Approval issue：[#16](https://github.com/Jacob0710/marchoutWebsite/issues/16)
- Production release run：[30827448878](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30827448878)
- Production canonical URL：`https://marchout-website.vercel.app`
- Phase 12 completion report：`outputs/phase-12-completion-report.md`
- Phase 12 annotated completion tag：`phase-12-e2e-staging-release-complete`
- Completion tag target：包含本狀態與 completion report 的最終 `main` completion-evidence commit；remote annotated tag ref 是 authoritative target。
- Phase 11 的 commits 與 `phase-11-automated-testing-ci-complete` tag 未被移動、重寫或重建。

## 合併紀錄

| PR | Exact head SHA | Merge commit | 結果 |
| ---: | --- | --- | --- |
| [#12](https://github.com/Jacob0710/marchoutWebsite/pull/12) | `15461143e7b187e6faf15b6c81613d3c9d311801` | `84dffaa5d755e36513b9aca30e508b2c3702d3c4` | Phase 12 implementation 與 Check Runs／commit statuses verifier 修正已合併 |
| [#14](https://github.com/Jacob0710/marchoutWebsite/pull/14) | `473648420521cdcf0cca83a94ecebeb03ef73014` | `979f6bfd8354c9e9e3840b525464868d3abaef39` | final-main dependency-review push gate 修正已合併 |
| [#15](https://github.com/Jacob0710/marchoutWebsite/pull/15) | `51e0bda69ba68f96350c5e67d70abbf30427c291` | `f99e335b20b311d1c101a7ad60fe125ee045bdf0` | duplicate Check Run/status selection 改為成功集合判定後已合併 |

三個 PR 都先保持 Draft 到其 exact-head CI、精確 Vercel context 與完整 staging evidence 通過，之後才依 owner approval 轉為 Ready 並透過 branch protection 合併；沒有 admin bypass、required-check 降級或假成功。

## Exact-SHA CI 與 staging run

| SHA／用途 | Run ID | 結果 |
| --- | ---: | --- |
| PR #12 quality | [30770849342](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30770849342)、[30770849448](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30770849448) | SUCCESS |
| PR #12 full pre-merge staging | [30770954691](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30770954691) | SUCCESS；exact SHA `15461143…` |
| PR #14 quality | [30784372148](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30784372148)、[30784372382](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30784372382) | SUCCESS |
| PR #14 full pre-merge staging | [30808659527](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30808659527) | SUCCESS；exact SHA `47364842…` |
| PR #15 quality | [30819484311](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30819484311)、[30819486446](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30819486446) | SUCCESS |
| PR #15 full pre-merge staging | [30819700261](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30819700261) | SUCCESS；exact SHA `51e0bda6…` |
| final-main quality | [30820587108](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30820587108)、[30820587540](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30820587540) | SUCCESS；`quality`、`phase12-quality` 與真正執行的 `dependency-review` 成功 |
| final-main protected staging | [30820978966](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30820978966) | SUCCESS；exact SHA `f99e335b…` |
| production release | [30827448878](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30827448878) | SUCCESS；exact SHA `f99e335b…` |

`Vercel – marchout-website` 對 application release SHA 的 commit status 為 `success`。Release verifier 同時讀取 Check Runs API 與 commit statuses API，並以「同名 evidence 中至少一筆 exact successful result」判定，避免被 skipped duplicate 遮蔽成功結果。

## 最終 protected-main staging evidence

Run [30820978966](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30820978966) 的 machine-readable 與 job-log evidence：

| 驗收項目 | 結果 |
| --- | --- |
| Expected／passed | `90 / 90` |
| Skipped／unexpected／flaky／retries | `0 / 0 / 0 / 0` |
| Chromium／Firefox／WebKit／Mobile Chromium | `27 / 21 / 21 / 21` |
| Artifact recursive scan | PASS；3 files、721,265 bytes、secret findings `0` |
| Cleanup first pass | 2 fixtures、1 Storage object removed；database fixture、asset row、三個 bucket residual 均 `0` |
| Cleanup second pass | deleted `0`；所有 residual 再次為 `0` |
| Production mutations | `0` |

Artifacts：

- `phase12-staging-result-f99e335b20b311d1c101a7ad60fe125ee045bdf0`：ID `8859101503`，digest `sha256:2d43802f616dc1ff2588e0cbd08a6362729ce0601095a8c4616f415cf6e56e6b`
- `phase12-staging-browser-f99e335b20b311d1c101a7ad60fe125ee045bdf0`：ID `8859077706`，digest `sha256:5037e29cf368832fa07cb4874ec5846a0d51daa80c33882156701d1ab26a7a16`

最終 pre-merge run [30819700261](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30819700261) 同樣為 90/90、0 skipped、0 unexpected、0 flaky、兩次 cleanup residual 0、artifact scan success 與 production mutations 0；其 result/browser artifact digests 分別為 `sha256:a423ac29a5dd89b27babf9af4d9a67d2d8b1c0cc4dd60197ace94955b957abea`、`sha256:a3b116da1264f6bd45a66ff2dbcc41463932788ce302393362b79efaebf5e75a`。

## Production release evidence

Production run [30827448878](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30827448878) 的三個 jobs 均為 SUCCESS：

1. `verify-release`：再次驗證 current protected `main`、exact staging run、owner approval、staging result artifact、required checks 與精確 production Vercel status。
2. `deploy-production`：部署 approved commit 並 alias 至 `https://marchout-website.vercel.app`。
3. `production-smoke`：credential-free 與 authenticated read-only smoke 均成功；只登入、讀取與登出，未呼叫內容 mutation endpoint。

Production artifact：

- Name：`phase12-production-result-f99e335b20b311d1c101a7ad60fe125ee045bdf0`
- ID：`8861506006`
- Digest：`sha256:091c3f55e32f412e15a725f651a0bad31500c7e409454b2c463d5fdb94a2321e`
- JSON：`releaseSha` 精確吻合、`credentialFreeSmoke=passed`、`authenticatedReadOnlySmoke=passed`、`productionMutations=0`

另由本機對 production canonical alias 執行獨立 credential-free smoke，`/api/health`、`/api/health/ready`、`/`、`/about`、`/activities`、`/files`、`/years`、`/robots.txt`、`/sitemap.xml` 全部回應 HTTP 200；release marker 精確為 `f99e335b20b311d1c101a7ad60fe125ee045bdf0`，mutations `0`。

## Fail-closed 稽核紀錄

- Run [30820843197](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30820843197) 因缺少 exact protected-main staging approval marker，在 validate job 即失敗；沒有 deploy、seed、browser 或 cleanup mutation。
- Run [30821855960](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30821855960) 的 release verifier 成功，但 Production environment inputs 尚未完成，因此在第一個 Vercel command 前失敗；沒有 production deployment 或 data mutation。
- 補齊 owner marker／Production environment 後均建立全新 workflow run，沒有重寫失敗證據或把 skipped／failure 當作成功。

## Residual risk

- GitHub artifacts 受 repository retention policy 約束；不可變的 artifact ID 與 digest 已記錄於本報告。
- Vercel token、Supabase public key 與 read-only identity 仍需依帳號持有人的 rotation／revocation policy 維護；任何憑證失效時 release workflow 會 fail closed。
- Production 驗收刻意限於 synthetic 與 read-only 路徑，未以 production mutation 擴大測試覆蓋；這是安全邊界，不是未揭露的測試成功。
- 外部 GitHub、Vercel 或 Supabase 服務可用性屬持續營運風險，不影響本次 exact-SHA 完成證據。

目前 blocker：`NONE`。
