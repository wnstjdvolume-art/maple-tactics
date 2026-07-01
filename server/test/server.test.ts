/**
 * Maple Tactics 리더보드 서버 테스트
 * API: describe / test / expect / server.connect(sender)
 */
describe('Leaderboard', () => {
  test('submitScore stores a new best', async (server) => {
    server.connect({ account: 'user-alice' });
    const r = await server.submitScore(20, 'Alice');
    expect(r.updated).toBe(true);
    expect(r.bestRound).toBe(20);
  });

  test('higher round updates best; lower does not', async (server) => {
    server.connect({ account: 'user-bob' });
    await server.submitScore(15, 'Bob');
    const up = await server.submitScore(25, 'Bob');
    expect(up.updated).toBe(true);
    expect(up.bestRound).toBe(25);
    const down = await server.submitScore(10, 'Bob');
    expect(down.updated).toBe(false);
    expect(down.bestRound).toBe(25);
  });

  test('getTopRankings returns entries sorted desc', async (server) => {
    server.connect({ account: 'user-carol' });
    await server.submitScore(30, 'Carol');
    const top = await server.getTopRankings();
    expect(top.length > 0).toBe(true);
    expect(top[0].round >= top[top.length - 1].round).toBe(true);
  });

  test('invalid round throws', async (server) => {
    server.connect({ account: 'user-dave' });
    let threw = false;
    try { await server.submitScore(0, 'Dave'); } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });
});
