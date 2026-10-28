import app from './app';
import { setupDatabase } from './config/bootstrap';
import { pool } from './config/database';
import { env } from './config/env';

const start = async () => {
  if (env.DB_AUTO_SETUP) await setupDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;

    // Last resort: never hang. (The dev watcher gives up after 5s.)
    setTimeout(() => process.exit(1), 4000).unref();

    // server.close() waits for every connection to end, and browsers keep idle connections open.
    server.close(async () => {
      await pool.end().catch(() => undefined);
      process.exit(0);
    });
    server.closeIdleConnections();
    // Give in-flight requests (uploads, video) a moment, then drop whatever is left
    setTimeout(() => server.closeAllConnections(), 2000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
