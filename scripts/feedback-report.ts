#!/usr/bin/env node

/**
 * ArcGym Drill Feedback Triage CLI
 *
 * Inspects and summarizes learner ratings and multiselect pill tags across published drills from Cloudflare D1.
 *
 * Usage:
 *   pnpm feedback:report                  # Summary table of all drill ratings
 *   pnpm feedback:report --drill AGD-00101 # Detail view for a specific drill
 *   pnpm feedback:pull                   # Snapshot remote D1 to data/feedback.json
 *   pnpm feedback:pull --local           # Snapshot local D1 to data/feedback.json
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  calculateRatingStats,
  DRILL_DISLIKED_TAG_LABELS,
  DRILL_LIKED_TAG_LABELS,
  type DrillFeedbackRecord,
  type DrillRatingStats,
  LEGACY_TAG_ALIASES,
} from '../packages/drill-core/src/index.js';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

interface FeedbackSnapshot {
  lastSyncedAt: string;
  ratings: Record<string, DrillRatingStats>;
  records: Record<string, DrillFeedbackRecord[]>;
}

interface D1RatingStatsRow {
  drill_id: string;
  up_votes: number;
  down_votes: number;
  total_votes: number;
  like_percentage: number | null;
  tag_counts_json: string;
  updated_at: string;
}

interface D1FeedbackRow {
  id: string;
  drill_id: string;
  rating: string;
  tags_json: string;
  learner_id: string | null;
  created_at: string;
}

function loadLocalFeedback(): FeedbackSnapshot {
  if (fs.existsSync(FEEDBACK_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
    } catch {
      // Fall through to empty
    }
  }
  return {
    lastSyncedAt: new Date().toISOString(),
    ratings: {},
    records: {},
  };
}

function saveLocalFeedback(snapshot: FeedbackSnapshot) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(snapshot, null, 2), 'utf-8');
}

/**
 * Pulls ratings and recent feedback records directly from Cloudflare D1 using Wrangler.
 */
function pullFromCloudflare(useLocal = false): FeedbackSnapshot {
  const envLabel = useLocal ? 'local D1' : 'Cloudflare D1 (remote)';
  console.log(`Connecting to ${envLabel} to sync drill feedback...`);

  const snapshot: FeedbackSnapshot = {
    lastSyncedAt: new Date().toISOString(),
    ratings: {},
    records: {},
  };

  const flag = useLocal ? '--local' : '--remote';

  try {
    const rawRatings = execSync(
      `pnpm --filter @arcgym/web exec wrangler d1 execute arcgym-d1 ${flag} --command="SELECT * FROM drill_rating_stats;" --json`,
      { cwd: ROOT_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] },
    );

    const parsedRatings = JSON.parse(rawRatings) as Array<{
      results: D1RatingStatsRow[];
      success: boolean;
    }>;

    if (parsedRatings?.[0]?.results) {
      for (const row of parsedRatings[0].results) {
        let tagCounts = {};
        if (row.tag_counts_json) {
          try {
            tagCounts = JSON.parse(row.tag_counts_json);
          } catch {
            tagCounts = {};
          }
        }

        const stats = calculateRatingStats(
          row.drill_id,
          row.up_votes,
          row.down_votes,
          tagCounts,
          row.updated_at,
        );
        snapshot.ratings[row.drill_id] = stats;
      }
    }

    // Pull recent feedback submissions
    try {
      const rawRecords = execSync(
        `pnpm --filter @arcgym/web exec wrangler d1 execute arcgym-d1 ${flag} --command="SELECT id, drill_id, rating, tags_json, learner_id, created_at FROM drill_feedback ORDER BY created_at DESC LIMIT 500;" --json`,
        { cwd: ROOT_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] },
      );

      const parsedRecords = JSON.parse(rawRecords) as Array<{
        results: D1FeedbackRow[];
        success: boolean;
      }>;

      if (parsedRecords?.[0]?.results) {
        for (const row of parsedRecords[0].results) {
          let tags = [];
          try {
            tags = JSON.parse(row.tags_json || '[]');
          } catch {
            tags = [];
          }

          if (!snapshot.records[row.drill_id]) {
            snapshot.records[row.drill_id] = [];
          }

          snapshot.records[row.drill_id].push({
            id: row.id,
            drillId: row.drill_id,
            rating: row.rating as 'up' | 'down',
            tags,
            submittedAt: row.created_at,
          });
        }
      }
    } catch {
      // Feedback table might be empty or optional
    }

    saveLocalFeedback(snapshot);
    console.log(
      `Synced ${Object.keys(snapshot.ratings).length} drill rating stats → data/feedback.json\n`,
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'offline';
    console.warn(`Wrangler D1 pull skipped (${msg}). Using local cache if available.\n`);
  }

  return snapshot;
}

function renderReport(drillFilter?: string) {
  let snapshot = loadLocalFeedback();
  if (Object.keys(snapshot.ratings).length === 0) {
    snapshot = pullFromCloudflare(false);
  }

  const ratingsList = Object.values(snapshot.ratings);

  if (drillFilter) {
    const stats = snapshot.ratings[drillFilter];
    console.log('\n========================================================================');
    console.log(`                     Drill Feedback: ${drillFilter}                     `);
    console.log('========================================================================');
    if (!stats) {
      console.log(`No feedback recorded for drill ${drillFilter} yet.\n`);
      return;
    }

    console.log(`Total Votes:     ${stats.totalVotes}`);
    console.log(`Thumbs Up:       ${stats.upVotes}`);
    console.log(`Thumbs Down:     ${stats.downVotes}`);
    console.log(
      `Approval Rate:   ${stats.likePercentage !== null ? `${stats.likePercentage}%` : '— (insufficient votes)'}`,
    );
    console.log(`Last Updated:    ${stats.lastUpdated || 'Unknown'}\n`);

    console.log('--- Multiselect Tag Breakdown ---');
    const counts = stats.tagCounts || {};
    const hasTags = Object.keys(counts).length > 0;
    if (!hasTags) {
      console.log('No pill tags selected yet.');
    } else {
      console.log('Liked Pills:');
      for (const [key, label] of Object.entries(DRILL_LIKED_TAG_LABELS)) {
        const count = counts[key as keyof typeof counts] || 0;
        if (count > 0) {
          console.log(`  • 👍 ${label.padEnd(25)}: ${count}`);
        }
      }
      console.log("\nDidn't Like Pills:");
      for (const [key, label] of Object.entries(DRILL_DISLIKED_TAG_LABELS)) {
        const count = counts[key as keyof typeof counts] || 0;
        if (count > 0) {
          console.log(`  • 👎 ${label.padEnd(25)}: ${count}`);
        }
      }
    }

    const records = snapshot.records[drillFilter] || [];
    if (records.length > 0) {
      console.log(`\n--- Recent Submissions (${records.length}) ---`);
      for (const r of records.slice(0, 10)) {
        const icon = r.rating === 'up' ? '👍' : '👎';
        const date = r.submittedAt.slice(0, 19).replace('T', ' ');
        const tags = r.tags.length > 0 ? ` [${r.tags.join(', ')}]` : '';
        console.log(`  ${icon}  ${date}${tags}`);
      }
    }

    console.log('\n');
    return;
  }

  console.log('\n================================================================================');
  console.log('                         ArcGym Drill Feedback Report                           ');
  console.log('================================================================================\n');

  if (ratingsList.length === 0) {
    console.log('No drill ratings recorded yet.');
    console.log(
      'Tip: Once feedback is submitted on drills, run `pnpm feedback:report` to inspect.',
    );
    console.log('     Or run `pnpm feedback:pull` to sync from Cloudflare D1.\n');
    return;
  }

  // Sort lowest approval percentage first (identifying drills that need editorial attention)
  ratingsList.sort((a, b) => {
    const pctA = a.likePercentage !== null ? a.likePercentage : 100;
    const pctB = b.likePercentage !== null ? b.likePercentage : 100;
    return pctA - pctB;
  });

  console.log(' Drill ID    | Up Votes | Down Votes | Total | Approval | Top Feedback Pills');
  console.log(
    '-------------+----------+------------+-------+----------+-----------------------------------',
  );

  for (const stats of ratingsList) {
    const id = stats.drillId.padEnd(11);
    const up = String(stats.upVotes).padStart(8);
    const down = String(stats.downVotes).padStart(10);
    const total = String(stats.totalVotes).padStart(5);
    const pct = (stats.likePercentage !== null ? `${stats.likePercentage}%` : '—').padStart(8);

    // Pick top 2 most frequent tags
    const topTags = Object.entries(stats.tagCounts || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k, count]) => {
        const resolvedKey = LEGACY_TAG_ALIASES[k] || k;
        const label =
          (DRILL_LIKED_TAG_LABELS as Record<string, string>)[resolvedKey] ||
          (DRILL_DISLIKED_TAG_LABELS as Record<string, string>)[resolvedKey] ||
          k;
        return `${label} (${count})`;
      })
      .join(', ');

    console.log(` ${id} | ${up} | ${down} | ${total} | ${pct} | ${topTags || '-'}`);
  }

  console.log('\n');
}

// Parse CLI arguments
const args = process.argv.slice(2);
const isPull = args.includes('--pull');
const isLocal = args.includes('--local');

if (isPull) {
  pullFromCloudflare(isLocal);
} else {
  const drillIdx = args.indexOf('--drill');
  const drillFilter = drillIdx !== -1 && args[drillIdx + 1] ? args[drillIdx + 1] : undefined;
  renderReport(drillFilter);
}
