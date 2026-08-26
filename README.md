# Sortie

Three.jsで制作している、エースコンバット風の3Dアーケード空戦ゲームです。ビルド不要の`index.html`を中心に、機体・敵・地上兵器・艦船・マップ・ミッションをペイロード方式で追加します。

セラ編M01〜M10が通常起動へ統合されています。旧USA/RUSとのミッションID、進行記録、購入状態、キャンペーンUIの分離も完了しています。M01〜M03とM07〜M10はChromium E2Eでclear / fail / Retryまで検証済みで、M04〜M06は専用の全経路E2Eが残っています。

## 起動

`file://`ではES Modulesを読み込めないため、ローカルHTTPサーバーを使います。

```bash
python -m http.server 8000 --bind 127.0.0.1
```

ブラウザで次を開きます。

```text
http://127.0.0.1:8000/index.html
```

ゲーム本体は`index.html`、音声素材は`bgm/`と`sfx/`にあります。新しい登録データは原則として`payloads/*.payload.js`で作り、検証後に`tools/inline_payload.mjs`を通して通常起動へ統合します。

## 現在の実装状況

| 範囲 | 状態 |
|---|---|
| セラM01 `FIRST CONTACT` | 自動E2Eでテストプレイ可能 |
| セラM02 `SHATTERED MORNING` | 自動E2Eでテストプレイ可能 |
| セラM03 `LOW WATER` | 自動E2Eでテストプレイ可能 |
| セラM04〜M06 | 通常起動へ統合済み、専用全経路E2Eは未整備 |
| セラM07〜M10 | 自動E2Eでテストプレイ可能 |
| 人間による難易度・音量・視認性調整 | 未完了 |
| 旧キャンペーンとセラ編の完全分離 | 実装・回帰確認済み |

詳細は[セラキャンペーン実装状況](docs/implementation/sera_act1_status.md)を参照してください。

## 重要な設計方針

- 旧USA/RUSのミッションキーは一括改名しない。
- セラ編は`sera-m01`、`sera-m02`、`sera-m03`のような固有キーへ移行する。
- クリア記録、解禁、財布、購入機体、難易度、無線、ストーリーイベント、チェックポイントをキャンペーン単位で分離する。
- 新規コンテンツは旧ミッションの置換ではなく、独立したキャンペーンへの追加として登録する。
- ミッション解禁は各キャンペーン内の直前ミッションクリアだけを参照する。

移行手順と受入条件は[キャンペーン分離計画](docs/architecture/campaign_isolation_plan.md)にまとめています。

## リポジトリ構成

```text
index.html                 通常起動用のゲーム本体
src/                       UI・戦闘などの分離済みモジュール
payloads/                  機体、マップ、ミッション等の登録ペイロード
tools/                     静的契約、registry、Playwright E2E
.github/workflows/         永続回帰ゲート
bgm/ / sfx/                音声素材とクレジット
docs/                      設計、実装状況、調査記録
```

ドキュメントの正本・履歴・読み順は[docs/README.md](docs/README.md)に整理しています。ルートの[PLAN.md](PLAN.md)は初期ゲーム化ロードマップであり、現在のセラ編実装順を決める正本ではありません。

## 検証

M01〜M10には静的payload契約があります。M01〜M03とM07〜M10にはChromium E2Eがあり、M10では通常キャンペーンのM01〜M10順序とM09クリア後の解禁も確認します。

```text
.github/workflows/verify-sera-m01-e2e.yml
.github/workflows/verify-sera-m02-e2e.yml
.github/workflows/verify-sera-m03-e2e.yml
```

全体ゲートとして、キャンペーン記録移行、購入状態の分離、registry欠損、三角/Tabターゲット切替のブラウザ回帰があります。詳細は[セラ実装状況](docs/implementation/sera_act1_status.md)を参照してください。

## 開発時の原則

1. 新しい登録要素はまずペイロードとして実装する。
2. `index.html`への統合は、静的checkとブラウザE2Eが通った後に行う。
3. 同じ機能をペイロード版とインライン版の二重で適用しない。
4. 進行記録やミッションIDを変更するときは、移行処理と回帰テストを同じ変更に含める。
5. 旧資料を削除・移動する前に参照元を監査する。現段階では索引で整理し、リンク切れを避ける。

## ストーリー正本

セラ編の物語・マップ・無線脚本は[CURRENT_PLAN](docs/story_reboot/CURRENT_PLAN.md)から参照する非versioned文書を正本とします。`v0.*`は検討履歴です。実装済み範囲と検証状態は[セラキャンペーン実装状況](docs/implementation/sera_act1_status.md)を正本とします。
