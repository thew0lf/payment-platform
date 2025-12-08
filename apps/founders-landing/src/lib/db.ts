import { createPool, sql as vercelSql } from '@vercel/postgres';
import { Founder, Referral } from '@/types';
import { formatFounderNumber } from './utils';

// Lazy pool creation for prefixed env var
let _pool: ReturnType<typeof createPool> | null = null;
function getPool() {
  if (!_pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.founders_POSTGRES_URL;
    if (connectionString) {
      _pool = createPool({ connectionString });
    }
  }
  return _pool;
}

// Use pool.sql if available, otherwise fall back to vercelSql
async function sql(strings: TemplateStringsArray, ...values: any[]) {
  const pool = getPool();
  if (pool) {
    return pool.sql(strings, ...values);
  }
  return vercelSql(strings, ...values);
}

// Initialize database tables
export async function initDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS founders (
      id SERIAL PRIMARY KEY,
      founder_number VARCHAR(8) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20),
      base_position INT NOT NULL,
      current_position INT NOT NULL,
      referral_code VARCHAR(8) UNIQUE NOT NULL,
      referred_by VARCHAR(8),
      referral_count INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      email_verified BOOLEAN DEFAULT FALSE,
      phone_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      referrer_id INT REFERENCES founders(id),
      referred_id INT REFERENCES founders(id),
      position_boost INT DEFAULT 10,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      id SERIAL PRIMARY KEY,
      founder_id INT REFERENCES founders(id),
      token VARCHAR(64) UNIQUE NOT NULL,
      type VARCHAR(20) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Create indexes if they don't exist
  await sql`CREATE INDEX IF NOT EXISTS idx_founders_email ON founders(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_founders_referral_code ON founders(referral_code)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_founders_current_position ON founders(current_position)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token)`;
}

// Starting founder number offset
export const FOUNDER_OFFSET = 832; // Start count at 832

// Get total founder count (includes offset for display)
export async function getFounderCount(): Promise<number> {
  const result = await sql`SELECT COUNT(*) as count FROM founders`;
  return parseInt(result.rows[0].count, 10) + FOUNDER_OFFSET;
}

// Get founder by email
export async function getFounderByEmail(email: string): Promise<Founder | null> {
  const result = await sql`SELECT * FROM founders WHERE email = ${email}`;
  return result.rows[0] ? mapRowToFounder(result.rows[0]) : null;
}

// Get founder by referral code
export async function getFounderByReferralCode(code: string): Promise<Founder | null> {
  const result = await sql`SELECT * FROM founders WHERE referral_code = ${code}`;
  return result.rows[0] ? mapRowToFounder(result.rows[0]) : null;
}

// Get founder by founder number
export async function getFounderByNumber(founderNumber: string): Promise<Founder | null> {
  const result = await sql`SELECT * FROM founders WHERE founder_number = ${founderNumber}`;
  return result.rows[0] ? mapRowToFounder(result.rows[0]) : null;
}

// Create new founder
export async function createFounder(data: {
  email: string;
  phone?: string;
  referredBy?: string;
  metadata?: Record<string, unknown>;
}): Promise<Founder> {
  // Get next position (actual DB count + offset + 1)
  const countResult = await sql`SELECT COUNT(*) as count FROM founders`;
  const dbCount = parseInt(countResult.rows[0].count, 10);
  const position = dbCount + FOUNDER_OFFSET + 1;
  const founderNumber = formatFounderNumber(position);

  const result = await sql`
    INSERT INTO founders (
      founder_number, email, phone, base_position, current_position,
      referral_code, referred_by, metadata
    ) VALUES (
      ${founderNumber}, ${data.email}, ${data.phone || null}, ${position}, ${position},
      ${founderNumber}, ${data.referredBy || null}, ${JSON.stringify(data.metadata || {})}
    )
    RETURNING *
  `;

  return mapRowToFounder(result.rows[0]);
}

// Process referral
export async function processReferral(referrerCode: string, newFounderId: number): Promise<void> {
  const referrer = await getFounderByReferralCode(referrerCode);
  if (!referrer) return;

  // Boost referrer's position by 10 (lower is better)
  const newPosition = Math.max(1, referrer.currentPosition - 10);

  await sql`
    UPDATE founders
    SET current_position = ${newPosition},
        referral_count = referral_count + 1,
        updated_at = NOW()
    WHERE id = ${referrer.id}
  `;

  // Record the referral
  await sql`
    INSERT INTO referrals (referrer_id, referred_id, position_boost)
    VALUES (${referrer.id}, ${newFounderId}, 10)
  `;
}

// Get founder's position info
export async function getPositionInfo(founderNumber: string): Promise<{
  currentPosition: number;
  totalFounders: number;
  referralCount: number;
} | null> {
  const founder = await getFounderByNumber(founderNumber);
  if (!founder) return null;

  const total = await getFounderCount();
  return {
    currentPosition: founder.currentPosition,
    totalFounders: total,
    referralCount: founder.referralCount,
  };
}

// Map database row to Founder type
function mapRowToFounder(row: any): Founder {
  return {
    id: row.id,
    founderNumber: row.founder_number,
    email: row.email,
    phone: row.phone,
    basePosition: row.base_position,
    currentPosition: row.current_position,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    referralCount: row.referral_count,
    status: row.status,
    emailVerified: row.email_verified,
    phoneVerified: row.phone_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata,
  };
}

// Generate a random token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Create verification token
export async function createVerificationToken(
  founderId: number,
  type: 'email' | 'phone'
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await sql`
    INSERT INTO verification_tokens (founder_id, token, type, expires_at)
    VALUES (${founderId}, ${token}, ${type}, ${expiresAt})
  `;

  return token;
}

// Verify token and mark as used
export async function verifyToken(
  token: string,
  type: 'email' | 'phone'
): Promise<{ success: boolean; founderId?: number; error?: string }> {
  const result = await sql`
    SELECT * FROM verification_tokens
    WHERE token = ${token} AND type = ${type}
  `;

  if (!result.rows[0]) {
    return { success: false, error: 'Invalid verification link' };
  }

  const tokenRecord = result.rows[0];

  if (tokenRecord.used_at) {
    return { success: false, error: 'This link has already been used' };
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return { success: false, error: 'This link has expired' };
  }

  // Mark token as used
  await sql`
    UPDATE verification_tokens
    SET used_at = NOW()
    WHERE id = ${tokenRecord.id}
  `;

  // Update founder verification status
  if (type === 'email') {
    await sql`
      UPDATE founders
      SET email_verified = TRUE, updated_at = NOW()
      WHERE id = ${tokenRecord.founder_id}
    `;
  } else if (type === 'phone') {
    await sql`
      UPDATE founders
      SET phone_verified = TRUE, updated_at = NOW()
      WHERE id = ${tokenRecord.founder_id}
    `;
  }

  return { success: true, founderId: tokenRecord.founder_id };
}

// Get founder by ID
export async function getFounderById(id: number): Promise<Founder | null> {
  const result = await sql`SELECT * FROM founders WHERE id = ${id}`;
  return result.rows[0] ? mapRowToFounder(result.rows[0]) : null;
}
