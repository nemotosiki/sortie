# 夜間自律運転ログ 2026-08-02深夜〜08-03朝（モデルバッチ3 + §11継続）

正本: docs/spec_model_batch3_20260802.md。1サイクル1エントリ。朝はこのファイルだけ読めば全部わかる状態を保つ。

## 22:51-22:56 プリフライト（§5全項目クリア）

- 並走セッションのバッチは`b5a9e2a`（ヘリ5種+ケレン+オファン）でコミット済み → 作業ツリー実質クリーン、
  W4条件クリアの見込み、スナップショットjsonは正規手順`--update`で更新可（フラグ実在確認済み）
- 27キー重複grep → **全キーヒット0**（ロースター全機GO、スキップなし）
- registry_gate基線: `OK - 18 tables, no losses (+0/+0)`
- 撮影パイプ確認: tu22m3の4面図を8990経由で撮影成功（検収サーバーは夜間常駐、タスクID b6z1z00rb）
- 計画書v2をコミット+push: `691957f`

## 22:56 W1起動（固定翼9機）

- Workflow `wf_cab45dfa-592`、Fableビルダー9体並列（b1b/mig25/ea18g/droneTanker/sarFlyingBoat/
  hospitalTransport/powTransport/rootCourier/keyDistributor、ポート8912-8920）
- 完了通知でW2起動+W1マージへ。フォールバック起床23:25装填済み
- **★躓き1件・即復旧（22:57）**: 初回起動がargs文字列化の罠で即死（複数行JSONをargsに渡すと
  スクリプト側で`args.units`がundefined）。スクリプト冒頭に
  `const A = (typeof args==='string') ? JSON.parse(args) : args` の防御を入れて再起動→
  ビルダー9体のspawn確認済み。**W2以降も同スクリプトを使うので再発しない**。
  今後のWorkflow定石: argsは1行JSON+スクリプト側にこのparse-guardを必ず入れる

## 23:05 ユーザー追加指示（就寝前）

- **Fableトークン枯渇後のサブエージェントはOpusに切替**。スクリプトへ`MODEL_OPTS`実装済み
  （args `"model":"opus"` → `{model:'opus', effort:'high'}`。xhighは既知400罠なのでhigh固定）。
  計画書の体制節にも追記。切替判定=利用上限系エラーでの大量死。メインはFableのまま

## 23:15-23:20 ユーザー再指示: Fable即時停止→Opus引き継ぎ（体制確定）

- 「トークン消費が速いのでfableは止めておいて」「続きはopusにちゃんと引き継ぐ」
- Fable版W1は停止（途中ドラフト6/9機がpayloads/に残存: ea18g/hospitalTransport/keyDistributor/
  mig25/powTransport/sarFlyingBoat。完了者ゼロ）
- スクリプトに**引き継ぎ条項**を追加（前任ドラフトは活かすか書き直し・検証は自分でやり直し・
  前任の残存http.serverはkillしてから立て直し）→ **Opus版W1起動**（task w0fy93kan、9体、
  `{model:'opus', effort:'high'}`）。spawn確認済み。以降W2-W4も全部Opus

## 23:20-23:45 ★W1出荷完了（9/9、コミット3b6d9ad・push済み）

- Opus並列9体が18分で全機一発完了（リトライ0・ドロップ0）。前任Fableドラフト6機は
  引き継がれ、うち複数で前任の潜在バグ（geometry.panel=単位箱の寸法誤解等）をOpusが検出・是正
- マージ: 9件inline全成功、gate `no losses (+36 entries=9機×4テーブルで整合)`→`--update`で
  スナップショット再ベースライン込みコミット
- 検収: 全9機の4面図を本番リポジトリ経由で撮影し目視合格（形状アイデンティティ3点全機クリア）
- **W2起動済み**（task wkh4hwv3d、艦3+地上4=7体。commandVehicleは既存commandPost/mobileCommand
  発見につき§3規定でスキップ=ロースターは27→26に）
- 撮影の新しい罠2件: ①並走msedgeとのプロファイル競合→`--user-data-dir`分離で解決
  ②bashの`\\${k}`エスケープでパス変数が展開されない→**スクショパスはスラッシュ区切りで書く**
- 並走セッションは`1ba7b9f`(Batch2: デバッグフック修正系)をコミット。こちらのW1はその上に無衝突で着地

## 23:43-00:00 ★W2出荷完了（7/7）+ 並走セッションの実害を検知（未介入）

- Opus並列7体が19分で全機一発完了（リトライ0・ドロップ0）。補給艦/救難船/ROOT保管艦/
  自律SAM/ROOT中継車/地雷除去車/移動病院車。7枚とも4面図検収合格
- 移動指揮車(commandVehicle)は**既存のcommandPost/mobileCommandを発見しスキップ**（§3規定通り）→
  ロースターは27→26ユニットへ
- **★並走セッションの未コミット作業がページを壊している（こちらは無介入）**:
  マージ直後のgateが `FAIL - could not read the registry snapshot` に転落。
  切り分け手順=①index.htmlとsrc/registry/registry-snapshot.jsの**mtime静止を確認**(書き込み途中の
  誤検知を除外) ②playwrightでコンソール捕捉 → `ReferenceError: Cannot access 'missionRecords'
  before initialization`（TDZ） ③**ステージ済み版(HEAD+自分のW2ペイロードのみ)を隔離コピーで起動
  → `hasSnapshot: true` で健全**と確認。つまり**HEADも自分の成果も無傷、壊れているのは相手の
  未コミット作業ツリーだけ**。相手の担当領域なので**触らず、朝の申告リストへ**
- 上記により§6-6の規定（相手が未コミットの間はスナップショットjsonを更新しない）を適用し、
  W2は**tools/registry_snapshot.jsonを更新せずコミット**。gateの+14ドリフトは正常（lossesのみが
  ブロッカー）。W1時点では相手がコミット済みだったので`--update`を実行済み
- **再利用可能な検証レシピ**: 相手の編集と自分の成果が同居する作業ツリーでゲートが落ちたら、
  `git show :index.html`（ステージ済み版）を隔離ディレクトリへ出してplaywrightで起動し、
  `window.__REGISTRY_SNAPSHOT__`の有無で犯人を切り分ける。スクリプトは
  scratchpad/model_batch3/isolate + /tmp/dbg3.mjs の形

## 00:30-01:10 W3出荷完了（8/8）+ TDZ犯人の確定 + W4はトークン上限で中止

- **W3=著名機8機を出荷（`376c4ee`）**: b52(8発ポッド)/b2(全翼W字鋸歯)/f117(ファセット矢じり+
  内傾V尾翼)/sr71(チャイン+ショックコーン)/ac130(左舷砲門列)/c17(T尾翼)/an124(低尾翼+ノーズ
  バイザー)/il76(チン窓)。**輸送3機の相互識別が造形で成立していることを4面図で確認**
- **★TDZバグの犯人を決定的に確定**: W3ビルダー8体中6体が「素のHEADでも再現する既存バグ」と
  報告してきたが、**`git archive HEAD`で完全にクリーンな版を作って実測したところ
  `snap:true`/canvas 5枚/pageerror 0＝HEADは完全に健全**だった。ビルダーは
  index.htmlだけHEAD由来にして`src/`を作業ツリーからコピーしていたため、
  **並走セッションの未コミット`src/registry/registry-snapshot.js`を掴んでいた**のが真相。
  → 教訓: **「HEADでも再現する」という報告は、HEADの定義（どのファイルまでHEAD由来か）を
  確認するまで信用しない**。`git archive HEAD`が唯一の確実な素材
- 並走セッションは01:00頃までに自力でTDZを修正しコミット（`cb87a46`に修正報告書）。
  リポジトリのgateも復旧したので**registry_snapshot.jsonを再ベースライン（`fe42844`）**
- **★W4（救難ヘリ/艦載哨戒ヘリ）は中止**: ビルダー2体+リトライ2回の計4回すべて
  `You've hit your session limit · resets 3:50am (Asia/Tokyo)` で失敗。**成果物ゼロ・
  リポジトリへの副作用なし**。3:50am以降に再開予定（cron仕込み済み）

## ★バッチ3 完了報告（§10様式・W1-W3時点）

| 項目 | 結果 |
|---|---|
| 出荷ユニット | **24 / 26**（W1固定翼9・W2艦3+地上4・W3著名機8） |
| コミット | `3b6d9ad`(W1) / `ba0f218`(W2) / `376c4ee`(W3) / `fe42844`(snapshot) — **全てpush済み** |
| gate最終 | `OK - 19 tables, no losses (+86 entries, +3312 fields)` → `--update`で受理済み |
| 検収 | 24/24が4面図目視合格（形状アイデンティティ3点を全機クリア）・pageerror 0 |
| スキップ | commandVehicle（既存のcommandPost/mobileCommandと重複、§3規定） |
| 未完 | **W4のrescueHeli/navalPatrolHeli**（トークン上限。3:50am以降に再開） |
| 並走接触 | 事故ゼロ。index.htmlはmtime静止待ち+マーカーフィルタの部分コミットで無衝突 |

**朝のユーザー向け次アクション**:
1. **8340（プレイ用配信）への同期は未実施**（規定通り勝手にやらない）。新モデルを実機で見るなら
   index.htmlをsortie-playへcp+Ctrl+F5、またはリポジトリ直配信を使う
2. 24ユニットは全て**enemy/support-only**で登録（ハンガー非表示・ミッション未配置）。
   実戦投入は「どのミッションにどう出すか」の判断が要るので朝の相談事項
3. 数値は全て`BALANCE TODO`付きの継承値。バランス調整は未着手（意図的にスコープ外）
4. b52について申し送り: 既存の`bomber`(コメント上B-52H)は実装が単発ポッド4基。
   今回のb52が真の8発機なので、将来どちらを正とするか整理の余地あり
