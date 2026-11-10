"""data/faq.jsonl -> data/faq.vectors.json (Ollama bge-m3 임베딩 포함)

사용: (ollama serve 실행 중, ollama pull bge-m3) python scripts/embed.py
"""
import json
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "faq.jsonl"
OUT = ROOT / "data" / "faq.vectors.json"
OLLAMA_URL = "http://localhost:11434"
MODEL = "bge-m3"  # lib/ollama.ts 의 EMBED_MODEL 과 반드시 같아야 한다
BATCH = 16


def main() -> None:
    rows = [json.loads(l) for l in SRC.read_text(encoding="utf-8").splitlines() if l.strip()]
    # 질문 + 카테고리 + 답변 앞부분을 함께 임베딩해 검색 적중률을 높인다
    texts = [f"[{r['category']}] {r['question']}\n{r['answer'][:1500]}" for r in rows]

    vectors: list[list[float]] = []
    for i in range(0, len(texts), BATCH):
        r = requests.post(f"{OLLAMA_URL}/api/embed", json={"model": MODEL, "input": texts[i : i + BATCH]}, timeout=300)
        r.raise_for_status()
        vectors += r.json()["embeddings"]
        print(f"  {min(i + BATCH, len(texts))}/{len(texts)}")

    for r, v in zip(rows, vectors):
        r["embedding"] = [round(x, 5) for x in v]
    OUT.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    print(f"완료 -> {OUT} ({OUT.stat().st_size / 1e6:.1f}MB)")


if __name__ == "__main__":
    main()
