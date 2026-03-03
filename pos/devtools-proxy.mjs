import http from 'node:http';

const TARGET_BASE = process.env.EXPO_DEVTOOLS_TARGET ?? 'http://127.0.0.1:8081/_expo';

const server = http.createServer((req, res) => {
  const suffix = req.url && req.url !== '/' ? req.url : '';
  const location = `${TARGET_BASE}${suffix}`;
  res.writeHead(302, {
    Location: location,
    'Cache-Control': 'no-store',
  });
  res.end();
});

const PORT = Number(process.env.EXPO_DEVTOOLS_PORT ?? 19002);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[devtools-proxy] Forwarding http://localhost:${PORT} -> ${TARGET_BASE}`);
});
