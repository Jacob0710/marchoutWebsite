# Phase 12 Completion Report

完成日期：2026-08-03（Asia/Taipei）

## Executive decision

Phase 12 為 **MERGED / RELEASED COMPLETE**。

- implementation complete：Phase 12 browser E2E、isolated staging、artifact scan、idempotent cleanup、approval gates 與 production read-only release workflow 已完成。
- pre-merge staging complete：最後 implementation SHA `51e0bda69ba68f96350c5e67d70abbf30427c291` 已取得 90/90 clean acceptance。
- merged/released complete：application release SHA `f99e335b20b311d1c101a7ad60fe125ee045bdf0` 已在 protected `main` 完成相同 staging acceptance、production deploy 與 production read-only smoke。
- blocker：無。
- production mutations：`0`。

本報告不以 workflow 的綠色勾勾單獨判定完成；以下結論同時來自 GitHub run metadata、exact SHA、下載後的 machine-readable artifacts、browser summary、recursive artifact scan、兩次 cleanup residual 與 production smoke JSON。

## Release identity and governance

| 項目 | Evidence |
| --- | --- |
| Repository | `Jacob0710/marchoutWebsite` |
| Application release SHA | `f99e335b20b311d1c101a7ad60fe125ee045bdf0` |
| Owner approval | [Issue #16](https://github.com/Jacob0710/marchoutWebsite/issues/16)，owner marker `PHASE12-APPROVED <exact SHA>`，labels `phase12-release-approved`、`phase12-staging-approved` |
| Production canonical URL | `https://marchout-website.vercel.app` |
| Completion tag | `phase-12-e2e-staging-release-complete` |
| Tag target rule | 包含本報告的 final `main` completion-evidence commit；remote annotated tag ref 為 authoritative SHA record |

PR [#12](https://github.com/Jacob0710/marchoutWebsite/pull/12)、[#14](https://github.com/Jacob0710/marchoutWebsite/pull/14)、[#15](https://github.com/Jacob0710/marchoutWebsite/pull/15) 均經 owner 對各自 exact SHA 明確核准後才由 Draft 轉為 Ready 並正常合併。Phase 11 的 commit／tag 沒有被 rebase、reset、force-push、重寫或移動。

## Implementation result

Phase 12 建立並驗證下列能力：

- deterministic Playwright desktop／mobile、Chromium／Firefox／WebKit matrix；
- local mock-mode 與 isolated staging journeys 的明確分界；
- staging web origin、Supabase project、Vercel project、identities 與三個 private Storage buckets 的 production isolation；
- namespaced staging seed、always-run cleanup 與第二次 idempotent cleanup；
- recursive artifact secret scan，包括壓縮 trace；
- Draft PR exact-head 與 protected-main exact-head approval gates；
- production release verifier 同時驗證 GitHub Check Runs 與 Vercel commit status context；
- duplicate 同名 check/status 使用 successful evidence set，而非取第一筆結果；
- production deploy 後 credential-free 與 authenticated read-only smoke；
- machine-readable staging／production promotion evidence。

沒有使用 skip Vercel check、降低 required checks、mock production success 或 production credential 替代 staging。

## Run ledger

| 階段 | Exact SHA | Run IDs | 結果 |
| --- | --- | --- | --- |
| PR #12 CI | `15461143e7b187e6faf15b6c81613d3c9d311801` | [30770849342](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30770849342)、[30770849448](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30770849448) | required CI／Vercel success |
| PR #12 pre-merge staging | same | [30770954691](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30770954691) | full staging success |
| PR #14 CI | `473648420521cdcf0cca83a94ecebeb03ef73014` | [30784372148](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30784372148)、[30784372382](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30784372382) | required CI／Vercel success |
| PR #14 pre-merge staging | same | [30808659527](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30808659527) | 90/90 success |
| PR #15 CI | `51e0bda69ba68f96350c5e67d70abbf30427c291` | [30819484311](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30819484311)、[30819486446](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30819486446) | required CI／Vercel success |
| PR #15 pre-merge staging | same | [30819700261](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30819700261) | 90/90 success |
| Final-main CI | `f99e335b20b311d1c101a7ad60fe125ee045bdf0` | [30820587108](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30820587108)、[30820587540](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30820587540) | quality、phase12-quality、dependency-review success |
| Protected-main staging | same | [30820978966](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30820978966) | 90/90 success；promotion evidence clean |
| Production release | same | [30827448878](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30827448878) | verify、deploy、兩種 smoke 全部 success |

兩個保留的 fail-closed run：

- [30820843197](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30820843197)：缺少 staging approval marker 時在 mutation 前停止。
- [30821855960](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30821855960)：Production environment 尚未完成時在第一個 Vercel command 前停止。

兩者 production mutations 均為 `0`，也沒有被 rerun／覆蓋成成功；修正外部前置條件後使用新的 run ID。

## Final pre-merge staging acceptance

最後 implementation exact SHA 使用 run [30819700261](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30819700261)：

| Metric | Value |
| --- | ---: |
| Expected | 90 |
| Passed | 90 |
| Skipped | 0 |
| Unexpected | 0 |
| Flaky | 0 |
| Retries／non-clean | 0 |
| Chromium desktop | 27 |
| Firefox desktop | 21 |
| WebKit desktop | 21 |
| Mobile Chromium | 21 |
| Production mutations | 0 |

- Browser artifact：ID `8858569203`，digest `sha256:a3b116da1264f6bd45a66ff2dbcc41463932788ce302393362b79efaebf5e75a`
- Result artifact：ID `8858595261`，digest `sha256:a423ac29a5dd89b27babf9af4d9a67d2d8b1c0cc4dd60197ace94955b957abea`
- Artifact scan：3 files、720,863 bytes、secret findings `0`。
- Cleanup first pass：2 fixtures 與 1 Storage object removed，database fixture、asset row 與 `activity-assets`／`content-assets`／`downloads` residual 全 `0`。
- Cleanup second pass：deleted `0`，所有 residual 再次為 `0`。

## Protected-main staging acceptance

Application release SHA 使用 run [30820978966](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30820978966)。結果仍為 expected 90／passed 90、skipped 0、unexpected 0、flaky 0、retries 0，project split 為 27／21／21／21。

- Browser job：`91711515658`；artifact scan 3 files、721,265 bytes、secret findings `0`。
- Cleanup job：`91712845121`；第一次刪除 2 fixtures／1 object，第二次刪除 0；database、asset row 與三個 Storage bucket residual 連續兩次全為 `0`。
- Result artifact：ID `8859101503`，digest `sha256:2d43802f616dc1ff2588e0cbd08a6362729ce0601095a8c4616f415cf6e56e6b`。
- Browser artifact：ID `8859077706`，digest `sha256:5037e29cf368832fa07cb4874ec5846a0d51daa80c33882156701d1ab26a7a16`。
- Promotion JSON：exact `releaseSha`、所有 workflow results success、`remainingFixtureCount=0`、`productionMutations=0`。

## Production release acceptance

Run [30827448878](https://github.com/Jacob0710/marchoutWebsite/actions/runs/30827448878) 的 `headSha` 為 `f99e335b20b311d1c101a7ad60fe125ee045bdf0`，結論為 SUCCESS：

| Job | Job ID | Result |
| --- | ---: | --- |
| verify-release | `91732623838` | SUCCESS |
| deploy-production | `91732713297` | SUCCESS |
| production-smoke | `91732971967` | SUCCESS |

Production deployment `https://marchout-website-32uyq9nyq-jacob0710s-projects.vercel.app` 已 alias 至 `https://marchout-website.vercel.app`。

下載並解析 production artifact 後取得：

```json
{
  "releaseSha": "f99e335b20b311d1c101a7ad60fe125ee045bdf0",
  "credentialFreeSmoke": "passed",
  "authenticatedReadOnlySmoke": "passed",
  "productionMutations": 0
}
```

- Artifact name：`phase12-production-result-f99e335b20b311d1c101a7ad60fe125ee045bdf0`
- Artifact ID：`8861506006`
- Artifact digest：`sha256:091c3f55e32f412e15a725f651a0bad31500c7e409454b2c463d5fdb94a2321e`
- Authenticated smoke 僅執行 login、`/api/admin/session`、`/api/admin/activities?limit=1`、`/admin/dashboard`、`/admin/activities` 與 logout；`contentMutations=0`、`productionMutations=0`。
- 獨立 local credential-free smoke 對 canonical alias 的 9 個 health/public/SEO endpoints 全為 HTTP 200，release marker 精確吻合，mutations `0`。

## Security and mutation boundary

本次沒有對 production 執行：

- database migration、reset、repair 或 seed；
- Supabase Auth user create/update/delete；
- Storage upload/update/delete；
- editorial 或其他內容 mutation；
- staging credential 注入 production jobs；
- service-role key 寫入 Git、browser bundle、Vercel runtime、log、Markdown 或 artifact。

Production environment secret 僅以 GitHub metadata 驗證名稱與更新時間，未讀取或輸出值。Artifact scan 與 repository secret scan 必須在 completion-evidence commit 前再次成功。

## Completion tag

Annotated tag：`phase-12-e2e-staging-release-complete`。

為避免 commit 自我引用，本文不硬編碼包含自身的 completion-evidence commit SHA；最終 remote annotated tag ref、其 tag object message 與 GitHub `main` 是 authoritative target record。Tag 只會在本報告合併、final-main required CI／Vercel deployment、production read-only validation、remote synchronization 與 clean tracked worktree 全部吻合後建立並推送。

## Residual risk

- GitHub artifacts 會依 retention policy 到期；本報告保留 artifact ID、名稱與 SHA-256 digest，外部長期封存仍由 repository owner policy 決定。
- GitHub／Vercel／Supabase 的服務可用性與 credentials rotation 是持續營運責任；verifier 在缺值或失效時會 fail closed。
- Production acceptance 刻意維持 read-only，沒有藉由 production mutation 測試寫入路徑。完整寫入旅程已在 isolated staging 的 90-case matrix 驗證。

Residual risk 已揭露且沒有 release blocker。
