/**
 * Simple HTTP server for serving the client
 */

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  let filePath = join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);

  try {
    const content = await readFile(filePath);
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(500);
      res.end('Server Error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Client server running at http://localhost:${PORT}`);
  console.log(`📝 Open http://localhost:${PORT}/?thread=test123 to start`);
});
