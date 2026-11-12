import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const backendOrigin = env.VITE_BACKEND_ORIGIN || 'http://localhost:8080';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
          configure(proxy) {
            proxy.on('error', (error, _request, response) => {
              console.error(`[HRIS] API proxy failed (${backendOrigin}): ${error.message}`);
              if ('writeHead' in response && !response.headersSent) {
                response.writeHead(502, {
                  'Content-Type': 'application/json; charset=utf-8',
                });
                response.end(JSON.stringify({
                  error: {
                    code: 'BACKEND_UNREACHABLE',
                    message: '백엔드 서버에 연결하지 못했습니다. Flask 실행 상태와 .env의 VITE_BACKEND_ORIGIN을 확인하세요.',
                  },
                }));
              }
            });
          },
        },
      },
    },
  };
});
