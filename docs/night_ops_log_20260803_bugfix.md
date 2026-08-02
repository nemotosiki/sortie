# 夜間自律運転ログ(バグ修正班) 2026-08-02深夜〜08-03朝

モデルバッチ3班(night_ops_log_20260803.md)と**同一リポジトリで並走中**。衝突回避のための所有権宣言:

```
所有(書いてよい): index.htmlのランタイム関数内の局所修正hunk(下記ログの各修正)・src/ui/radio.js・
                 styles/*.css・docs/night_ops_log_20260803_bugfix.md
参照(読むだけ)  : payloads/** ・tools/** ・docs/spec_model_batch3_20260802.md
禁止(触らない)  : payloadテーブル/レジストリ領域・AIRCRAFT_MODELS等のモデル登録・
                 tools/registry_snapshot.json(--updateはバッチ班の専権)
```

- index.htmlへの書込みは**mtime静止30秒確認後**に限定、1修正=1コミット(自分のhunkだけstage)。stash不使用。
- 出典: 14チャンク全コード精読バグハント(Opus×14)の所見+Fable裏取り。正本=scratchpadのfindings_raw.md。

## 修正ログ(1修正1行、コミットSHA付き)

### Batch 1 — S1×2+ゲームプレイ実害群(23:0x適用、スモーク緑)
- [S1] 戦域帰投シェブロン南北反転: `battleArea.bearing`をatan2(dx,-dz)へ(ファイル規約準拠)
- [S1] チェックポイント復帰後の護衛誤全滅: destroyFriendlyの残数を台帳(total-lost)→盤面(alive数)基準へ
- [S2] 最終喪失だけlossPenalty非課金→常時課金へ(スモークで3×1500=4500実証)
- [S2] guardState.saved復元による二重計上("4/3 SAVED")→復元廃止
- [S2] チェックポイント復帰でintegrity損害が免責→worstIntegrity(最悪値の記録)を新設しランクはそれを読む
- [S2] sortieMarksがチェックポイントで消滅→銀行+復元を追加
- [S2] 復帰時に撃破済み地上TGTが復活しkills/盤面が乖離→destroyedGroundIds銀行+盤面から静かに再除去
- [S2] killCam多重発動でスローモ無限延長→再入ガード
- [S2] wave表末尾のconcurrent連鎖でspawnMissionWave(undefined)クラッシュ→境界ガード
- [S2] concurrent+TGT波が「NON-TARGET」表示→isTgtEntry分岐(× naval/air 2箇所)
- [S2] wave.radio直行経路で{nickname}が生表示→置換をradio.js triggerLine(単一入口)へ移設(実機で置換実証)
- [S2] HEADING表示が"360"を出す→%360
- [S2] 高度/速度テープの負値ティック露出→.tapeRow.hidden(visibility)
- [S3] 無線キュー満杯時、プリエンプト行が待機行を1件無駄に追い出す→順序入替
- [S3] damageFriendlyがguard非activeでも台帳を汚す→activeガード
- スモーク: m01/m-escort起動+pageerror0+置換+ペナルティ実証(scratchpad/smoke_batch1.py)。
  bearingはプローブ未露出のためコード検証(headingRad規約と消費側の両照合)

### Batch 3 — UI/起動+DESTROYED除去(ユーザー指示、23:2x適用、スモーク緑)
- [指示] キル時の「DESTROYED」表記を全廃: ポップアップは「+点数 · 機体名」のみ(span 12px化)、
  キル毎の「TARGET n · ○○ DESTROYED」バナーも廃止(進行系のALL TARGETS DESTROYED等は温存)。
  実機で popup="+1000 · Tu-95"・バナー無し・error 0 を確認
- [S2] 起動時のハンガー画面フラッシュ: startScreenに初期hidden+bodyへdata-game-state静的スタンプ
- [S2] 雲の中でミッション終了→ハンガーが白ベールで覆われたまま: 非playing時はveil目標0で減衰
- [S3] #statusPanel .hudVal同一詳細度の死に定義(min-width:52px側)を削除(見た目不変)
- [S3] #radarLabelOld死にセレクタ削除
