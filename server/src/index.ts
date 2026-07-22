import app from './app.js';

// Local development entry point. On Vercel the app is used as a serverless
// function handler (see api/index.ts) and this listener is never invoked.
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
