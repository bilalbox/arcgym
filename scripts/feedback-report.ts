#!/usr/bin/env node

/**
 * ArcGym Drill Feedback Triage CLI
 *
 * Inspects and summarizes learner ratings and multiselect pill tags across published drills.
 *
 * Usage:
 *   pnpm feedback:report                  # Summary table of all drill ratings
 *   pnpm feedback:report --drill AGD-00101 # Detail view for a specific drill
 *   pnpm feedback:pull                   # Snapshot remote KV to data/feedback.json
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  DRILL_DISLIKED_TAG_LABELS,
  DRILL_LIKED_TAG_LABELS,
  type DrillFeedbackRecord,
  type DrillRatingStats,
  LEGACY_TAG_ALIASES,
} from '../packages/drill-core/src/index.js';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const KV_NAMESPACE_ID = 'c1f903c9221b40c086115dd7fc7f43d7';

interface FeedbackSnapshot {
  lastSyncedAt: string;
  ratings: Record<string, DrillRatingStats>;
  records: Record<string, DrillFeedbackRecord[]>;
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
 * Pulls ratings and recent feedback records directly from Cloudflare KV using Wrangler.
 */
function pullFromCloudflare(): FeedbackSnapshot {
  console.log('Connecting to Cloudflare KV to sync drill feedback...');
  const snapshot: FeedbackSnapshot = {
    lastSyncedAt: new Date().toISOString(),
    ratings: {},
    records: {},
  };

  try {
    const listRaw = execSync(
      `pnpm --filter @arcgym/web exec wrangler kv key list --namespace-id=${KV_NAMESPACE_ID} --prefix="drill:rating:" --remote`,
      { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf-8' },
    );
    const keys = JSON.parse(listRaw) as Array<{ name: string }>;

    for (const key of keys) {
      try {
        const valRaw = execSync(
          `pnpm --filter @arcgym/web exec wrangler kv key get --namespace-id=${KV_NAMESPACE_ID} "${key.name}" --remote`,
          { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf-8' },
        );
        const stats = JSON.parse(valRaw) as DrillRatingStats;
        if (stats?.drillId) {
          snapshot.ratings[stats.drillId] = stats;
        }
      } catch {
        // Continue if single key fails
      }
    }

    saveLocalFeedback(snapshot);
    console.log(
      `Synced ${Object.keys(snapshot.ratings).length} drill rating stats → data/feedback.json\n`,
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'offline';
    console.warn(`Wrangler KV pull skipped (${msg}). Using local cache if available.\n`);
  }

  return snapshot;
}

function renderReport(drillFilter?: string) {
  let snapshot = loadLocalFeedback();
  if (Object.keys(snapshot.ratings).length === 0) {
    // If no local data, attempt a pull
    snapshot = pullFromCloudflare();
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
          console.log(`  • 👍 ${label.padEnd(20)}: ${count}`);
        }
      }
      console.log("\nDidn't Like Pills:");
      for (const [key, label] of Object.entries(DRILL_DISLIKED_TAG_LABELS)) {
        const count = counts[key as keyof typeof counts] || 0;
        if (count > 0) {
          console.log(`  • 👎 ${label.padEnd(20)}: ${count}`);
        }
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
    console.log('     Or run `pnpm feedback:pull` to sync from Cloudflare KV.\n');
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
if (args.includes('--pull')) {
  pullFromCloudflare();
} else {
  const drillIdx = args.indexOf('--drill');
  const drillFilter = drillIdx !== -1 && args[drillIdx + 1] ? args[drillIdx + 1] : undefined;
  renderReport(drillFilter);
}
