import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { registerGameHandlers } from './lib/game-server.js';

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT) || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });
  const io = new Server(server, {
    path: '/api/socket',
    cors: { origin: '*' },
  });
  registerGameHandlers(io);
  server.listen(port, () => {
    console.log(`> Bonepile ready on http://localhost:${port}`);
  });
});
