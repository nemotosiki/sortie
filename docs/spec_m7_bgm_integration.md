# SPEC M7組込 — BGM動的切替 (2026-07-25, Fable設計)

素材は調達済み（bgm/ 6本、全CC0・-18 LUFS統一・combat/aceはシームレスループ加工済み。正本=bgm/CREDITS.txt）。
M5/M6出荷後に組み込む。

## 音楽レイヤー

- audioSystem に音楽層を追加: 常に**同時1トラック**。`AudioBufferSourceNode(loop=true)` + 専用 `musicGain`
  （既定 0.32。効果音より必ず下）。読み込みは既存sfxと同じ fetch+decode、失敗時は**無音フォールバック**
  （ゲーム進行を絶対に妨げない）
- **切替はクロスフェード0.9秒**（旧gain→0 / 新gain→0.32 を並走。equal-power不要、linearで可）
- ブラウザの自動再生制限: 既存 `ensureAudio()`（初回操作でresume）後にのみ開始。初回操作前は無音でよい

## 状態→トラック対応

| 状態 | トラック |
|------|---------|
| missionSelect / ready（+M5後は briefing画面→briefing.ogg） | menu.ogg（briefing画面実装後はそちらで briefing.ogg） |
| playing（通常） | combat.ogg |
| playing かつ **エース(isAce)が生存して mode="pursuit"** | ace.ogg（エース撃墜/離脱で combat へ戻す） |
| completeMission(true) の瞬間 | 音楽停止 → victory_sting.ogg を1回（loop無し） |
| missionComplete（デブリーフ表示中） | debrief.ogg（スティング終了後0.6s遅れで開始） |
| gameover | 音楽フェードアウト1.2sのみ（曲なし。既存の敗北ドローンを活かす） |
| outro（偽第3波） | ace.ogg 継続 or combat 継続のまま（切替なし。無線が主役） |

- 判定は毎フレームのポーリングでよい（`desiredMusicFor(state)` を計算し、現トラックと違えばクロスフェード開始）。
  ヒステリシス: エース戦⇔通常の切替は**3秒間**条件が継続したときのみ（pursuit/patrolのフリッカーで
  曲がバタつかないように）
- リトライ/ステート遷移の全経路で二重再生・残留がないこと（クロスフェード中の再切替も安全に）

## フック/デバッグ

- `hook.audio.music = { track, targetTrack, gain }`
- `debug.forceMusic(slot|null)`（null=自動へ戻す）、`debug.setMusicVolume(v)`

## 検証

- 全状態遷移マトリクスで track 切替をプローブ（menu→(briefing)→combat→ace→combat→sting→debrief→menu）
- エース戦ヒステリシス（3秒未満のpursuit断続で切替らないこと）
- リトライ10連打で二重再生なし（activeSources数が安定）
- victory sting→debrief の継ぎ（0.6s遅延）
- 音量関係: 実耳確認はユーザーが朝に行う前提。エージェントは gain 値と LUFS 前提の整合のみ確認し、
  **音量バランスの最終判断はFable/ユーザーに委ねると報告に明記**
