/** @type {import('next').NextConfig} */
const nextConfig = {
  // 벡터 데이터 파일을 서버리스 함수 번들에 포함
  outputFileTracingIncludes: { "/api/chat": ["./data/faq.vectors.json"] },
};
export default nextConfig;
