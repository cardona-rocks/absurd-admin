/**
 * Servidor estático para Railway.
 *
 * Vite genera una SPA: cualquier ruta desconocida devuelve index.html para que
 * el enrutado del cliente funcione al recargar. Sin dependencias externas.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('./dist');
const PORT = Number(process.env.PORT ?? 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function sendFile(res, filePath, status = 200) {
  const body = await readFile(filePath);
  const type = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  // Los assets con hash pueden cachearse indefinidamente; el HTML nunca.
  const cache = filePath.includes('/assets/')
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': cache });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    // `normalize` + comprobación de prefijo evita salir de ./dist con "..".
    const requested = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!requested.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    try {
      const info = await stat(requested);
      if (info.isFile()) {
        await sendFile(res, requested);
        return;
      }
    } catch {
      // No existe: cae al index.html de la SPA.
    }

    await sendFile(res, join(ROOT, 'index.html'));
  } catch (err) {
    console.error(err);
    res.writeHead(500).end('Internal error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`absurd-admin sirviendo ./dist en el puerto ${PORT}`);
});
