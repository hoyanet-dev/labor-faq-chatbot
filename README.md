# 노동 FAQ 챗봇 (비공식)

고용노동부 [자주하는 질문(FAQ)](https://www.moel.go.kr/faq/faqList.do)을 수집해 임베딩 검색으로 답하는 챗봇입니다.

> **정부 기관의 공식 서비스가 아닙니다.** 개인 학습용 토이 프로젝트이며 답변은 참고용입니다. 개인정보는 입력하지 마세요.
> 이 프로젝트는 AI 도구를 활용해 개발했습니다.

## 동작 방식

```
scripts/crawl.py  → data/faq.jsonl           FAQ 수집 (약 216건, 요청 간 0.7초 간격)
scripts/embed.py  → data/faq.vectors.json    Ollama bge-m3 로 임베딩
app/api/chat      → 질문 임베딩 → 코사인 유사도 상위 4건 → 채팅 모델이 근거 기반으로 답변(스트리밍) + 출처 링크
app/page.tsx      → 채팅 UI (비공식 안내, 출처 링크, 개인정보 주의 문구)
lib/ollama.ts     → OLLAMA_URL / EMBED_MODEL / CHAT_MODEL 환경 변수
```

- 유사도 기준(`MIN_SCORE = 0.45`)에 못 미치면 모델을 호출하지 않고 "관련 FAQ를 찾지 못했다"와 상담센터(1350) 안내를 돌려줍니다.
- 검색된 FAQ만 근거로 답하도록 시스템 프롬프트를 구성했고, FAQ 본문 안의 지시문은 따르지 않게 해 프롬프트 인젝션에 대비했습니다.
- 응답은 토큰 단위로 스트리밍하고, IP별 분당 8회 요청 제한과 질문 길이(300자) 제한이 있습니다.
- LLM과 임베딩은 모두 로컬 [Ollama](https://ollama.com)로 처리하므로 질문이 외부 API로 나가지 않습니다.

## 실행 방법

크롤링한 FAQ 데이터(`data/`)는 정부 사이트의 콘텐츠라 **저장소에 포함하지 않았습니다.** 아래 순서로 직접 만들어야 앱이 실행됩니다.

### 1. Ollama 준비
```bash
ollama pull bge-m3      # 임베딩 모델 (scripts/embed.py 와 EMBED_MODEL 이 같아야 합니다)
ollama pull gemma4      # 채팅 모델 (CHAT_MODEL 환경 변수로 바꿀 수 있습니다)
ollama serve            # 이미 실행 중이면 생략
```

### 2. 데이터 생성 (Python)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/crawl.py   # → data/faq.jsonl
python scripts/embed.py   # → data/faq.vectors.json (Ollama 실행 중이어야 함)
```
크롤링 전에 대상 사이트의 [저작권정책](https://www.moel.go.kr)과 `robots.txt`를 직접 확인하세요.

### 3. 앱 실행
```bash
cp .env.example .env.local   # 필요하면 수정
npm install
npm run dev                  # http://localhost:3000
```

## 설정

| 환경 변수 | 기본값 | 설명 |
|---|---|---|
| `OLLAMA_URL` | `http://localhost:11434` | 서버로 옮길 때는 이 값만 바꾸면 됩니다 |
| `EMBED_MODEL` | `bge-m3` | 임베딩 모델 |
| `CHAT_MODEL` | `gemma4` | 채팅 모델 |
| `KEEP_ALIVE` | `2m` | 모델을 메모리에 유지하는 시간. 개발 PC에서는 짧게, 전용 서버에서는 `30m` 등으로 늘리세요 |

## 개발하면서 내린 판단

- **외부 LLM API 대신 직접 운영하는 LLM 서버(Ollama)를 선택했습니다.** 처음에는 Vercel + Claude·Voyage API 구조였지만, 스터디 목적에 맞게 임베딩과 답변 생성을 모두 로컬 모델로 바꿨습니다. 그래서 Vercel 같은 서버리스에는 올릴 수 없고, Ollama를 설치한 서버로 옮기는 것을 전제로 합니다.
- **출처와 "비공식"을 화면에 명시했고, 기관명을 서비스 이름에 쓰지 않았습니다.**
- **느린 응답은 측정해서 원인을 찾았습니다.** 검색은 밀리초였고 병목은 LLM 추론이었습니다. 추론(thinking) 모드를 끄고(`think: false`) 답변 길이와 컨텍스트(4096)를 제한해 첫 글자까지 약 24초에서 2~8초로 줄였습니다. (다른 작업으로 메모리가 부족했던 환경에서 잰 값입니다.)
- **모델이 메모리를 오래 잡는 문제를 줄였습니다.** `keep_alive`를 30분에서 2분으로 줄이고, 전용 서버에서는 환경 변수로 늘릴 수 있게 했습니다.

## 한계

- 유사도 기준(0.45)은 임의로 정한 값이고, 답변 품질을 숫자로 평가하지는 않았습니다. 질문과 정답 FAQ를 직접 라벨링한 평가 세트로 검색 적중률을 재는 것이 다음 단계입니다.
- 데이터는 한 번 수집한 뒤 갱신하지 않았습니다.
- 인메모리 요청 제한은 서버가 여러 대이거나 재시작되면 초기화됩니다.
- 현재는 로컬에서만 실행했고 공개 배포는 하지 않았습니다.

## 라이선스

[MIT](LICENSE) — 이 라이선스는 **이 저장소의 코드**에만 적용됩니다. 크롤링으로 수집하는 고용노동부 FAQ 콘텐츠는 해당 기관의 저작권정책을 따릅니다.
