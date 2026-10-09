import { preview } from 'vite';
import { resolve } from 'node:path';
process.chdir(resolve('apps/admin'));
const port = Number(process.env.FRONTEND_ADMIN_PREVIEW_PORT ?? 4324);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid preview port');
await preview({ preview: { host: '127.0.0.1', port, strictPort: true } });
