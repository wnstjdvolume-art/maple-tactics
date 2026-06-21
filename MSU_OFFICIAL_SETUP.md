# 🔗 MSU 공식 자산 연동 셋업 (Official Route)

> 로컬 프로토타입의 임시 스프라이트(maplestory.io, 비공식)를 **MSU 공식 자산**으로 교체하고,
> 최종 출품을 Verse8(Synergy App)에서 진행하기 위한 공식 경로 정리.
> (출처: docs.msu.io — MSU Open API / MSU Resources)

---

## 0. 결론 한 줄
**MSU "리소스 MCP"가 실제로 존재한다.** HTTP MCP 서버 하나 + 빌더 API 키만 있으면,
Claude Code(나)와 Verse8 양쪽에서 공식 메이플 자산을 검색·미리보기·추출할 수 있다.

---

## 1. 여러분이 해야 할 일 (제가 대신 못 하는 부분)
1. **빌더 가입 & API 키 발급**
   - https://msu.io/builder → 가입 → API Access Application 신청
   - 키 형식: `x-nxopen-api-key: gw_xxxxxxxxxxxxxxxx`
   - (키 발급은 순차 배포. 높은 한도 필요 시 contact_builder@nexpace.io)
2. 발급된 **API 키를 저에게 알려주기** → 그 다음은 제가 처리

> ⚠️ 라이선스: 공식 자산은 **MSU 생태계의 Synergy App 개발용으로만** 사용 가능.
> 재배포·재호스팅·CDN 링크 외부 공유·AI 학습 사용 **금지**. (우리 게임=Synergy App이라 OK)

---

## 2. 제가 할 일 (API 키 받으면 즉시)
1. **Claude Code에 MSU 리소스 MCP 연결** — 아래 설정을 settings.json에 추가
2. MCP의 리소스 검색 도구로 **직업/몬스터/보스 공식 자산 CDN 링크** 조회
3. 프로토타입 `getSprite()`가 그 CDN 링크(또는 내려받은 스프라이트시트)를 쓰도록 연결
4. **Verse8용 동일 MCP 설정** 제공 → 출품 환경에서도 같은 자산 사용

---

## 3. MCP 서버 설정 (검증된 공식 값)

**서버 URL**: `https://openapi.msu.io/v1rc1/resource/mcp` (HTTP 타입)
**인증 헤더**: `x-nxopen-api-key: <YOUR_API_KEY>`

### Claude Code / Cursor / Verse8 공통 MCP 설정
```json
{
  "mcpServers": {
    "maple-lookup": {
      "type": "http",
      "url": "https://openapi.msu.io/v1rc1/resource/mcp",
      "headers": {
        "x-nxopen-api-key": "YOUR_API_KEY"
      }
    }
  }
}
```

---

## 4. MSU Open API (자산 메타데이터 — 보조 용도)
- Base URL: `https://openapi.msu.io`
- 인증: 동일 헤더 `x-nxopen-api-key`
- GameMeta 엔드포인트(데이터용): 아이템/아이템셋/아이템카테고리/스킬/퀘스트/V매트릭스 메타
  - 예: `GET /v1rc1/gamemeta/items/{itemId}`
- Rate limit 기본: 2 req/s, 3,000/day (레벨업 시 상향)
- ※ 실제 **그림/스프라이트**는 GameMeta가 아니라 **Resource Search(스프라이트시트 Export / CDN 링크)** 로 받음.

---

## 5. 리소스 검색(Resource Search) 사용법
- 사이트: https://resource-search.msu.io/search (빌더 로그인 필요, SPA)
- 수만 개의 몬스터/NPC/아이템/스킬/배경 자산 검색·애니메이션 미리보기
- **Export 방법 2가지**: ① 스프라이트시트 다운로드 ② CDN 링크 복사(외부 프로젝트 참조용)
- MCP를 붙이면 위 검색/조회를 **대화로(=내가 직접)** 할 수 있음

---

## 6. 키 보관 (프로젝트 규칙)
- 스크립트용으로 `.env` 에 `MSU_API_KEY=gw_...` 저장 (시스템 환경변수 X)
- MCP 설정 파일에도 같은 값 사용. **git/저장소에 커밋 금지**, 노출 시 즉시 재발급.
