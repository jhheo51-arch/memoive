declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    UPLOADS: R2Bucket;
    ADMIN_INITIAL_PASSWORD: string;
    ADMIN_SESSION_SECRET: string;
  }
}
