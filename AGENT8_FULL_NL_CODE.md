# MAPLE TACTICS — 게임 로직 전체 (자연어 설명 + 실제 코드)
이 문서는 각 시스템을 "의도(자연어)"와 "구현(코드)" 둘 다로 준다. 코드를 그대로 이식하고, 수치/규칙을 바꾸지 마라. 그래픽/UI 룩은 내가 준 캡처 이미지를 따른다. (TypeScript면 타입만 붙이고 로직은 동일)

---
## 0. 개요 (자연어)
메이플 직업(코스트=전직차수 1~5)으로 팀을 짜는 TFT식 오토배틀러다. 준비단계에서 상점에서 직업을 영입해 보드에 배치하고, 같은 직업 3개를 모으면 자동으로 별이 오른다. "전투 시작"을 누르면 적(몬스터/보스/라이벌)과 실시간 자동 전투를 하고, 지면 체력이 깎인다. 20라운드 생존이 목표.

---
## 1. 데이터 (코드)
```javascript
const COLS=7, ROWS=6;                  // 보드 7열x6행 (위3행=적, 아래3행=아군)
const STAR_MULT=[1,1,1.8,3.2];         // 별1/2/3 능력치 배수
const BOARD_CAP={1:3,2:3,3:4,4:5,5:6,6:7,7:8,8:9,9:10};  // 레벨별 보드 정원
const XP_NEED={1:2,2:4,3:8,4:14,5:24,6:40,7:60,8:84};    // 레벨업 필요 경험치
const POOL_COUNT={1:18,2:14,3:12,4:10,5:9};              // 코스트별 유닛 풀 수량
const SHOP_ODDS={ // 레벨별 코스트1~5 등장확률
 1:[1,0,0,0,0],2:[.75,.25,0,0,0],3:[.55,.30,.15,0,0],4:[.45,.30,.20,.05,0],5:[.35,.30,.25,.08,.02],
 6:[.25,.30,.30,.13,.02],7:[.20,.25,.32,.18,.05],8:[.16,.22,.30,.24,.08],9:[.12,.18,.28,.28,.14]};

// 직업 21종 [hp,ad,as,range,cost,traits]
const UNITS={
 swordman:{name:'검사',hp:520,ad:36,as:0.62,range:1,cost:1,traits:['warrior','guardian']},
 magician:{name:'매지션',hp:380,ad:44,as:0.58,range:3,cost:1,traits:['mage','caster']},
 archer1:{name:'아처',hp:400,ad:42,as:0.62,range:3,cost:1,traits:['archer','marksman']},
 rogue:{name:'로그',hp:430,ad:40,as:0.70,range:1,cost:1,traits:['thief','striker']},
 pirate1:{name:'해적',hp:470,ad:38,as:0.66,range:1,cost:1,traits:['pirate','striker']},
 page:{name:'페이지',hp:680,ad:50,as:0.60,range:1,cost:2,traits:['warrior','guardian']},
 wizard:{name:'썬콜위자드',hp:470,ad:58,as:0.60,range:3,cost:2,traits:['mage','caster']},
 hunter:{name:'헌터',hp:500,ad:55,as:0.66,range:3,cost:2,traits:['archer','marksman']},
 assassin:{name:'어쌔신',hp:440,ad:62,as:0.72,range:4,cost:2,traits:['thief','marksman']},
 brawler:{name:'인파이터',hp:640,ad:54,as:0.66,range:1,cost:2,traits:['pirate','striker']},
 knight:{name:'나이트',hp:820,ad:60,as:0.58,range:1,cost:3,traits:['warrior','guardian']},
 priest:{name:'프리스트',hp:560,ad:55,as:0.60,range:3,cost:3,traits:['mage','support']},
 ranger:{name:'레인저',hp:600,ad:72,as:0.70,range:3,cost:3,traits:['archer','marksman']},
 hermit:{name:'허밋',hp:620,ad:78,as:0.72,range:1,cost:3,traits:['thief','striker']},
 hero:{name:'히어로',hp:1050,ad:95,as:0.68,range:1,cost:4,traits:['warrior','striker']},
 bishop:{name:'비숍',hp:780,ad:85,as:0.62,range:4,cost:4,traits:['mage','support']},
 bowmaster:{name:'보우마스터',hp:720,ad:105,as:0.72,range:4,cost:4,traits:['archer','marksman']},
 nightlord:{name:'나이트로드',hp:680,ad:120,as:0.74,range:4,cost:4,traits:['thief','marksman']},
 darkknight:{name:'다크나이트',hp:1700,ad:130,as:0.72,range:1,cost:5,traits:['warrior','guardian']},
 archmage:{name:'아크메이지',hp:1300,ad:170,as:0.60,range:4,cost:5,traits:['mage','caster']},
 viper:{name:'바이퍼',hp:1500,ad:150,as:0.78,range:1,cost:5,traits:['pirate','striker']},
};
const MONSTERS={ // [hp,ad,as,range,tier]
 snail:{name:'달팽이',hp:420,ad:30,as:.55,range:1,tier:1},omush:{name:'주황버섯',hp:480,ad:34,as:.58,range:1,tier:1},pig:{name:'리본돼지',hp:520,ad:30,as:.6,range:1,tier:1},
 boar:{name:'와일드보어',hp:640,ad:48,as:.62,range:1,tier:2},stump:{name:'스텀프',hp:430,ad:46,as:.55,range:3,tier:2},bmush:{name:'파란버섯',hp:520,ad:44,as:.6,range:3,tier:2},
 necki:{name:'주니어네키',hp:640,ad:66,as:.68,range:3,tier:3},eye:{name:'커즈아이',hp:560,ad:72,as:.7,range:4,tier:3},zombie:{name:'좀비버섯',hp:760,ad:60,as:.58,range:1,tier:3},
 yeti:{name:'예티',hp:920,ad:85,as:.6,range:1,tier:4},drake:{name:'드레이크',hp:1000,ad:95,as:.64,range:1,tier:4},griffey:{name:'그리피',hp:1150,ad:120,as:.66,range:3,tier:5}};
const BOSSES={mushmom:{name:'머쉬맘',hp:3000,ad:95,as:.55,range:1},zakum:{name:'자쿰',hp:6500,ad:160,as:.5,range:4},horntail:{name:'혼테일',hp:11000,ad:230,as:.55,range:3},balrog:{name:'발록',hp:18000,ad:320,as:.65,range:1}};
const BOSS_ROUND={5:'mushmom',10:'zakum',15:'horntail',20:'balrog'};
const RIVAL_ROUND={4:1,8:1,12:1,16:1,19:1};

const TRAITS={warrior:[2,4,6],mage:[2,4],archer:[2,4],thief:[2,4],pirate:[2,3,4],guardian:[2,4],striker:[2,4],marksman:[2,4],caster:[2,3],support:[2]};
const TRAIT_FX={
 warrior:{2:{flatHp:200},4:{flatHp:500},6:{flatHp:1000}},mage:{2:{flatAd:25},4:{flatAd:60}},
 archer:{2:{asPct:.25},4:{asPct:.55}},thief:{2:{adPct:.18},4:{adPct:.40}},
 pirate:{2:{hpPct:.12,adPct:.12},3:{hpPct:.22,adPct:.22},4:{hpPct:.35,adPct:.35}},
 guardian:{2:{flatHp:300},4:{flatHp:700}},striker:{2:{adPct:.20},4:{adPct:.45}},
 marksman:{2:{flatAd:20},4:{flatAd:50}},caster:{2:{flatAd:35},3:{flatAd:80}},support:{2:{heal:.20}}};

const ULT_BYROLE={guardian:{type:'shield',pow:1},striker:{type:'nuke',pow:1.8},marksman:{type:'multishot',pow:1,shots:3},caster:{type:'aoe',pow:1.3,radius:1},support:{type:'heal',pow:1}};
const ULT_SIG={hero:{name:'히어로즈 윌',type:'nuke',pow:2.6},darkknight:{name:'다크 임팩트',type:'nuke',pow:2.4},viper:{name:'에너지 버스터',type:'nuke',pow:2.3},knight:{name:'아이언 윌',type:'shield',pow:1.4},archmage:{name:'제네시스',type:'aoe',pow:1.9,radius:2},bishop:{name:'엔젤레이',type:'heal',pow:1.8},bowmaster:{name:'하이퍼 스트라이크',type:'multishot',pow:1.3,shots:4},nightlord:{name:'쇼다운',type:'multishot',pow:1.1,shots:5},ranger:{name:'애로우 레인',type:'multishot',pow:1.2,shots:3},priest:{name:'홀리 라이트',type:'heal',pow:1.3},hermit:{name:'어벤져',type:'nuke',pow:1.9}};
function ultFor(key){const u=UNITS[key];const b=ULT_BYROLE[u.traits[1]];const s=ULT_SIG[key]||{};return{name:s.name||'궁극기',type:s.type||b.type,pow:s.pow||b.pow,radius:s.radius||b.radius||1,shots:s.shots||b.shots||3};}
function def(k){return UNITS[k]||MONSTERS[k]||BOSSES[k];}

const COMPONENTS={bsword:{name:'검 조각',fx:{ad:12}},barmor:{name:'갑옷 조각',fx:{hp:120}},bglove:{name:'장갑 조각',fx:{asPct:.08}},borb:{name:'보주 조각',fx:{ad:14}},bcloak:{name:'망토 조각',fx:{dr:.05}}};
const ITEMS={
 reddragon:{name:'적룡도',recipe:['bsword','bsword'],fx:{ad:35}},aegis:{name:'이지스실드',recipe:['barmor','barmor'],fx:{hp:350}},transposer:{name:'트랜스포저',recipe:['bglove','bglove'],fx:{asPct:.25}},essence:{name:'마력의정수',recipe:['borb','borb'],fx:{ad:50}},utgard:{name:'우트가르드',recipe:['bcloak','bcloak'],fx:{dr:.15}},
 dominator:{name:'도미네이터',recipe:['bsword','barmor'],fx:{ad:15,hp:180}},bloodglove:{name:'흡혈장갑',recipe:['bsword','bglove'],fx:{ad:10,lifesteal:.20}},zerosword:{name:'제로의검',recipe:['bsword','borb'],fx:{adPct:.22}},thornmail:{name:'가시갑주',recipe:['bsword','bcloak'],fx:{ad:14,dr:.08}},
 hastearmor:{name:'질풍갑옷',recipe:['barmor','bglove'],fx:{hp:160,asPct:.12}},sagerobe:{name:'현자의로브',recipe:['barmor','borb'],fx:{hp:160,ad:18}},fortress:{name:'강철요새',recipe:['barmor','bcloak'],fx:{hp:220,dr:.10}},
 runeglove:{name:'룬글러브',recipe:['bglove','borb'],fx:{asPct:.15,ad:18}},windguard:{name:'바람막이',recipe:['bglove','bcloak'],fx:{asPct:.15,dr:.08}},spirit:{name:'정령의부적',recipe:['borb','bcloak'],fx:{ad:22,dr:.08}}};
const RECIPES={}; for(const k in ITEMS){RECIPES[[...ITEMS[k].recipe].sort().join('+')]=k;}
```

---
## 2. 영입 + 별 합성 (자연어 + 코드)
**의도:** 상점 카드를 클릭하면 골드를 내고 그 직업을 벤치로 영입한다. 같은 직업 별이 3개 모이면 자동으로 다음 별 1개로 합쳐진다(연쇄). **핵심: 벤치가 꽉 차도 "사면 합성되는" 경우는 구매를 허용한다**(3개가 1개로 줄어 자리가 생기니까). countUnits는 벤치+보드 둘 다 센다.
```javascript
let UID=1;
function countUnits(key,star){let n=0;G.bench.forEach(u=>{if(u&&u.key===key&&u.star===star)n++;});G.board.forEach(u=>{if(u&&u.key===key&&u.star===star)n++;});return n;}
function boardCount(){return G.board.filter(Boolean).length;}
function wouldCombine(key){return countUnits(key,1)>=2;}            // 사면 3개 → 합성

function buy(idx){
  const key=G.shop[idx]; if(!key)return;
  const u=UNITS[key];
  if(G.gold<u.cost){flash('골드 부족');return;}                    // 골드는 예외 없음
  const benchFull=G.bench.filter(Boolean).length>=9;
  if(benchFull && !wouldCombine(key)){flash('벤치 가득참');return;} // ★합성되는 구매는 꽉 차도 통과
  G.gold-=u.cost; G.pool[key]--; G.shop[idx]=null;
  addUnit(key,1); renderAll();
}
function addUnit(key,star){
  let slot=-1; for(let i=0;i<9;i++){if(!G.bench[i]){slot=i;break;}}
  if(slot<0) G.bench.push({uid:UID++,key,star});                   // 꽉 차도 임시 추가→아래서 줄임
  else G.bench[slot]={uid:UID++,key,star};
  combineCheck(key,star);
}
function combineCheck(key,star){
  if(star>=3)return;
  if(countUnits(key,star)>=3){
    let removed=0,keepPos=null;
    for(let i=0;i<G.board.length;i++){const u=G.board[i];if(u&&u.key===key&&u.star===star&&removed<3){if(!keepPos)keepPos={col:u.col,row:u.row};G.board[i]=null;removed++;}}
    for(let i=0;i<G.bench.length;i++){const u=G.bench[i];if(u&&u.key===key&&u.star===star&&removed<3){G.bench[i]=null;removed++;}}
    G.board=G.board.filter(Boolean);
    const up={uid:UID++,key,star:star+1};
    if(keepPos && boardCount()<BOARD_CAP[G.level]){up.col=keepPos.col;up.row=keepPos.row;G.board.push(up);}
    else{let s=-1;for(let i=0;i<9;i++){if(!G.bench[i]){s=i;break;}}if(s<0)G.bench.push(up);else G.bench[s]=up;}
    flash('⭐ '+UNITS[key].name+' '+(star+1)+'성 승급!');
    combineCheck(key,star+1);                                      // 연쇄
  }
}
function shopCardIsReady(key){const sc=G.shop.filter(k=>k===key).length;return countUnits(key,1)+sc>=3;} // 상점 반짝
```

---
## 3. 상점 / 레벨 (자연어 + 코드)
**의도:** 상점은 레벨별 확률로 5칸을 굴린다. 새로고침(2골드), 경험치 구매(4골드=+4xp), 라운드마다 자동 +2xp. 레벨=보드 정원.
```javascript
function unitsByCost(c){return Object.keys(UNITS).filter(k=>UNITS[k].cost===c);}
function rollShop(){
  const odds=SHOP_ODDS[Math.min(G.level,9)]; G.shop=[];
  for(let i=0;i<5;i++){let r=Math.random(),acc=0,cost=1;for(let c=1;c<=5;c++){acc+=odds[c-1];if(r<=acc){cost=c;break;}}
    const cand=unitsByCost(cost).filter(k=>G.pool[k]>0); G.shop.push(cand.length?cand[Math.floor(Math.random()*cand.length)]:null);}
}
function reroll(){if(G.gold<2){flash('골드 부족');return;}G.gold-=2;rollShop();renderAll();}
function buyXP(){if(G.level>=9||G.gold<4){return;}G.gold-=4;gainXP(4);renderAll();}
function gainXP(n){if(G.level>=9)return;G.xp+=n;while(G.level<9&&G.xp>=XP_NEED[G.level]){G.xp-=XP_NEED[G.level];G.level++;flash('레벨 '+G.level+'!');}}
```

---
## 4. 경제 정산 (자연어 + 코드)
**의도:** 라운드 끝나면 기본5 + 이자(10골드당1,최대5) + 연승/연패 보너스 + 승리시+1 을 받는다.
```javascript
function roundIncome(win){
  let inc=5+Math.min(5,Math.floor(G.gold/10));
  const sb=Math.abs(G.streak); if(sb>=2)inc+=sb>=5?3:sb>=3?2:1;
  if(win)inc+=1; return inc;
}
```

---
## 5. 시너지 (자연어 + 코드)
**의도:** 보드 위 "서로 다른 직업" 수로 계열5+역할5 시너지를 카운트(같은 직업 중복=1). 발동단계 도달 시 해당 트레잇 가진 유닛에게 효과.
```javascript
function activeTraits(units){
  const counts={},seen=new Set();
  units.forEach(u=>{if(!u)return;const d=def(u.key);if(!d.traits)return;d.traits.forEach(t=>{const ck=t+':'+u.key;if(!seen.has(ck)){seen.add(ck);counts[t]=(counts[t]||0)+1;}});});
  return counts;
}
function applyBuffs(team){
  const counts=activeTraits(team);
  for(const t in counts){const bps=TRAITS[t]||[];let tier=0;bps.forEach(b=>{if(counts[t]>=b)tier=b;});if(!tier)continue;const fx=TRAIT_FX[t][tier];if(!fx)continue;
    team.forEach(c=>{if(!c.traits.includes(t))return;
      if(fx.flatHp)c.maxHp+=fx.flatHp;if(fx.flatAd)c.ad+=fx.flatAd;if(fx.asPct)c.as*=(1+fx.asPct);
      if(fx.adPct)c.ad=Math.round(c.ad*(1+fx.adPct));if(fx.hpPct)c.maxHp=Math.round(c.maxHp*(1+fx.hpPct));if(fx.heal)c.maxHp=Math.round(c.maxHp*(1+fx.heal));});}
  team.forEach(c=>{(c.items||[]).forEach(it=>{const f=(ITEMS[it]||COMPONENTS[it]||{}).fx;if(!f)return;if(f.ad)c.ad+=f.ad;if(f.adPct)c.ad=Math.round(c.ad*(1+f.adPct));if(f.hp)c.maxHp+=f.hp;if(f.asPct)c.as*=(1+f.asPct);if(f.lifesteal)c.lifesteal=(c.lifesteal||0)+f.lifesteal;if(f.dr)c.dr=(c.dr||0)+f.dr;});c.hp=c.maxHp;});
}
```

---
## 6. 전투 엔진 (자연어 + 코드) — ★즉시계산 금지, 매 프레임 시뮬
**의도:** "전투 시작" → 적팀을 보드 위3행에 생성 → requestAnimationFrame으로 매 프레임 simStep(이동·공격·피격·데미지숫자) + drawCombat(렌더). 한쪽 전멸 or 30초면 종료. 절대 결과만 계산하고 끝내지 마라.
```javascript
let battle=null, gameSpeed=1;
function makeCombatant(key,star,col,row,ally){
  const base=def(key),m=STAR_MULT[star]||1,isBoss=!!BOSSES[key],isJob=!!UNITS[key];
  return{key,name:base.name,ally,col,row,star,isBoss,maxHp:Math.round(base.hp*m),hp:Math.round(base.hp*m),ad:Math.round(base.ad*m),as:base.as,range:base.range,
   mana:0,maxMana:isJob?(22+(base.cost||1)*5):(isBoss?80:0),ult:isJob?ultFor(key):null,
   cd:Math.random()*0.5,moveCd:0,shield:0,crit:isJob?(0.15+(base.traits.includes('thief')?0.15:0)):0.08,traits:base.traits||[],items:[],px:undefined,py:undefined,flashT:0,atkT:0};
}
function monstersByTier(t){const a=Object.keys(MONSTERS).filter(k=>MONSTERS[k].tier===t);return a[Math.floor(Math.random()*a.length)]||'snail';}
function genEnemyTeam(round){
  const team=[];
  if(BOSS_ROUND[round]){team.push(makeCombatant(BOSS_ROUND[round],1,3,1,false));const adds=Math.min(1+Math.floor(round/10),4),tier=Math.min(4,1+Math.floor(round/6));for(let i=0;i<adds;i++)team.push(makeCombatant(monstersByTier(tier),1,0,0,false));}
  else if(RIVAL_ROUND[round]){const size=Math.min(2+Math.floor(round/2),8),mc=Math.min(5,1+Math.floor(round/3)),cand=Object.keys(UNITS).filter(k=>UNITS[k].cost<=mc);for(let i=0;i<size;i++)team.push(makeCombatant(cand[Math.floor(Math.random()*cand.length)],round>=8&&Math.random()<0.4?2:1,0,0,false));}
  else{const size=Math.min(2+Math.floor(round/2),9),bt=Math.min(5,1+Math.floor((round-1)/4));for(let i=0;i<size;i++){let t=Math.max(1,Math.min(5,bt+(Math.random()<0.25?1:0)-(Math.random()<0.25?1:0)));team.push(makeCombatant(monstersByTier(t),round>9&&Math.random()<0.4?2:1,0,0,false));}}
  const sc=1+(round-1)*0.035; team.forEach(c=>{if(!c.isBoss){c.maxHp=Math.round(c.maxHp*sc);c.hp=c.maxHp;c.ad=Math.round(c.ad*sc);}});
  let idx=0;team.forEach(c=>{if(c.isBoss){c.col=3;c.row=1;return;}c.row=Math.floor(idx/4)%3;c.col=(idx%4)*2+(c.row%2);if(c.col>=COLS)c.col=COLS-1;idx++;});
  return team;
}
function startBattle(){
  const allies=G.board.filter(Boolean).map(u=>{const c=makeCombatant(u.key,u.star,u.col,u.row,true);c.items=u.items||[];return c;});
  const enemies=genEnemyTeam(G.round);
  applyBuffs(allies); applyBuffs(enemies);
  battle={allies,enemies,t:0,over:false,floats:[]};
  requestAnimationFrame(combatLoop);
}
function dist(a,b){return Math.abs(a.col-b.col)+Math.abs(a.row-b.row);}
function nearestEnemy(c,foes){let best=null,bd=99;foes.forEach(f=>{if(f.hp<=0)return;const d=dist(c,f);if(d<bd){bd=d;best=f;}});return best;}
function stepToward(c,t,all){const o=[];if(t.col>c.col)o.push([1,0]);else if(t.col<c.col)o.push([-1,0]);if(t.row>c.row)o.push([0,1]);else if(t.row<c.row)o.push([0,-1]);for(const[dc,dr]of o){const nc=c.col+dc,nr=c.row+dr;if(nc<0||nc>=COLS||nr<0||nr>=ROWS)continue;if(all.some(x=>x!==c&&x.hp>0&&x.col===nc&&x.row===nr))continue;c.col=nc;c.row=nr;return;}}
function simStep(){
  const dt=1/60; battle.t+=dt; const all=[...battle.allies,...battle.enemies];
  for(const c of all){ if(c.hp<=0)continue;
    const foes=c.ally?battle.enemies:battle.allies; const tgt=nearestEnemy(c,foes); if(!tgt)continue;
    if(dist(c,tgt)<=c.range){ c.cd-=dt;
      if(c.cd<=0){ c.cd=1/c.as; let dmg=c.ad; if(Math.random()<c.crit)dmg=Math.round(dmg*1.6);
        if(c.dr) {} if(tgt.dr)dmg=dmg*(1-tgt.dr);
        if(tgt.shield>0){const a=Math.min(tgt.shield,dmg);tgt.shield-=a;dmg-=a;}
        tgt.hp-=dmg; tgt.flashT=1; c.atkT=0.26;
        if(c.lifesteal)c.hp=Math.min(c.maxHp,c.hp+dmg*c.lifesteal);
        battle.floats.push({col:tgt.col,row:tgt.row,txt:Math.round(dmg),t:0,ally:tgt.ally});
        c.mana+=10; tgt.mana+=4; if(c.maxMana&&c.mana>=c.maxMana){c.mana=0;castUlt(c);}
      }
    } else { c.moveCd-=dt; if(c.moveCd<=0){c.moveCd=0.28;stepToward(c,tgt,all);} }
  }
}
function castUlt(c){
  const u=c.ult; if(!u)return; showSkillName(u.name);
  const foes=c.ally?battle.enemies:battle.allies, mates=c.ally?battle.allies:battle.enemies;
  if(u.type==='shield')c.shield+=Math.round(c.maxHp*0.30*u.pow);
  else if(u.type==='heal'){let lo=null;mates.forEach(m=>{if(m.hp>0&&(!lo||m.hp/m.maxHp<lo.hp/lo.maxHp))lo=m;});if(lo)lo.hp=Math.min(lo.maxHp,lo.hp+Math.round(lo.maxHp*0.25*u.pow));}
  else if(u.type==='nuke'){const t=nearestEnemy(c,foes);if(t){t.hp-=Math.round(c.ad*u.pow);t.flashT=1;}}
  else if(u.type==='aoe'){const t=nearestEnemy(c,foes);if(t)foes.forEach(f=>{if(f.hp>0&&dist(f,t)<=u.radius){f.hp-=Math.round(c.ad*u.pow);f.flashT=1;}});}
  else if(u.type==='multishot'){foes.filter(f=>f.hp>0).sort((a,b)=>dist(c,a)-dist(c,b)).slice(0,u.shots).forEach(t=>{t.hp-=Math.round(c.ad*u.pow*0.6);t.flashT=1;});}
}
function combatLoop(){
  if(!battle||battle.over)return;
  for(let s=0;s<gameSpeed;s++){simStep();if(!battle.allies.some(c=>c.hp>0)||!battle.enemies.some(c=>c.hp>0))break;}
  drawCombat();
  if(!battle.allies.some(c=>c.hp>0)||!battle.enemies.some(c=>c.hp>0)||battle.t>30){endBattle();return;}
  requestAnimationFrame(combatLoop);
}
function endBattle(){
  battle.over=true; const aliveA=battle.allies.some(c=>c.hp>0),aliveE=battle.enemies.some(c=>c.hp>0); const win=aliveA&&!aliveE;
  if(!win&&aliveE){const surv=battle.enemies.filter(c=>c.hp>0).length;G.hp-=Math.min(18,surv+Math.floor(G.round/3)+1);}
  G.streak=win?(G.streak>=0?G.streak+1:1):(G.streak<=0?G.streak-1:-1);
  G.gold+=roundIncome(win); gainXP(2); G.round++;
  // 준비단계로, G.hp<=0이면 게임오버, round>20이면 클리어
}
```
**렌더(drawCombat):** 매 프레임 호출. 보드(위3행 빨강/아래3행 초록) + 살아있는 모든 유닛(스프라이트+팀테두리+HP바+마나바, px/py로 부드럽게 이동, flashT면 흰 피격플래시) + 데미지숫자(battle.floats, 위로 떠오르며 0.7초 페이드) 그린다. 적 몬스터가 보드에 보여야 한다.

---
## 7. 아이템 조합 (자연어 + 코드)
**의도:** 드롭으로 조각 5종을 얻고, 조각 2개를 합쳐 완성템 15종을 만든다. 조각/완성템 모두 유닛에 장착(최대3). 유닛에 미완성 조각 있을 때 다른 조각 끼우면 자동 합성.
```javascript
function combineComponents(a,b){return RECIPES[[a,b].sort().join('+')]||null;}   // 두 조각 → 완성템 key
function equipOnUnit(u,key){                                                       // 조각/아이템을 유닛에 장착
  u.items=u.items||[];
  if(COMPONENTS[key]){const loose=u.items.findIndex(it=>COMPONENTS[it]);if(loose>=0){const full=combineComponents(u.items[loose],key);if(full){u.items[loose]=full;flash('🔧 '+ITEMS[full].name+' 완성!');return true;}}}
  if(u.items.length>=3){flash('슬롯 가득(최대3)');return false;}
  u.items.push(key); return true;
}
```

---
[지시] 위 코드를 그대로 이식해라. 특히 2번(buy의 wouldCombine 예외)과 6번(combatLoop 실시간 전투)을 정확히. 수치/규칙 바꾸지 말고, 그래픽·UI 룩만 내가 준 캡처 이미지대로.
