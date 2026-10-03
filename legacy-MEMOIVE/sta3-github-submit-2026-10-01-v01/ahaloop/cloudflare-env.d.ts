declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    AHALOOP_OPERATOR_USER_IDS?: string;
  }
}
