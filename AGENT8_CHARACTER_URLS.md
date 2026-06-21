# 캐릭터/몬스터 스프라이트 불러오는 법 (설명 + 실제 코드)

## 왜 캐릭터가 안 떴나 (자연어)
메이플 캐릭터는 단일 이미지가 아니라 "스킨 + 헤어 + 얼굴 + 장비"를 합성한 그림이라, **합성 URL을 정확히 만들어야** 불러진다. DeepSeek가 그 URL 포맷을 몰라서 캐릭터를 못 가져온 것이다. 아래 코드가 그 정확한 URL을 만들어 준다. 이미지는 `<img>` 또는 canvas `drawImage`로 그 URL을 쓰면 바로 나온다. (curl/다운로드 필요 없음 — 그냥 이미지 주소다)

## 실제 코드 — 이걸 그대로 넣어라
```javascript
// 1) 메이플 캐릭터 합성 스프라이트 URL 생성 (maplestory.io 공개 이미지 API, 인증 불필요)
//    핵심 포맷: 각 아이템을 {"itemId":X,"region":"GMS","version":"255"} 객체로 만들어 콤마로 잇는다.
function charUrl(itemIds, anim = 'stand1', frame = 0){
  const parts = itemIds.map(id => encodeURIComponent(JSON.stringify({ itemId: id, region: 'GMS', version: '255' })));
  return `https://maplestory.io/api/character/${parts.join(',')}/${anim}/${frame}`;
}

// 2) 직업별 외형: 계열=헤어/무기, 코스트=옷(점점 더 입음)
const HAIR    = { warrior:30030, mage:33000, archer:30150, thief:30240, pirate:30060 };
const OVERALL = { 1:1050009, 2:1050021, 3:1050053, 4:1050061, 5:1050097 };  // 코스트별 옷(1코 평범→5코 에픽)
const JOB_LOOK = { // key: [계열, 무기itemId]
  swordman:['warrior',1302000], magician:['mage',1372000], archer1:['archer',1452000], rogue:['thief',1332000], pirate1:['pirate',1492000],
  page:['warrior',1302000], wizard:['mage',1372000], hunter:['archer',1452000], assassin:['thief',1472000], brawler:['pirate',1482000],
  knight:['warrior',1302000], priest:['mage',1372000], ranger:['archer',1452000], hermit:['thief',1332000],
  hero:['warrior',1402000], bishop:['mage',1372000], bowmaster:['archer',1452000], nightlord:['thief',1472000],
  darkknight:['warrior',1442000], archmage:['mage',1372000], viper:['pirate',1482000],
};
// 직업 캐릭터 스프라이트 URL (base = 스킨2000 + 머리12000 + 얼굴21744 + 헤어 + 옷 + 무기)
function jobSpriteUrl(key){
  const [cls, weapon] = JOB_LOOK[key];
  const cost = UNITS[key].cost;
  return charUrl([2000, 12000, 21744, HAIR[cls], OVERALL[cost], weapon]);
}

// 3) 몬스터/보스 스프라이트 URL (mob id 하나로 끝)
const MOB_ID = {
  snail:100000, omush:100004, pig:1210101, boar:2230102, stump:100005, bmush:2220100,
  necki:2130103, eye:3230100, zombie:2230101, yeti:6300000, drake:2600224, griffey:2600007,
  mushmom:2600208, zakum:8800000, horntail:8810018, balrog:6400006,
};
function mobSpriteUrl(key){ return `https://maplestory.io/api/GMS/255/mob/${MOB_ID[key]}/render/stand`; }

// 4) 사용 예시 — 캐릭터를 화면에 그리기
//   (A) HTML/React: <img src={jobSpriteUrl('swordman')} crossOrigin="anonymous" />
//   (B) Canvas:
function loadSprite(url){ const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url; return img; }
// 유닛 렌더 시: const img = loadSprite(jobSpriteUrl(unit.key)); ctx.drawImage(img, x - img.width/2, y - img.height, img.width, img.height);
// (이미지 로드는 비동기라, onload 후 다시 그리거나 캐시해 둔다)
```

## 동작 확인용 실제 URL 예시 (브라우저에 그대로 넣으면 캐릭터 보임)
- 검사(1코): charUrl([2000,12000,21744,30030,1050009,1302000])
- 아크메이지(5코): charUrl([2000,12000,21744,33000,1050097,1372000])
- 주황버섯: https://maplestory.io/api/GMS/255/mob/100004/render/stand
- 자쿰: https://maplestory.io/api/GMS/255/mob/8800000/render/stand

## 중요 (자연어)
- 이미지 로드는 **비동기**다. `img.onload`에서 다시 렌더하거나, 시작 시 모든 스프라이트를 미리 로드해 캐시해라(매 프레임 new Image() 금지).
- canvas에 그릴 땐 `img.crossOrigin='anonymous'` 를 꼭 설정해라(maplestory.io는 CORS 허용).
- 이건 **maplestory.io(커뮤니티 공개 API)** 라 "지금 바로 캐릭터를 띄워 테스트"하는 용도다.
- **최종 MSU 제출용 공식 에셋**은 Agent8 상단 **Resource 탭**에서 MSU 공식 메이플 캐릭터/몬스터를 검색·추가해 그 리소스를 쓰는 게 정식이다. 일단 위 URL로 동작시키고, 제출 직전 Resource 탭의 공식 에셋으로 교체하면 된다.

---
[지시] 위 charUrl / jobSpriteUrl / mobSpriteUrl 코드를 그대로 넣고, 각 유닛/몬스터를 해당 URL 이미지로 렌더해라. 이미지는 미리 로드해 캐시하고 canvas는 crossOrigin='anonymous'로. 이러면 캐릭터/몬스터가 화면에 바로 나온다.
