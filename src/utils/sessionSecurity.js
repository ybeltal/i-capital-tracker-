/**
 * THE i-CAPITAL AFRICA GROUP — COMMERCIAL CRM
 * 2-Hour Session Governance, Inactivity & Tab-Close Watchdog Engine
 */

import { createClient } from '@supabase/supabase-js';

// Connect to your production Supabase project using env vars or direct fallback
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://qljmgleaxfmrurrpmjkz.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_Jv9c27B9Am_d7NkKf46WRw_RkB30hvU';

// Reuse singleton client across hot-reloads to avoid duplicate client warnings
export const supabaseAuthClient =
  window.__icapitalSupabaseClient ||
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

window.__icapitalSupabaseClient = supabaseAuthClient;

// 2-Hour Security Constants (in milliseconds)
export const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 Hours = 7,200,000 ms
export const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // Warn 5 minutes before lock
const ACTIVITY_THROTTLE_MS = 15 * 1000; // Update timestamp at most every 15s

// LocalStorage Keys
export const STORAGE_KEYS = {
  LAST_ACTIVE_AT: 'icapital_crm_last_active_at',
  LOGIN_TIMESTAMP: 'icapital_crm_login_timestamp',
  LAST_CLOSED_AT: 'icapital_crm_last_closed_at',
  LOCK_REASON: 'icapital_crm_lock_reason',
  LAST_EMAIL: 'icapital_crm_last_user_email',
  SKIP_WELCOME_HUB: 'icapital_crm_skip_welcome_hub',
};

let lastWriteTime = 0;

/**
 * Records fresh user activity upon login or interaction
 */
export function recordUserActivity(force = false) {
  const now = Date.now();
  if (!force && now - lastWriteTime < ACTIVITY_THROTTLE_MS) {
    return;
  }
  lastWriteTime = now;
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_AT, String(now));
  } catch (e) {
    console.warn('Unable to write session activity timestamp:', e);
  }
}

/**
 * Initializes timestamps right when a user logs in with their password
 */
export function initializeFreshLoginSession(email) {
  const now = Date.now();
  lastWriteTime = now;
  try {
    localStorage.setItem(STORAGE_KEYS.LOGIN_TIMESTAMP, String(now));
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_AT, String(now));
    localStorage.removeItem(STORAGE_KEYS.LAST_CLOSED_AT);
    localStorage.removeItem(STORAGE_KEYS.LOCK_REASON);
    if (email) {
      localStorage.setItem(STORAGE_KEYS.LAST_EMAIL, email.trim());
    }
  } catch (e) {
    console.warn('Unable to initialize login session storage:', e);
  }
}

/**
 * Records when the user closes or hides the browser tab
 */
export function recordPlatformClosed() {
  const now = Date.now();
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_CLOSED_AT, String(now));
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_AT, String(now));
  } catch (e) {
    // Ignore storage errors on unload
  }
}

/**
 * Evaluates whether the 2-hour window has expired
 * Returns { isExpired: boolean, remainingMs: number, reason: string | null }
 */
export function evaluateSessionStatus() {
  try {
    const rawLastActive = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_AT);
    const rawLastClosed = localStorage.getItem(STORAGE_KEYS.LAST_CLOSED_AT);

    // If no activity timestamp exists yet for an existing session, initialize it now
    if (!rawLastActive) {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_AT, String(now));
      return {
        isExpired: false,
        remainingMs: SESSION_TIMEOUT_MS,
        reason: null,
      };
    }

    const lastActive = parseInt(rawLastActive, 10);
    const lastClosed = rawLastClosed ? parseInt(rawLastClosed, 10) : null;
    const now = Date.now();

    // Check time elapsed since last activity
    const elapsedSinceActive = now - lastActive;

    // Check if the user closed the platform and returned after 2+ hours
    if (lastClosed && now - lastClosed >= SESSION_TIMEOUT_MS) {
      return {
        isExpired: true,
        remainingMs: 0,
        reason:
          'You were away from the platform for over 2 hours. For institutional security, please re-enter your password to access The i-Capital CRM.',
      };
    }

    if (elapsedSinceActive >= SESSION_TIMEOUT_MS) {
      return {
        isExpired: true,
        remainingMs: 0,
        reason:
          'Your 2-hour active security window has expired. Please re-enter your password to unlock the platform.',
      };
    }

    const remainingMs = Math.max(0, SESSION_TIMEOUT_MS - elapsedSinceActive);
    return {
      isExpired: false,
      remainingMs,
      reason: null,
    };
  } catch (e) {
    return {
      isExpired: false,
      remainingMs: SESSION_TIMEOUT_MS,
      reason: null,
    };
  }
}

/**
 * Terminates the Supabase session and locks the platform with a reason message
 */
export async function lockAndSignOutSession(reasonMessage) {
  try {
    if (reasonMessage) {
      localStorage.setItem(STORAGE_KEYS.LOCK_REASON, reasonMessage);
    }
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVE_AT);
    localStorage.removeItem(STORAGE_KEYS.LOGIN_TIMESTAMP);
    localStorage.removeItem(STORAGE_KEYS.LAST_CLOSED_AT);

    await supabaseAuthClient.auth.signOut();
  } catch (err) {
    console.error('Error during automated session lock:', err);
  }
}

/**
 * Formats remaining milliseconds into "1h 54m" or "04m 30s"
 */
export function formatRemainingTime(ms) {
  if (!ms || ms <= 0) return '0m 00s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}