// Vercel Function: /api/v1/* 요청을 백엔드(Flask)로 그대로 전달하는 프록시
// - 브라우저는 Vercel 도메인(HTTPS)만 상대하므로 혼합 콘텐츠 차단, CORS, 쿠키 도메인 문제가 없음
// - 백엔드 주소는 Vercel 환경 변수 BACKEND_ORIGIN (예: http://서버주소:8080). 저장소에는 넣지 않음
// - vercel.json이 /api/v1/:path* 를 /api/proxy?__p=:path* 로 보냄
const HOP_BY_HOP = ['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'te', 'trailer', 'host', 'content-length', 'accept-encoding'];

function errorResponse(status, code, message) {
  return new Response(JSON.stringify({error: {code, message}}), {
    status,
    headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'},
  });
}

export async function proxy(request) {
  const origin = (process.env.BACKEND_ORIGIN || '').trim().replace(/\/+$/, '');
  if (!origin) return errorResponse(503, 'BACKEND_NOT_CONFIGURED', '백엔드 주소(BACKEND_ORIGIN)가 설정되지 않았습니다.');

  const url = new URL(request.url);
  const path = (url.searchParams.get('__p') || '').replace(/^\/+/, '');
  url.searchParams.delete('__p');
  if (path.split('/').some((segment) => segment === '..')) return errorResponse(400, 'INVALID_PATH', '잘못된 요청 경로입니다.');
  const target = `${origin}/api/v1/${path}${url.search}`;

  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP) headers.delete(name);
  headers.set('X-Forwarded-Proto', 'https');
  headers.set('X-Forwarded-Host', url.host);

  const init = {method: request.method, headers, redirect: 'manual'};
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.arrayBuffer();

  let upstream;
  try {
    upstream = await fetch(target, {...init, signal: AbortSignal.timeout(55_000)});
  } catch (error) {
    const timedOut = error && error.name === 'TimeoutError';
    return errorResponse(timedOut ? 504 : 502, 'BACKEND_UNREACHABLE', timedOut ? '백엔드 응답 시간이 초과되었습니다.' : '백엔드 서버에 연결하지 못했습니다.');
  }

  // fetch가 압축을 이미 풀었으므로 길이, 인코딩 헤더는 버림. Set-Cookie는 여러 개여도 그대로 전달됨
  const out = new Headers(upstream.headers);
  for (const name of ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']) out.delete(name);
  return new Response(request.method === 'HEAD' ? null : upstream.body, {status: upstream.status, statusText: upstream.statusText, headers: out});
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
