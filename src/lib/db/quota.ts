import { getDb } from "@/lib/db";

const IMAGE_DAILY_LIMIT = 10;

export async function checkImageQuota(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const sql = getDb();
  const today = new Date().toISOString().split("T")[0];

  const [row] = await sql`
    INSERT INTO user_daily_quotas (user_id, quota_date, quota_type, daily_limit, used_count)
    VALUES (${userId}, ${today}::date, 'image', ${IMAGE_DAILY_LIMIT}, 0)
    ON CONFLICT (user_id, quota_date, quota_type)
    DO UPDATE SET updated_at = now()
    RETURNING used_count, daily_limit
  `;

  return {
    allowed: row.used_count < row.daily_limit,
    used: row.used_count,
    limit: row.daily_limit,
  };
}

export async function incrementImageQuota(userId: string): Promise<void> {
  const sql = getDb();
  const today = new Date().toISOString().split("T")[0];

  await sql`
    UPDATE user_daily_quotas
    SET used_count = used_count + 1, updated_at = now()
    WHERE user_id = ${userId} AND quota_date = ${today}::date AND quota_type = 'image'
  `;
}
