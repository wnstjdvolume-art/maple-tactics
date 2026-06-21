아래는 우리가 만든 게임의 "실제 동작하는 전투 엔진 코드"다. 자연어 설명이 아니라 이 코드 자체를 네 프로젝트(React/TypeScript)에 그대로 이식해라. 로직과 수치를 절대 바꾸지 말고, requestAnimationFrame 기반 실시간 시뮬레이션을 그대로 구현해라. 즉시 승패 계산 금지. (그래픽만 나중에 메이플 공식 에셋으로 교체)

```javascript
// ===== 데이터 =====
const COLS=7, ROWS=6;                 // 보드 7열x6행, 위3행=적, 아래3행=아군
const STAR_MULT=[1,1,1.8,3.2];        // 별1/2/3 능력치 배수

// 직업 21종: [체력, 공격력, 공격속도(회/초), 사거리, 코스트, 계열, 역할]
const UNITS = {
  swordman:{hp:520,ad:36,as:0.62,range:1,cost:1,traits:['warrior','guardian']},
  magician:{hp:380,ad:44,as:0.58,range:3,cost:1,traits:['mage','caster']},
  archer1: {hp:400,ad:42,as:0.62,range:3,cost:1,traits:['archer','marksman']},
  rogue:   {hp:430,ad:40,as:0.70,range:1,cost:1,traits:['thief','striker']},
  pirate1: {hp:470,ad:38,as:0.66,range:1,cost:1,traits:['pirate','striker']},
  page:    {hp:680,ad:50,as:0.60,range:1,cost:2,traits:['warrior','guardian']},
  wizard:  {hp:470,ad:58,as:0.60,range:3,cost:2,traits:['mage','caster']},
  hunter:  {hp:500,ad:55,as:0.66,range:3,cost:2,traits:['archer','marksman']},
  assassin:{hp:440,ad:62,as:0.72,range:4,cost:2,traits:['thief','marksman']},
  brawler: {hp:640,ad:54,as:0.66,range:1,cost:2,traits:['pirate','striker']},
  knight:  {hp:820,ad:60,as:0.58,range:1,cost:3,traits:['warrior','guardian']},
  priest:  {hp:560,ad:55,as:0.60,range:3,cost:3,traits:['mage','support']},
  ranger:  {hp:600,ad:72,as:0.70,range:3,cost:3,traits:['archer','marksman']},
  hermit:  {hp:620,ad:78,as:0.72,range:1,cost:3,traits:['thief','striker']},
  hero:    {hp:1050,ad:95,as:0.68,range:1,cost:4,traits:['warrior','striker']},
  bishop:  {hp:780,ad:85,as:0.62,range:4,cost:4,traits:['mage','support']},
  bowmaster:{hp:720,ad:105,as:0.72,range:4,cost:4,traits:['archer','marksman']},
  nightlord:{hp:680,ad:120,as:0.74,range:4,cost:4,traits:['thief','marksman']},
  darkknight:{hp:1700,ad:130,as:0.72,range:1,cost:5,traits:['warrior','guardian']},
  archmage:{hp:1300,ad:170,as:0.60,range:4,cost:5,traits:['mage','caster']},
  viper:   {hp:1500,ad:150,as:0.78,range:1,cost:5,traits:['pirate','striker']},
};
// 몬스터: [체력,공격력,공속,사거리,티어]
const MONSTERS = {
  snail:{hp:420,ad:30,as:0.55,range:1,tier:1}, omush:{hp:480,ad:34,as:0.58,range:1,tier:1}, pig:{hp:520,ad:30,as:0.6,range:1,tier:1},
  boar:{hp:640,ad:48,as:0.62,range:1,tier:2}, stump:{hp:430,ad:46,as:0.55,range:3,tier:2}, bmush:{hp:520,ad:44,as:0.6,range:3,tier:2},
  necki:{hp:640,ad:66,as:0.68,range:3,tier:3}, eye:{hp:560,ad:72,as:0.7,range:4,tier:3}, zombie:{hp:760,ad:60,as:0.58,range:1,tier:3},
  yeti:{hp:920,ad:85,as:0.6,range:1,tier:4}, drake:{hp:1000,ad:95,as:0.64,range:1,tier:4}, griffey:{hp:1150,ad:120,as:0.66,range:3,tier:5},
};
const BOSSES = { mushmom:{hp:3000,ad:95,as:0.55,range:1}, zakum:{hp:6500,ad:160,as:0.5,range:4}, horntail:{hp:11000,ad:230,as:0.55,range:3}, balrog:{hp:18000,ad:320,as:0.65,range:1} };
const BOSS_ROUND={5:'mushmom',10:'zakum',15:'horntail',20:'balrog'};
const RIVAL_ROUND={4:1,8:1,12:1,16:1,19:1};
// 시너지 발동단계
const TRAITS={warrior:[2,4,6],mage:[2,4],archer:[2,4],thief:[2,4],pirate:[2,3,4],guardian:[2,4],striker:[2,4],marksman:[2,4],caster:[2,3],support:[2]};
const TRAIT_FX={
  warrior:{2:{flatHp:200},4:{flatHp:500},6:{flatHp:1000}}, mage:{2:{flatAd:25},4:{flatAd:60}},
  archer:{2:{asPct:0.25},4:{asPct:0.55}}, thief:{2:{adPct:0.18},4:{adPct:0.40}},
  pirate:{2:{hpPct:0.12,adPct:0.12},3:{hpPct:0.22,adPct:0.22},4:{hpPct:0.35,adPct:0.35}},
  guardian:{2:{flatHp:300},4:{flatHp:700}}, striker:{2:{adPct:0.20},4:{adPct:0.45}},
  marksman:{2:{flatAd:20},4:{flatAd:50}}, caster:{2:{flatAd:35},3:{flatAd:80}}, support:{2:{heal:0.20}},
};
// 궁극기: 역할 기본 + 직업 시그니처
const ULT_BYROLE={guardian:{type:'shield',pow:1},striker:{type:'nuke',pow:1.8},marksman:{type:'multishot',pow:1,shots:3},caster:{type:'aoe',pow:1.3,radius:1},support:{type:'heal',pow:1}};
const ULT_SIG={hero:{name:'히어로즈 윌',type:'nuke',pow:2.6},darkknight:{name:'다크 임팩트',type:'nuke',pow:2.4},viper:{name:'에너지 버스터',type:'nuke',pow:2.3},knight:{name:'아이언 윌',type:'shield',pow:1.4},archmage:{name:'제네시스',type:'aoe',pow:1.9,radius:2},bishop:{name:'엔젤레이',type:'heal',pow:1.8},bowmaster:{name:'하이퍼 스트라이크',type:'multishot',pow:1.3,shots:4},nightlord:{name:'쇼다운',type:'multishot',pow:1.1,shots:5},ranger:{name:'애로우 레인',type:'multishot',pow:1.2,shots:3},priest:{name:'홀리 라이트',type:'heal',pow:1.3},hermit:{name:'어벤져',type:'nuke',pow:1.9}};
function ultFor(key){const u=UNITS[key];const role=u.traits[1];const b=ULT_BYROLE[role];const s=ULT_SIG[key]||{};return{name:s.name||'궁극기',type:s.type||b.type,pow:s.pow||b.pow,radius:s.radius||b.radius||1,shots:s.shots||b.shots||3};}
function def(k){return UNITS[k]||MONSTERS[k]||BOSSES[k];}

// ===== 전투유닛 생성 =====
function makeCombatant(key, star, col, row, ally){
  const base=def(key), m=STAR_MULT[star]||1, isBoss=!!BOSSES[key], isJob=!!UNITS[key];
  return {key,ally,col,row,star,isBoss,
    maxHp:Math.round(base.hp*m),hp:Math.round(base.hp*m),ad:Math.round(base.ad*m),as:base.as,range:base.range,
    mana:0,maxMana:isJob?(22+(base.cost||1)*5):(isBoss?80:0),ult:isJob?ultFor(key):null,
    cd:Math.random()*0.5,moveCd:0,shield:0,crit:isJob?(0.15+(base.traits.includes('thief')?0.15:0)):0.08,
    traits:base.traits||[],px:undefined,py:undefined,flashT:0,atkT:0,items:[]};
}

// ===== 적 팀 생성 (★몬스터/보스/라이벌이 보드에 실제로 생성됨) =====
function genEnemyTeam(round){
  const team=[];
  if(BOSS_ROUND[round]){
    team.push(makeCombatant(BOSS_ROUND[round],1,3,1,false));
    const adds=Math.min(1+Math.floor(round/10),4), tier=Math.min(4,1+Math.floor(round/6));
    for(let i=0;i<adds;i++) team.push(makeCombatant(monstersByTier(tier),1,0,0,false));
  } else if(RIVAL_ROUND[round]){
    const size=Math.min(2+Math.floor(round/2),8), maxC=Math.min(5,1+Math.floor(round/3));
    const cand=Object.keys(UNITS).filter(k=>UNITS[k].cost<=maxC);
    for(let i=0;i<size;i++) team.push(makeCombatant(cand[Math.floor(Math.random()*cand.length)],round>=8&&Math.random()<0.4?2:1,0,0,false));
  } else {
    const size=Math.min(2+Math.floor(round/2),9), baseTier=Math.min(5,1+Math.floor((round-1)/4));
    for(let i=0;i<size;i++){let t=Math.max(1,Math.min(5,baseTier+(Math.random()<0.25?1:0)-(Math.random()<0.25?1:0)));team.push(makeCombatant(monstersByTier(t),round>9&&Math.random()<0.4?2:1,0,0,false));}
  }
  const sc=1+(round-1)*0.035;                       // 라운드 스케일
  team.forEach(c=>{if(!c.isBoss){c.maxHp=Math.round(c.maxHp*sc);c.hp=c.maxHp;c.ad=Math.round(c.ad*sc);}});
  let idx=0; team.forEach(c=>{if(c.isBoss){c.col=3;c.row=1;return;}c.row=Math.floor(idx/4)%3;c.col=(idx%4)*2+(c.row%2);if(c.col>=COLS)c.col=COLS-1;idx++;});
  return team;
}
function monstersByTier(t){const a=Object.keys(MONSTERS).filter(k=>MONSTERS[k].tier===t);return a[Math.floor(Math.random()*a.length)]||'snail';}

// ===== 시너지+아이템 버프 (전투 시작 시 1회) =====
function applyBuffs(team){
  const counts={},seen=new Set();
  team.forEach(c=>c.traits.forEach(t=>{const ck=t+':'+c.key;if(!seen.has(ck)){seen.add(ck);counts[t]=(counts[t]||0)+1;}}));
  for(const t in counts){const bps=TRAITS[t]||[];let tier=0;bps.forEach(b=>{if(counts[t]>=b)tier=b;});if(!tier)continue;const fx=TRAIT_FX[t][tier];if(!fx)continue;
    team.forEach(c=>{if(!c.traits.includes(t))return;
      if(fx.flatHp)c.maxHp+=fx.flatHp; if(fx.flatAd)c.ad+=fx.flatAd; if(fx.asPct)c.as*=(1+fx.asPct);
      if(fx.adPct)c.ad=Math.round(c.ad*(1+fx.adPct)); if(fx.hpPct)c.maxHp=Math.round(c.maxHp*(1+fx.hpPct)); if(fx.heal)c.maxHp=Math.round(c.maxHp*(1+fx.heal));});}
  team.forEach(c=>c.hp=c.maxHp);
}

// ===== 전투 진행 (★핵심: 매 프레임 시뮬레이션) =====
let battle=null, gameSpeed=1;
function startBattle(myBoardUnits, round){
  const allies=myBoardUnits.map(u=>{const c=makeCombatant(u.key,u.star,u.col,u.row,true);c.items=u.items||[];return c;});
  const enemies=genEnemyTeam(round);
  applyBuffs(allies); applyBuffs(enemies);
  battle={allies,enemies,t:0,over:false,floats:[],fx:[]};
  requestAnimationFrame(combatLoop);
}
function dist(a,b){return Math.abs(a.col-b.col)+Math.abs(a.row-b.row);}
function nearestEnemy(c,foes){let best=null,bd=99;foes.forEach(f=>{if(f.hp<=0)return;const d=dist(c,f);if(d<bd){bd=d;best=f;}});return best;}
function simStep(){
  const dt=1/60; battle.t+=dt;
  const all=[...battle.allies,...battle.enemies];
  for(const c of all){ if(c.hp<=0)continue;
    const foes=c.ally?battle.enemies:battle.allies;
    const tgt=nearestEnemy(c,foes); if(!tgt)continue;
    if(dist(c,tgt)<=c.range){                       // 사거리 안 → 공격
      c.cd-=dt;
      if(c.cd<=0){ c.cd=1/c.as;
        let dmg=c.ad; if(Math.random()<c.crit)dmg=Math.round(dmg*1.6);
        if(tgt.shield>0){const ab=Math.min(tgt.shield,dmg);tgt.shield-=ab;dmg-=ab;}
        tgt.hp-=dmg; tgt.flashT=1; c.atkT=0.26;       // 피격플래시 / 공격모션
        battle.floats.push({col:tgt.col,row:tgt.row,txt:Math.round(dmg),t:0,ally:tgt.ally});
        c.mana+=10; tgt.mana+=4;
        if(c.maxMana && c.mana>=c.maxMana){c.mana=0; castUlt(c);}
      }
    } else {                                         // 사거리 밖 → 한 칸 이동
      c.moveCd-=dt;
      if(c.moveCd<=0){c.moveCd=0.28; stepToward(c,tgt,all);}
    }
  }
}
function stepToward(c,t,all){
  const opt=[];
  if(t.col>c.col)opt.push([1,0]);else if(t.col<c.col)opt.push([-1,0]);
  if(t.row>c.row)opt.push([0,1]);else if(t.row<c.row)opt.push([0,-1]);
  for(const[dc,dr]of opt){const nc=c.col+dc,nr=c.row+dr;
    if(nc<0||nc>=COLS||nr<0||nr>=ROWS)continue;
    if(all.some(x=>x!==c&&x.hp>0&&x.col===nc&&x.row===nr))continue;
    c.col=nc;c.row=nr;return;}
}
function castUlt(c){
  const u=c.ult; if(!u)return;
  showSkillName(u.name);                              // 화면 중앙 스킬명 + 슬로모/이펙트
  const foes=c.ally?battle.enemies:battle.allies, mates=c.ally?battle.allies:battle.enemies;
  if(u.type==='shield') c.shield+=Math.round(c.maxHp*0.30*u.pow);
  else if(u.type==='heal'){let lo=null;mates.forEach(m=>{if(m.hp>0&&(!lo||m.hp/m.maxHp<lo.hp/lo.maxHp))lo=m;});if(lo)lo.hp=Math.min(lo.maxHp,lo.hp+Math.round(lo.maxHp*0.25*u.pow));}
  else if(u.type==='nuke'){const t=nearestEnemy(c,foes);if(t){t.hp-=Math.round(c.ad*u.pow);t.flashT=1;}}
  else if(u.type==='aoe'){const t=nearestEnemy(c,foes);if(t)foes.forEach(f=>{if(f.hp>0&&dist(f,t)<=u.radius){f.hp-=Math.round(c.ad*u.pow);f.flashT=1;}});}
  else if(u.type==='multishot'){foes.filter(f=>f.hp>0).sort((a,b)=>dist(c,a)-dist(c,b)).slice(0,u.shots).forEach(t=>{t.hp-=Math.round(c.ad*u.pow*0.6);t.flashT=1;});}
}
function combatLoop(){
  if(!battle||battle.over)return;
  for(let s=0;s<gameSpeed;s++){simStep();if(!battle.allies.some(c=>c.hp>0)||!battle.enemies.some(c=>c.hp>0))break;}
  drawCombat();                                       // ★매 프레임 렌더
  if(!battle.allies.some(c=>c.hp>0)||!battle.enemies.some(c=>c.hp>0)||battle.t>30){endBattle();return;}
  requestAnimationFrame(combatLoop);
}
function endBattle(){
  battle.over=true;
  const aliveA=battle.allies.some(c=>c.hp>0), aliveE=battle.enemies.some(c=>c.hp>0);
  const win=aliveA&&!aliveE;
  if(!win&&aliveE){const surv=battle.enemies.filter(c=>c.hp>0).length;playerHp-=Math.min(18,surv+Math.floor(round/3)+1);}
  // 연승/연패, 골드정산(기본5+이자+연승+승리), 경험치+2, round++, 준비단계로
}

// ===== 렌더 (canvas) — 매 프레임 호출 =====
function drawCombat(){
  ctx.clearRect(0,0,W,H);
  // 보드 그리드: row<3 적(빨강), row>=3 아군(초록)
  for(const c of [...battle.enemies,...battle.allies]){ if(c.hp<=0)continue;
    const tx=cellCenterX(c.col), ty=cellCenterY(c.row);
    if(c.px===undefined){c.px=tx;c.py=ty;}
    c.px+=(tx-c.px)*0.25; c.py+=(ty-c.py)*0.25;       // 부드러운 이동
    if(c.flashT>0)c.flashT-=0.08; if(c.atkT>0)c.atkT-=1/60;
    drawUnitSprite(c.px,c.py,c, c.ally?'#5a8bff':'#e0664a'); // 스프라이트+팀테두리
    drawBar(c.px,c.py, c.hp/c.maxHp, '체력');          // HP바
    if(c.maxMana)drawBar(c.px,c.py-? , c.mana/c.maxMana,'마나'); // 마나바(파랑)
    if(c.flashT>0)흰색플래시오버레이();
  }
  // 데미지숫자
  for(let i=battle.floats.length-1;i>=0;i--){const f=battle.floats[i];f.t+=0.016;
    drawText(f.txt, cellCenterX(f.col), cellCenterY(f.row)-f.t*40, f.ally?'#ff9a6a':'#ffe07a');
    if(f.t>0.7)battle.floats.splice(i,1);}
  // 이펙트(battle.fx) 그리기
}
```

[지시] 위 코드를 네 프로젝트(React/TS)에 그대로 이식해라. 핵심은 `combatLoop`가 `requestAnimationFrame`으로 매 프레임 `simStep()`(이동·공격) + `drawCombat()`(렌더)를 돌리는 것이다. 절대 즉시 승패 계산으로 바꾸지 말고, 적 몬스터가 보드에 생성(genEnemyTeam)되고 유닛들이 실제로 움직이며 싸우는 게 화면에 보이게 해라. TypeScript면 타입만 붙이고 로직/수치는 그대로 둬라.
