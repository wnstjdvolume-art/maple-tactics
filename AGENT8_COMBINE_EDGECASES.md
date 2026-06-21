구매(영입) + 별 합성의 실제 동작 코드다. 자연어 설명이 아니라 이 코드를 그대로 이식해라. 핵심: "벤치가 꽉 차도 사면 합성되는 경우는 구매 허용"(buy의 benchFull 검사에서 wouldCombine 예외). countUnits는 벤치+보드 둘 다 센다.

```javascript
const BOARD_CAP = {1:3,2:3,3:4,4:5,5:6,6:7,7:8,8:9,9:10}; // 레벨별 보드 정원
let UID = 1;

// 벤치+보드 양쪽에서 (직업키,별) 개수
function countUnits(key, star){
  let n = 0;
  G.bench.forEach(u => { if(u && u.key===key && u.star===star) n++; });
  G.board.forEach(u => { if(u && u.key===key && u.star===star) n++; });
  return n;
}

function boardCount(){ return G.board.filter(Boolean).length; }

// 지금 1개 더 사면 합성이 완성되나? (별1 2개 이상 보유 → 사면 3개)
function wouldCombine(key){
  return countUnits(key, 1) >= 2;
}

// 상점 카드 클릭 = 영입
function buy(idx){
  const key = G.shop[idx];
  if(!key) return;
  const u = UNITS[key];

  // (1) 골드 검사 — 예외 없음
  if(G.gold < u.cost){ flash('골드 부족'); return; }

  // (2) 벤치 공간 검사 — ★단, '사면 합성되는' 구매는 꽉 차도 허용
  const benchFull = G.bench.filter(Boolean).length >= 9;
  if(benchFull && !wouldCombine(key)){ flash('벤치 가득참'); return; }
  // wouldCombine(key)가 true면 3개가 1개로 합쳐져 자리가 오히려 생기므로 통과시킨다.

  // (3) 실제 영입
  G.gold -= u.cost;
  G.pool[key]--;
  G.shop[idx] = null;
  addUnit(key, 1);
  renderAll();
}

// 벤치에 추가 (꽉 차도 합성 예정이면 임시 초과 허용 → combineCheck가 즉시 줄임)
function addUnit(key, star){
  let slot = -1;
  for(let i=0;i<9;i++){ if(!G.bench[i]){ slot = i; break; } }
  if(slot < 0){
    G.bench.push({ uid: UID++, key, star });   // 임시 9 초과 — 바로 아래 combineCheck가 3→1로 정원 복귀
  } else {
    G.bench[slot] = { uid: UID++, key, star };
  }
  combineCheck(key, star);
}

// 같은 직업+같은 별 3개 → 다음 별 1개로 합성 (연쇄)
function combineCheck(key, star){
  if(star >= 3) return;                 // 별3이 최대
  if(countUnits(key, star) >= 3){
    let removed = 0, keepPos = null;

    // 보드에 있던 것 먼저 제거(첫 제거 위치 기억 → 승급유닛을 그 자리에)
    for(let i=0;i<G.board.length;i++){
      const u = G.board[i];
      if(u && u.key===key && u.star===star && removed<3){
        if(!keepPos) keepPos = { col:u.col, row:u.row };
        G.board[i] = null; removed++;
      }
    }
    // 모자라면 벤치에서 제거
    for(let i=0;i<G.bench.length;i++){
      const u = G.bench[i];
      if(u && u.key===key && u.star===star && removed<3){ G.bench[i] = null; removed++; }
    }
    G.board = G.board.filter(Boolean);

    // 승급 유닛 생성 (아이템은 합쳐진 것 중 최대 3개 유지하고 싶으면 여기서 합침)
    const up = { uid: UID++, key, star: star+1 };
    if(keepPos && boardCount() < BOARD_CAP[G.level]){
      up.col = keepPos.col; up.row = keepPos.row;
      G.board.push(up);                 // 보드에 있던 자리 그대로
    } else {
      let s = -1; for(let i=0;i<9;i++){ if(!G.bench[i]){ s = i; break; } }
      if(s < 0) G.bench.push(up); else G.bench[s] = up;
    }

    flash('⭐ ' + UNITS[key].name + ' ' + (star+1) + '성 승급!');
    combineCheck(key, star+1);          // 연쇄: 별2가 3개면 별3까지
  }
}

// 상점 카드 "⭐승급!" 반짝 표시 (상점에서만, 사면 3개 완성될 때만)
function shopCardIsReady(key){
  const shopCount = G.shop.filter(k => k === key).length;   // 상점에 떠 있는 같은 직업 수
  return countUnits(key, 1) + shopCount >= 3;
}
```

# 이 코드가 보장하는 동작 (반드시 이렇게)
- 벤치 9칸 꽉 참 + 검사(별1) 2명 + 상점 검사 1장 → 클릭하면 **구매됨**(wouldCombine=true라 benchFull 통과). 검사 3→별2 1, 벤치 순감 -2. "벤치 가득참" 뜨면 버그.
- 검사 1명 보드 + 1명 벤치(벤치 꽉) + 상점 검사 1장 → 구매됨. 보드 위치를 별2가 이어받음(keepPos).
- 검사 별1 9개 → 별2 3개 → 별3 1개 연쇄.
- 골드 부족 → 합성 가능해도 구매 불가(골드만은 예외 없음).
- 반짝(shopCardIsReady=true) 카드는 벤치 꽉 차도 반드시 구매 가능해야 한다.

[지시] 위 코드를 그대로 이식. 특히 buy()의 `if(benchFull && !wouldCombine(key))` 한 줄이 핵심이다. countUnits는 벤치+보드 둘 다 센다.
