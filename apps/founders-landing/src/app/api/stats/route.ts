import { NextResponse } from 'next/server';
import { createPool, sql as vercelSql } from '@vercel/postgres';
import type { StatsResponse } from '@/types';

export const dynamic = 'force-dynamic';

// Starting offset - count starts at 832
const FOUNDER_OFFSET = 832;
const MAX_FOUNDERS = 10000;

// Lazy pool creation
function getSql() {
  const connectionString = process.env.POSTGRES_URL || process.env.founders_POSTGRES_URL;
  if (connectionString) {
    const pool = createPool({ connectionString });
    return pool.sql.bind(pool);
  }
  return vercelSql;
}

export async function GET() {
  try {
    const sql = getSql();
    // Try to get actual count from database
    const result = await sql`
      SELECT COUNT(*) as count, MAX(created_at) as last_signup
      FROM founders
    `;

    const dbCount = parseInt(result.rows[0]?.count || '0', 10);
    const response: StatsResponse = {
      totalFounders: dbCount + FOUNDER_OFFSET,
      lastSignupAt: result.rows[0]?.last_signup,
    };

    return NextResponse.json({ ...response, maxFounders: MAX_FOUNDERS });
  } catch (error) {
    // If database not set up yet, return baseline count for development
    console.error('Stats error:', error);
    return NextResponse.json({
      totalFounders: FOUNDER_OFFSET,
      maxFounders: MAX_FOUNDERS,
      lastSignupAt: null,
    });
  }
}
