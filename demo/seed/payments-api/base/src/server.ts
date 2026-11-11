import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 8080);

createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200).end('ok');
    return;
  }
  res.writeHead(404).end();
}).listen(port);
