#!/usr/bin/env node

/**
 * ArcGym Feedback Migration Script
 * Migrates existing ratings from data/feedback.json into Cloudflare D1 (drill_rating_stats & drill_feedback).
 *
 * Usage:
 *   npx tsx scripts/migrate-feedback-to-d1.ts          # Apply to local D1
 *   npx tsx scripts/migrate-feedback-to-d1.ts --remote # Apply to remote Cloudflare D1
 *   npx tsx scripts/migrate-feedback-to-d1.ts --sql    # Print generated SQL statements only
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { DrillFeedbackRecord, DrillRatingStats } from '../packages/drill-core/src/index.js';

const ROOT_DIR = process.cwd();
const DATA_FILE = path.join(ROOT_DIR, 'data/feedback.json');

interface FeedbackSnapshot {
  lastSyncedAt?: string;
  ratings?: Record<string, DrillRatingStats>;
  records?: Record<string, DrillFeedbackRecord[]>;
}

function escapeSqlString(val: string): string {
  return val.replace(/'/g, "''");
}

function generateRatingSql(drillId: string, stats: DrillRatingStats): string {
  const upVotes = Number(stats.upVotes) || 0;
  const downVotes = Number(stats.downVotes) || 0;
  const totalVotes = Number(stats.totalVotes) || upVotes + downVotes;
  const likePct =
    stats.likePercentage !== null && stats.likePercentage !== undefined
      ? stats.likePercentage
      : 'NULL';
  const tagCountsJson = escapeSqlString(JSON.stringify(stats.tagCounts || {}));
  const updatedAt = escapeSqlString(stats.lastUpdated || new Date().toISOString());

  return `INSERT INTO drill_rating_stats (
  drill_id, up_votes, down_votes, total_votes, like_percentage, tag_counts_json, updated_at
) VALUES (
  '${escapeSqlString(drillId)}', ${upVotes}, ${downVotes}, ${totalVotes}, ${likePct}, '${tagCountsJson}', '${updatedAt}'
) ON CONFLICT(drill_id) DO UPDATE SET
  up_votes = excluded.up_votes,
  down_votes = excluded.down_votes,
  total_votes = excluded.total_votes,
  like_percentage = excluded.like_percentage,
  tag_counts_json = excluded.tag_counts_json,
  updated_at = excluded.updated_at;`;
}

function generateRecordSql(drillId: string, rec: DrillFeedbackRecord): string {
  const id = escapeSqlString(rec.id);
  const rating = escapeSqlString(rec.rating);
  const tagsJson = escapeSqlString(JSON.stringify(rec.tags || []));
  const submittedAt = escapeSqlString(rec.submittedAt || new Date().toISOString());
  const dedupToken = escapeSqlString(`legacy_${id}`);

  return `INSERT INTO drill_feedback (
  id, drill_id, rating, tags_json, learner_id, dedup_token, created_at
) VALUES (
  '${id}', '${escapeSqlString(drillId)}', '${rating}', '${tagsJson}', NULL, '${dedupToken}', '${submittedAt}'
) ON CONFLICT(drill_id, dedup_token) DO NOTHING;`;
}

function generateSql(snapshot: FeedbackSnapshot): string[] {
  const statements: string[] = [];

  const ratings = snapshot.ratings || {};
  for (const [drillId, stats] of Object.entries(ratings)) {
    statements.push(generateRatingSql(drillId, stats));
  }

  const recordsMap = snapshot.records || {};
  for (const [drillId, records] of Object.entries(recordsMap)) {
    if (!Array.isArray(records)) continue;
    for (const rec of records) {
      statements.push(generateRecordSql(drillId, rec));
    }
  }

  return statements;
}

function main() {
  const args = process.argv.slice(2);
  const isRemote = args.includes('--remote');
  const isSqlOnly = args.includes('--sql');

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`Feedback snapshot not found at: ${DATA_FILE}`);
    process.exit(1);
  }

  let snapshot: FeedbackSnapshot;
  try {
    snapshot = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e: unknown) {
    console.error('Failed to parse feedback.json', e);
    process.exit(1);
  }

  const statements = generateSql(snapshot);
  if (statements.length === 0) {
    console.log('No feedback records found to migrate.');
    return;
  }

  if (isSqlOnly) {
    console.log(statements.join('\n\n'));
    return;
  }

  const targetEnv = isRemote ? 'remote Cloudflare D1' : 'local D1';
  console.log(`Backfilling ${statements.length} feedback statement(s) into ${targetEnv}...`);

  const tmpFile = path.join(os.tmpdir(), `arcgym-feedback-migrate-${Date.now()}.sql`);
  fs.writeFileSync(tmpFile, statements.join('\n'), 'utf-8');

  try {
    const flag = isRemote ? '--remote' : '--local';
    execSync(
      `pnpm --filter @arcgym/web exec wrangler d1 execute arcgym-d1 ${flag} --file=${JSON.stringify(tmpFile)}`,
      { stdio: 'inherit', cwd: ROOT_DIR },
    );
    console.log(`Successfully migrated feedback into ${targetEnv}.`);
  } finally {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
}

main();
