import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { watchlistDao, hitsDao } from '../db.js';
import { searchTedNotices } from './tedService.js';
import { maybeSendWatchlistDigestEmail } from './emailService.js';
import { supabaseAdmin, isSupabaseConfigured } from '../supabase.js';

let cronTask = null;

const CRON_LOCK_ID = 'watchlist_poller';
const CRON_LOCK_TTL_SECONDS = 9 * 60; // slightly under the 10-minute tick interval
const instanceId = `${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Run an array through an async worker with bounded concurrency, instead of either fully
 * sequential (await in a for-loop) or fully unbounded parallel (Promise.all on everything,
 * which could burst dozens of simultaneous requests at the TED/Magnit APIs).
 */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    const i = nextIndex++;
    if (i >= items.length) return;
    results[i] = await worker(items[i], i);
    return runNext();
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, runNext);
  await Promise.all(workers);
  return results;
}

/**
 * Prevents multiple server instances from polling the same watchlists concurrently. Only
 * meaningful in cloud mode (shared Postgres); in local/offline mode there's a single process
 * by definition, so the lock is a no-op there.
 */
async function tryAcquireCronLock() {
  if (!isSupabaseConfigured || !supabaseAdmin) return true;

  try {
    const { data, error } = await supabaseAdmin.rpc('try_acquire_cron_lock', {
      p_id: CRON_LOCK_ID,
      p_ttl_seconds: CRON_LOCK_TTL_SECONDS,
      p_holder: instanceId
    });

    if (error) {
      console.warn('[Watchlist Cron] Lock RPC unavailable, proceeding without cross-instance locking:', error.message);
      return true;
    }

    return Boolean(data);
  } catch (err) {
    console.warn('[Watchlist Cron] Lock RPC failed, proceeding without cross-instance locking:', err.message);
    return true;
  }
}

/**
 * Execute a single watchlist check against TED API
 */
export async function runWatchlist(watchlist) {
  try {
    let filters = {};
    if (watchlist.filters_json) {
      filters = typeof watchlist.filters_json === 'string'
        ? JSON.parse(watchlist.filters_json)
        : watchlist.filters_json;
    }
    if (watchlist.query && !filters.rawQuery) {
      filters.rawQuery = watchlist.query;
    }

    console.log(`[Watchlist Engine] Running watchlist "${watchlist.name}" (ID: ${watchlist.id}, User: ${watchlist.user_id})`);
    const searchResult = await searchTedNotices(filters, { page: 1, limit: 50 });

    if (!searchResult.success) {
      console.error(`[Watchlist Engine] Search failed for watchlist ${watchlist.id}:`, searchResult.error);
      return { success: false, error: searchResult.error, newHits: 0 };
    }

    const notices = searchResult.notices || [];

    const insertResults = await mapWithConcurrency(notices, 5, async (notice) => {
      const hit = {
        id: uuidv4(),
        user_id: watchlist.user_id,
        watchlist_id: watchlist.id,
        notice_id: notice.id || notice.publicationNumber,
        notice_data_json: JSON.stringify(notice)
      };
      return hitsDao.insertHit(hit);
    });
    const newHitsCount = insertResults.filter(Boolean).length;

    const now = new Date().toISOString();
    await watchlistDao.updateStats(watchlist.id, now, searchResult.totalCount, newHitsCount);

    console.log(`[Watchlist Engine] Watchlist "${watchlist.name}" completed. Total: ${searchResult.totalCount}, New hits: ${newHitsCount}`);
    return {
      success: true,
      totalFound: searchResult.totalCount,
      newHits: newHitsCount
    };
  } catch (err) {
    console.error(`[Watchlist Engine] Error executing watchlist ${watchlist.id}:`, err);
    return { success: false, error: err.message, newHits: 0 };
  }
}

async function runWatchlistAndDigest(wl) {
  const res = await runWatchlist(wl);
  let emailResult = null;
  try {
    emailResult = await maybeSendWatchlistDigestEmail(wl);
  } catch (err) {
    console.error(`[Watchlist Email] Error sending digest for ${wl.id}:`, err);
    emailResult = { success: false, error: err.message };
  }
  return { id: wl.id, name: wl.name, ...res, email: emailResult };
}

/**
 * Run active watchlists (either for a single user or system-wide for cron).
 * Watchlists run with bounded concurrency rather than one at a time, so a large batch
 * doesn't take longer than the poll interval itself.
 */
export async function runAllActiveWatchlists(userId = null) {
  let watchlists = [];
  if (userId) {
    const userWls = await watchlistDao.getAll(userId);
    watchlists = userWls.filter(w => w.active);
  } else {
    watchlists = await watchlistDao.getAllActiveSystem();
  }

  console.log(`[Watchlist Engine] Polling ${watchlists.length} active watchlists...`);

  return mapWithConcurrency(watchlists, 4, runWatchlistAndDigest);
}

/**
 * Initialize background cron scheduler
 */
export function initScheduler() {
  const tick = async () => {
    const acquired = await tryAcquireCronLock();
    if (!acquired) {
      console.log('[Watchlist Cron] Another instance holds the poll lock, skipping this tick.');
      return;
    }
    try {
      await runAllActiveWatchlists();
    } catch (err) {
      console.error('[Watchlist Cron] Scheduled run error:', err);
    }
  };

  // Run an immediate check on startup in the background
  setTimeout(() => {
    tick().catch(console.error);
  }, 2000);

  // Check every 10 minutes and send digests when a watchlist cadence is due
  cronTask = cron.schedule('*/10 * * * *', () => {
    console.log('[Watchlist Cron] Checking watchlists according to schedule...');
    tick().catch(console.error);
  });

  console.log('[Scheduler] Background watchlist engine initialized.');
}
