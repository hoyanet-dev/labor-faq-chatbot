"use client";

import { useRef, useState } from "react";

type Source = { id: number; question: string; url: string };
type Msg = { role: "user" | "bot"; text: string; sources?: Source[] };

const EXAMPLES = ["실업급여 어떻게 신청해요?", "퇴직금 계산 방법 알려주세요", "최저임금 위반이면 어떻게 하나요?"];

export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const scroll = () => setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 0);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: q }, { role: "bot", text: "" }]);
    scroll();

    const update = (patch: Partial<Msg>) =>
      setMsgs((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
        return copy;
      });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const raw = res.headers.get("X-Sources");
      const sources: Source[] | undefined = raw ? JSON.parse(decodeURIComponent(raw)) : undefined;
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        update({ text, sources });
        scroll();
      }
    } catch {
      update({ text: "오류가 발생했어요. 잠시 후 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header>
        <h1>노동 FAQ 챗봇</h1>
        <p className="notice">
          고용노동부 <a href="https://www.moel.go.kr/faq/faqList.do" target="_blank" rel="noreferrer">자주하는 질문</a>을
          바탕으로 한 <b>비공식 토이 프로젝트</b>입니다. 정부 기관의 공식 서비스가 아니며, 답변은 참고용이에요. 개인정보는 입력하지 마세요.
        </p>
      </header>

      <section className="chat">
        {msgs.length === 0 && (
          <div className="examples">
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => send(e)}>{e}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.text || (busy && i === msgs.length - 1 ? "…" : "")}</div>
            {m.sources && m.sources.length > 0 && (
              <ul className="sources">
                <li className="label">출처 (고용노동부 FAQ)</li>
                {m.sources.map((s, n) => (
                  <li key={s.id}>
                    [{n + 1}]{" "}
                    <a href={s.url} target="_blank" rel="noreferrer">{s.question}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <div ref={bottom} />
      </section>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="궁금한 내용을 입력하세요"
          maxLength={300}
        />
        <button disabled={busy || !input.trim()}>전송</button>
      </form>
      <footer>출처: 고용노동부 누리집 · 개인 포트폴리오용 프로젝트</footer>
    </main>
  );
}
