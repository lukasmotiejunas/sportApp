import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server/src/app.js';

// Vercel maps the /api folder to serverless functions and routes every
// /api/* request here (see vercel.json). Strip the /api prefix so the
// existing Express routes (/auth, /members, ...) match unchanged.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.url) {
    req.url = req.url.replace(/^\/api(?=\/|$)/, '') || '/';
  }
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
