/**
 * Maple Tactics — GameServer(전역 리더보드) 커넥터
 * Verse8 빌드 환경에서만 @agent8/gameserver 가 번들링되어 연결됨.
 * 스탠드얼론(GitHub Pages 등)에서는 조용히 비활성 → 게임의 로컬 명예의전당으로 폴백.
 * 게임 스크립트는 window.submitToLeaderboard / window.fetchGlobalRankings / window.gsReady 만 사용.
 */
let GS = null;
let ready = false;

(async function initGS() {
  try {
    const mod = await import('@agent8/gameserver');
    GS = new mod.GameServer();
    GS.on('connected', () => { ready = true; try { document.dispatchEvent(new CustomEvent('gsready')); } catch (e) {} });
    GS.on('disconnected', () => { ready = false; });
  } catch (e) {
    /* SDK 없음(스탠드얼론) → 전역 랭킹 비활성, 게임은 로컬 명예의전당 사용 */
  }
})();

// 점수(도달 라운드)+닉네임 제출 — 게임오버 등록 시 호출
window.submitToLeaderboard = async function (round, name) {
  if (!GS || !ready) return { ok: false };
  try {
    const r = await GS.remoteFunction('submitScore', [round, name || 'Anonymous']);
    return { ok: true, r };
  } catch (e) { return { ok: false }; }
};

// 전역 랭킹 조회 → {rows:[{name,round,account}], me:내계정} 또는 null(미연결)
window.fetchGlobalRankings = async function () {
  if (!GS || !ready) return null;
  try {
    const top = await GS.remoteFunction('getTopRankings');
    return { rows: top || [], me: (GS.account || '') };
  } catch (e) { return null; }
};

window.gsReady = function () { return !!ready; };
