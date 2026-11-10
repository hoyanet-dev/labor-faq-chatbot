import faqs from "@/data/faq.vectors.json";
import { embed } from "@/lib/ollama";

export type Faq = {
  id: number;
  category: string;
  question: string;
  answer: string;
  url: string;
  embedding: number[];
};

const DATA = faqs as Faq[];

function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(a: number[]) {
  return Math.sqrt(dot(a, a));
}

export async function searchFaq(query: string, k = 4) {
  const q = await embed(query);
  const qn = norm(q);
  return DATA.map((f) => ({
    faq: f,
    score: dot(q, f.embedding) / (qn * norm(f.embedding)),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
