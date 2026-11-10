// Ollama HTTP API 클라이언트. 서버로 옮길 때는 OLLAMA_URL 만 바꾸면 된다.
export const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
export const EMBED_MODEL = process.env.EMBED_MODEL ?? "bge-m3";
export const CHAT_MODEL = process.env.CHAT_MODEL ?? "gemma4";

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`Ollama embed ${res.status}`);
  return (await res.json()).embeddings[0];
}

/** 토큰 단위로 텍스트 조각을 내보내는 async generator */
export async function* chatStream(system: string, user: string): AsyncGenerator<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      stream: true,
      think: false, // 추론(thinking) 모드를 끄지 않으면 첫 글자까지 수십 초 걸린다
      keep_alive: process.env.KEEP_ALIVE ?? "2m", // 기본은 짧게(메모리 절약). 전용 서버에선 "30m" 등으로 늘리면 콜드스타트가 사라진다
      options: { temperature: 0.2, num_predict: 600, num_ctx: 4096 },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Ollama chat ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const chunk = JSON.parse(line);
      if (chunk.message?.content) yield chunk.message.content;
    }
  }
}
