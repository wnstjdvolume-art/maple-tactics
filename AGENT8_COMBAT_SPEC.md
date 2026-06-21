전투가 "결과만 즉시 계산"되고 적도 안 보여서 문제다. 아래 의사코드 그대로 **실시간 자동 전투**를 구현해라. 절대 즉시 승패 계산으로 때우지 말고, 매 프레임 시뮬레이션 + 렌더링으로 유닛이 실제로 이동·공격·피격·사망하는 게 화면에 보여야 한다. (유닛/시너지/아이템 데이터는 이미 만든 것 그대로 사용)

# 좌표계
- 보드 = 7열(col 0~6) × 6행(row 0~5). 위쪽 3행(row 0,1,2) = 적 진영, 아래 3행(row 3,4,5) = 내 진영.
- 한 칸의 화면 픽셀 중심을 cellCenter(col,row)로 계산해서 거기에 유닛/이펙트를 그린다.

# 1. 전투 시작 (전투 시작 버튼)
```
function startBattle():
  if 보드에 내 유닛 0개: return  // 배치 안 하면 시작 불가
  allies = 내 보드 유닛들을 전투용으로 복제 (각자 col,row 유지)   // makeCombatant(u, ally=true)
  enemies = genEnemyTeam(round)                                  // 아래 2번
  applyBuffs(allies); applyBuffs(enemies)                        // 아래 4번 (시너지+아이템)
  battle = { allies, enemies, t:0, over:false, floats:[], fx:[] }
  phase = 'combat'
  배너표시(round종류: "몬스터 웨이브" / "보스: 머쉬맘" / "라이벌 매치")
  requestAnimationFrame(combatLoop)
```

# 2. 적 팀 생성 (★몬스터가 보드에 실제로 떠야 함)
```
function genEnemyTeam(round):
  team = []
  if round in [5,10,15,20]:               // 보스 라운드
     boss = makeCombatant(보스[round], ally=false)   // 머쉬맘/자쿰/혼테일/발록
     team.push(boss)
     호위몬스터 = min(1+floor(round/10), 4)마리 추가 (티어 = min(4,1+floor(round/6)))
  elif round in [4,8,12,16,19]:           // 라이벌(PvP) 라운드
     size = min(2+floor(round/2), 8)
     for i in size: 랜덤 직업(코스트 <= min(5,1+floor(round/3)))로 전투유닛 생성, 40% 확률 별2, 45% 확률 랜덤조각1
  else:                                    // 일반 몬스터 웨이브
     size = min(2+floor(round/2), 9)
     baseTier = min(5, 1+floor((round-1)/4))
     for i in size: 티어 = clamp(baseTier ± 랜덤, 1, 5)에서 몬스터 1마리, round>9면 40%로 별2
  // 능력치 라운드 스케일(보스 제외): hp,ad *= (1 + (round-1)*0.035)
  // 위치 배치: 적은 위쪽 3행(row 0,1,2)에 분산. idx별로 row=floor(idx/4)%3, col=(idx%4)*2+(row%2). 보스는 (col3,row1) 고정.
  return team

// 몬스터 티어: t1 달팽이/주황버섯/리본돼지, t2 와일드보어/스텀프/파란버섯,
//             t3 주니어네키/커즈아이/좀비버섯, t4 예티/드레이크, t5 그리피
```

# 3. 전투유닛 생성 (별 배수 적용)
```
function makeCombatant(unit, ally):
  base = 유닛/몬스터/보스 기준 능력치
  mult = (별1:1, 별2:1.8, 별3:3.2)
  return {
    key, ally, col, row,
    maxHp: round(base.hp*mult), hp: 동일,
    ad: round(base.ad*mult), as: base.as, range: base.range,
    mana:0, maxMana: (직업이면 22+코스트*5, 보스 80, 몬스터 0),
    ult: 직업이면 해당 직업 궁극기,
    cd: random()*0.5,   // 첫 공격 약간 분산
    moveCd:0, shield:0, crit: 0.15 + (도적계열?0.15:0),
    px:undefined, py:undefined,           // 렌더용 픽셀좌표(부드러운 이동)
    items: unit.items 복사
  }
```

# 4. 버프 적용 (시너지 + 아이템) — 전투 시작 시 1회
```
function applyBuffs(team):
  counts = 팀 내 트레잇별 "서로 다른 직업 수" 카운트(같은직업 중복=1)
  각 트레잇이 발동단계 도달 시, 그 트레잇을 가진 유닛에게 효과(체력/공격력/공속/마공) 적용
  각 유닛의 장착 아이템/조각 효과도 합산
  최종 maxHp/ad/as 확정, hp=maxHp
```

# 5. ★전투 루프 (핵심 — 절대 즉시계산 금지)
```
function combatLoop():
  if !battle or battle.over: return
  steps = 속도배율(×1→1, ×2→2, ×3→3)
  for s in steps:
     simStep()
     if 한쪽 전멸: break
  drawCombat()                 // ★매 프레임 렌더
  if (아군전멸 or 적전멸 or battle.t>30):
     endBattle(); return
  requestAnimationFrame(combatLoop)

function simStep():
  dt = 1/60
  battle.t += dt
  all = allies + enemies
  for c in all where c.hp>0:
     foes = (c.ally ? enemies : allies) 중 살아있는 것
     target = foes 중 c와 맨해튼거리(|dcol|+|drow|) 가장 가까운 것
     if !target: continue
     dist = |c.col-target.col| + |c.row-target.row|
     if dist <= c.range:                 // 사거리 안 → 공격
        c.cd -= dt
        if c.cd <= 0:
           c.cd = 1/c.as
           dmg = c.ad; if random()<c.crit: dmg = round(dmg*1.6); isCrit=true
           dmg = dmg * (1 - target.피해감소)
           target.shield>0 ? 보호막 먼저 차감 : target.hp -= dmg
           c.공격모션재생(0.26초); target.피격플래시(흰색); target.넉백(약간 뒤로 밀림)
           battle.floats.push(데미지숫자 at target, 위로 떠오르며 0.7초 페이드, 크리티컬은 노란 큰 글씨)
           c.mana += 10; target.mana += 4
           if c.mana >= c.maxMana: c.mana=0; castUlt(c)
     else:                               // 사거리 밖 → 한 칸 이동
        c.moveCd -= dt
        if c.moveCd <= 0:
           c.moveCd = 0.28
           target 방향으로 한 칸 이동(거리 큰 축 우선, 점유된 칸 회피)

function drawCombat():
  보드 그리드 그림(위3행 빨강틴트, 아래3행 초록틴트)
  for c in (enemies then allies) where c.hp>0:
     // 부드러운 이동: c.px += (cellCenterX(c.col)-c.px)*0.25 (py도 동일)
     유닛 스프라이트 그림 at (px,py) + 팀색 테두리(아군 파랑/적 빨강)
     머리 위 HP바(현재/최대), 그 아래 마나바(파랑)
     공격모션 중이면 공격프레임, 피격중이면 피격프레임/흰색플래시
  이펙트(battle.fx: 투사체/참격/폭발/궁극기) 그림
  데미지숫자(battle.floats) 그림
```

# 6. 궁극기 (마나 가득 → 자동 시전)
```
function castUlt(c):
  화면중앙 큰 스킬명 표시 + 잠깐 슬로모(불릿타임)
  역할별:
   - 수호자: c.shield += c.maxHp*0.30*pow
   - 근접(nuke): 가장 가까운 적에게 c.ad*pow 피해 + 폭발이펙트
   - 원거리(연사): 가까운 N명에게 c.ad*pow*0.6 피해 + 투사체
   - 법사(광역): 대상 주변(반경) 적들에게 c.ad*pow 피해 + 폭발
   - 보조(회복): 체력% 가장 낮은 아군 c.maxHp*0.25*pow 회복
  4·5코는 캐릭터 컷인. 스킬 이펙트/사운드는 메이플 공식 에셋.
  (시그니처: 히어로=히어로즈윌nuke2.6, 아크메이지=제네시스aoe1.9, 비숍=엔젤레이heal1.8, 보우마스터=하이퍼스트라이크연사1.3(4) 등 — 데이터 스펙대로)
```

# 7. 전투 종료 / 정산
```
function endBattle():
  battle.over = true
  win = (아군 살아있음 and 적 전멸)
  if 패배(무승부 아님): hp -= min(18, 살아남은 적 수 + floor(round/3) + 1)
  연승/연패 갱신
  0.6초 후 결과팝업 → 골드정산(기본5+이자+연승보너스+승리+1) → 경험치+2 → round+1 → 준비단계
  내 체력<=0이면 게임오버, round>20이면 클리어
```

# 8. UI 레이아웃 (인터페이스 정리)
- 상단바(가로): ❤️체력 | 💰골드 | ⭐레벨(현재xp/필요xp, 보드정원) | ◆라운드 | [정산/준비/전투중 상태] | 속도 ×1/×2/×3 버튼
- 가운데: 7×6 전투 보드(canvas 권장). 위3행 적(빨강), 아래3행 아군(초록), 중앙 분리선.
- 우측 패널: 시너지(계열5 + 역할5, 발동단계 도달한 것 강조/색칠, 미발동 회색) + 아이템(조각/완성)
- 하단: 벤치 9칸 → 그 아래 상점 5칸 + [새로고침 2G][레벨업/경험치 4G][전투 시작] 버튼
- 조작: 유닛 클릭=보드↔벤치, 드래그=정밀배치, 우클릭=판매. 상점카드 클릭=영입.

---
[지시] 위를 그대로 구현해라. 특히 5번 전투 루프는 "매 프레임 simStep + drawCombat"으로 만들어서, 적 몬스터가 보드에 뜨고 유닛들이 실제로 이동·공격하고 HP가 깎이고 데미지 숫자가 뜨는 게 수 초간 눈에 보여야 한다. 즉시 결과 계산은 금지. 한 번에 다 못 하면 (1)적 팀 생성+렌더 (2)이동/공격 루프 (3)궁극기/이펙트 순서로.
