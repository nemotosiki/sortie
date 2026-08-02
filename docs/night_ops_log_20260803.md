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
