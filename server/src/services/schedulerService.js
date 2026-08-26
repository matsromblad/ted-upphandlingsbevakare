import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { watchlistDao, hitsDao } from '../db.js';
import { searchTedNotices } from './tedService.js';

let cronTask = null;

/**
 * Execute a single watchlist check against TED API
 */
export async function runWatchlist(watchlist) {
  try {
    let filters = {};
    if (watchlist.filters_json) {
      filters = JSON.parse(watchlist.filters_json);
    }
    if (watchlist.query && !filters.rawQuery) {
      filters.rawQuery = watchlist.query;
    }

    console.log(`[Watchlist Engine] Running watchlist "${watchlist.name}" (ID: ${watchlist.id})`);
    const searchResult = await searchTedNotices(filters, { page: 1, limit: 50 });

    if (!searchResult.success) {
      console.error(`[Watchlist Engine] Search failed for watchlist ${watchlist.id}:`, searchResult.error);
      return { success: false, error: searchResult.error, newHits: 0 };
    }

    const notices = searchResult.notices || [];
    let newHitsCount = 0;

    for (const notice of notices) {
      const hit = {
        id: uuidv4(),
        watchlist_id: watchlist.id,
        notice_id: notice.id || notice.publicationNumber,
        notice_data_json: JSON.stringify(notice)
      };

      const inserted = hitsDao.insertHit(hit);
      if (inserted) {
        newHitsCount++;
      }
    }

    const now = new Date().toISOString();
    watchlistDao.updateStats(watchlist.id, now, searchResult.totalCount, newHitsCount);

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

/**
 * Run all active watchlists
 */
export async function runAllActiveWatchlists() {
  const watchlists = watchlistDao.getAll().filter(w => w.active);
  console.log(`[Watchlist Engine] Polling ${watchlists.length} active watchlists...`);
  
  const results = [];
  for (const wl of watchlists) {
    const res = await runWatchlist(wl);
    results.push({ id: wl.id, name: wl.name, ...res });
  }
  return results;
}

/**
 * Initialize background cron scheduler
 */
export function initScheduler() {
  // Run an immediate check on startup in the background
  setTimeout(() => {
    runAllActiveWatchlists().catch(console.error);
  }, 2000);

  // Check every 10 minutes according to schedule
  cronTask = cron.schedule('*/10 * * * *', async () => {
    console.log('[Watchlist Cron] Checking watchlists according to schedule...');
    const watchlists = watchlistDao.getAll().filter(w => w.active);
    const now = Date.now();

    for (const wl of watchlists) {
      const intervalMs = (wl.interval_minutes || 60) * 60 * 1000;
      const lastRun = wl.last_run_at ? new Date(wl.last_run_at).getTime() : 0;
      
      if (now - lastRun >= intervalMs) {
        await runWatchlist(wl);
      }
    }
  });

  console.log('[Scheduler] Background watchlist engine initialized.');
}
