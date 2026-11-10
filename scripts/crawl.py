"""고용노동부 자주하는 질문(FAQ) 크롤러 -> data/faq.jsonl

사용: python scripts/crawl.py
"""
import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://www.moel.go.kr"
LIST_URL = f"{BASE}/faq/faqList.do"
VIEW_URL = f"{BASE}/faq/faqView.do"
DELAY = 0.7  # 서버 부담을 줄이기 위한 요청 간 대기(초)
OUT = Path(__file__).resolve().parent.parent / "data" / "faq.jsonl"

session = requests.Session()
session.headers["User-Agent"] = "Mozilla/5.0 (study-project faq-chatbot crawler)"


def get(url: str, **params) -> BeautifulSoup:
    r = session.get(url, params=params, timeout=20)
    r.raise_for_status()
    time.sleep(DELAY)
    return BeautifulSoup(r.text, "html.parser")


def last_page(soup: BeautifulSoup) -> int:
    a = soup.select_one("a.arr.last")
    m = re.search(r"pageIndex=(\d+)", a["href"]) if a else None
    return int(m.group(1)) if m else 1


def list_ids(soup: BeautifulSoup) -> list[tuple[str, str]]:
    items = []
    for a in soup.select("td.txt_left a[href*='faqView.do']"):
        m = re.search(r"seqRepeat=(\d+)", a["href"])
        if m:
            items.append((m.group(1), a.get_text(strip=True)))
    return items


def parse_view(seq: str) -> dict:
    soup = get(VIEW_URL, seqRepeat=seq)
    fields = {}
    for dl in soup.select("div.b_info dl"):
        dt, dd = dl.find("dt"), dl.find("dd")
        if dt and dd:
            for br in dd.find_all("br"):
                br.replace_with("\n")
            text = re.sub(r"[ \t]+", " ", dd.get_text())
            fields[dt.get_text(strip=True)] = re.sub(r"\n{3,}", "\n\n", text).strip()
    return {
        "id": int(seq),
        "category": fields.get("카테고리", ""),
        "question": fields.get("질의", ""),
        "answer": fields.get("답변", ""),
        "url": f"{VIEW_URL}?seqRepeat={seq}",
    }


def main() -> None:
    first = get(LIST_URL, pageIndex=1)
    pages = last_page(first)
    print(f"총 {pages} 페이지")

    ids: dict[str, str] = {}
    for p in range(1, pages + 1):
        soup = first if p == 1 else get(LIST_URL, pageIndex=p)
        for seq, title in list_ids(soup):
            ids[seq] = title
        print(f"  목록 {p}/{pages} (누적 {len(ids)}건)")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    ok = 0
    with OUT.open("w", encoding="utf-8") as f:
        for i, seq in enumerate(ids, 1):
            try:
                row = parse_view(seq)
            except Exception as e:  # 한 건 실패로 전체를 멈추지 않는다
                print(f"  ! seq={seq} 실패: {e}")
                continue
            if not row["question"] or not row["answer"]:
                print(f"  ! seq={seq} 내용 비어있음, 건너뜀")
                continue
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            ok += 1
            if i % 20 == 0:
                print(f"  상세 {i}/{len(ids)}")
    print(f"완료: {ok}건 -> {OUT}")


if __name__ == "__main__":
    main()
