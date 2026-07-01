import { defineConfig } from 'vite';

// 클라이언트 빌드: index.html 진입 → dist/ 출력.
// src/leaderboard.js 의 @agent8/gameserver import 가 번들에 포함됨.
export default defineConfig({
  build: {
    target: 'es2019',
    outDir: 'dist',
    assetsDir: 'assets',
    // 게임 HTML 인라인 스크립트(내장 base64 스프라이트 ~500KB)가 커서 경고 상향
    chunkSizeWarningLimit: 4000
  }
});
