/**
 * Agent8 GameServer — Maple Tactics 리더보드
 * $global(글로벌 컬렉션), $sender.account(플레이어 고유 계정) 사용
 */
export class Server {
  // 게임오버 시 도달 라운드 + 닉네임 제출. 최고기록일 때만 갱신(계정당 1개 유지)
  async submitScore(round: number, name?: string): Promise<{ updated: boolean; message: string; bestRound: number }> {
    if (typeof round !== 'number' || !isFinite(round) || round < 1) {
      throw new Error('Invalid round');
    }
    const nick = (typeof name === 'string' ? name : '').trim().slice(0, 16) || 'Anonymous';

    const mine = await $global.getCollectionItems('rankings', {
      filters: [{ field: 'account', operator: '==', value: $sender.account }]
    });
    const best = mine.sort((a: any, b: any) => b.round - a.round)[0] || null;
    const bestRound = best ? best.round : 0;

    if (round > bestRound) {
      for (const e of mine) {
        await $global.deleteCollectionItem('rankings', e.__id);
      }
      await $global.addCollectionItem('rankings', {
        account: $sender.account,
        name: nick,
        round,
        createdAt: Date.now()
      });
      return { updated: true, message: `${bestRound} -> ${round}`, bestRound: round };
    }
    return { updated: false, message: 'Not a new best', bestRound };
  }

  // 상위 랭킹(라운드 내림차순)
  async getTopRankings(): Promise<any[]> {
    return await $global.getCollectionItems('rankings', {
      orderBy: [{ field: 'round', direction: 'desc' }],
      limit: 30
    });
  }

  // 내 최고 기록 + 순위
  async getMyBestRank(): Promise<{ bestEntry: any | null; rank: number }> {
    const mine = await $global.getCollectionItems('rankings', {
      filters: [{ field: 'account', operator: '==', value: $sender.account }]
    });
    if (mine.length === 0) return { bestEntry: null, rank: -1 };
    const bestEntry = mine.sort((a: any, b: any) => b.round - a.round)[0];
    const higher = await $global.countCollectionItems('rankings', {
      filters: [{ field: 'round', operator: '>', value: bestEntry.round }]
    });
    return { bestEntry, rank: higher + 1 };
  }
}
