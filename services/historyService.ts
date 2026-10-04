import { AppData } from '../types';

const HISTORY_KEY = 'gap_app_history';

export interface HistorySnapshot {
  id: string;
  timestamp: string;
  label: string;
  data: AppData;
}

export const saveSnapshot = (data: AppData, label: string = 'Auto-Save'): void => {
  try {
    const existingHistoryJson = localStorage.getItem(HISTORY_KEY);
    let history: HistorySnapshot[] = existingHistoryJson ? JSON.parse(existingHistoryJson) : [];

    const newSnapshot: HistorySnapshot = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      label,
      data: JSON.parse(JSON.stringify(data)) // Deep clone
    };

    // Add new snapshot to the beginning
    history.unshift(newSnapshot);

    // Smart Retention Policy:
    // 1. Keep all manual backups and critical system saves (Pre-Restore, Pre-Import)
    // 2. Keep the last 40 periodic auto-saves linearly
    // 3. Keep 1 auto-save per day for the rest of the month (up to 30 days)
    
    let filteredHistory: HistorySnapshot[] = [];
    const dailyTracker: Set<string> = new Set();
    let recentAutoSavesKept = 0;

    for (let i = 0; i < history.length; i++) {
        const snap = history[i];
        const dateKey = new Date(snap.timestamp).toISOString().split('T')[0];
        
        // Always keep critical/manual snapshots
        if (snap.label !== "Auto-Save (Periodic)" && snap.label !== "Auto-Save") {
            filteredHistory.push(snap);
            continue;
        }

        // Keep 40 most recent auto saves
        if (recentAutoSavesKept < 40) {
            filteredHistory.push(snap);
            recentAutoSavesKept++;
            dailyTracker.add(dateKey); // mark this day as having a snapshot
            continue;
        }

        // For older ones, keep 1 per day up to 30 days old
        const daysOld = (new Date().getTime() - new Date(snap.timestamp).getTime()) / (1000 * 3600 * 24);
        if (daysOld <= 30) {
            if (!dailyTracker.has(dateKey)) {
                filteredHistory.push(snap);
                dailyTracker.add(dateKey);
            }
        }
    }

    // Sort to ensure chronological order is maintained after filtering
    filteredHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Failsafe memory limit (ensure we never crash local storage, hard cap at 80)
    if (filteredHistory.length > 80) {
        filteredHistory = filteredHistory.slice(0, 80);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(filteredHistory));
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
        const currentData = localStorage.getItem(HISTORY_KEY);
        if (currentData) {
            const parsed = JSON.parse(currentData);
            // Drastic prune to half size
            localStorage.setItem(HISTORY_KEY, JSON.stringify(parsed.slice(0, Math.floor(parsed.length / 2))));
        }
    } else {
        console.error("Failed to save history snapshot", e);
    }
  }
};

export const getHistory = (): HistorySnapshot[] => {
  try {
    const json = localStorage.getItem(HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const clearHistory = (): void => {
  localStorage.removeItem(HISTORY_KEY);
};
