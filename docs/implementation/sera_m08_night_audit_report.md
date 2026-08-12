# Sera M08 `NIGHT AUDIT` — 完成報告

**完了日:** 2026-08-12

**ブランチ:** `codex/sera-m08-night-audit`
**worktree:** `C:\Users\user01\Documents\AI\sortie-m08`

## プレイ方法

worktreeルートでHTTPサーバーを起動する。

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

次のURLを開く。

```text
http://127.0.0.1:8000/index.html?seraDev=1&payloads=payloads/map_ormBasin.payload.js,payloads/mission_sera_m08.payload.js
```

`seraDev=1`は、通常起動ではロック中のSeraキャンペーンカードと、現在読み込まれているSeraミッションをこの開発ロードだけ開く。新規プロフィールでもM08を直接選択できる。通常起動時のロック、USA/RUSキャンペーン、保存データは変更しない。

## 完成内容

- 月夜のオルム盆地、山岳リング、夜間飛行場、滑走路灯、格納庫、SAM陣地
- 軍用燃料区、油田フレア、決済中継所、民間集落
- RAVEN、ROOK 2 LARK、F-111F `SABER`二機、外周待機の電子戦機`SHROUD`
- MiG-29A防空隊四機（うち`VESPER`一機）、Su-24M退避隊四機
- 赤い軍事TGT九基、白い決済系四基、白・ランク中立の航空機八機
- 二つの攻略ルート、時間切れ失敗、Retry初期化、分岐結果保存

### FUEL DENIAL

赤TGT九基を破壊して通常クリアする。決済中継所、集落灯、白い航空接触は残り、結果へ`m08Choice=fuel`と`m08CivilianBlackout=false`を保存する。

### RELAY BLACKOUT

白い`SHEM PAYMENT RELAY`を破壊する。赤TGT九基が残っていても敵航空機は武装停止・撤退し、集落灯が消えて任務完了となる。結果へ`m08Choice=relay`と`m08CivilianBlackout=true`を保存する。

## 検証結果

以下をすべてPASSした。

```text
node --experimental-vm-modules tools/check_campaign_shell.mjs
node tools/check_map_orm_basin.mjs
node tools/check_sera_m08_payload.mjs
node tools/check_sera_m08_runtime_host.mjs
node tools/check_sera_m08_e2e.mjs
```

E2Eで確認した範囲:

- live registry比較で既存entry/field消失0、`ormBasinNight` / `sera-m08` / `vesper`追加
- Seraカード → M08一覧 → briefing → hangar → launch
- 開幕盤面が赤9・白6、LARK一機、SABER二機
- 遅延隊を含むMiG-29A四機・Su-24M四機の全機出現
- relay routeで赤9残存、集落消灯、航空機八機撤退、S評価と選択保存
- fuel routeで白12残存、集落点灯、中継所残存、選択保存
- 20分相当の時間切れでFAILED
- 結果画面のRetryで赤9・白6、未選択、集落点灯へ復元
- pageerror 0、console error 0

既存Sera M01〜M05のpayload/isolation/host系検査も、Windowsで実行可能なものはPASSした。`tools/registry_gate.mjs`の保存済みbaselineは、このブランチの親commitの時点ですでにM01/M02の14 fieldを古い値で保持しており、通常起動だけでもFAILする。そのbaselineは更新せず、M08 E2E内で「同一checkoutの通常起動」と「M08 payload起動」を直接比較し、M08による消失0を確認した。

## 統合境界

M06/M07が未実装なので、M08 payloadは通常起動へinlineしていない。M08単体は上記URLで最初から最後までプレイできる。M06/M07追加後は`campaignOrder=8`を維持したまま正規の解禁鎖へ入れ、通常起動時のSera移行ロック解除と同時にinlineする。
