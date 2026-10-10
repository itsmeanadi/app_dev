/**
 * src/config.ts
 *
 * Central configuration for JerkGuard.
 * Every tunable number lives here with comments explaining why,
 * so the app is easy to explain in a college demo.
 */

// ─── Accelerometer ──────────────────────────────────────────────────────────
/**
 * How often we read the accelerometer, in milliseconds.
 * 20 ms ≈ 50 Hz — fast enough to catch a 100 ms impact spike.
 */
export const ACCEL_INTERVAL_MS = 20;

/**
 * Number of samples in the moving-average filter.
 * A short window (4 samples = 80 ms at 50 Hz) smooths sensor noise
 * but still responds quickly to a real jerk.
 */
export const MOVING_AVG_WINDOW = 4;

// ─── Jerk-detection thresholds (in g) ───────────────────────────────────────
/**
 * Sensitivity presets.
 * At rest the phone reads ~1 g (gravity). A car crash can spike to 20-50 g;
 * a phone drop onto a hard floor is around 5-8 g.
 *
 * LOW   – triggers only on very violent events (e.g. car crash).
 * MEDIUM – catches hard drops and moderate impacts.
 * HIGH  – sensitive; a firm shake or a stumble may trigger it.
 */
export const SENSITIVITY_THRESHOLDS: Record<string, number> = {
  High: 1.2,    // g — raised so gentle handling/walking doesn't false-trigger, but intentional shake triggers
  Medium: 1.8,  // g — moderate impacts (e.g. hard drop or spill)
  Low: 2.8,     // g — severe impacts only (e.g. vehicle collision or hard fall)
};

/**
 * Default sensitivity level when the user hasn't changed Settings yet.
 * Set to 'High' so a firm shake triggers it in demonstrations.
 */
export const DEFAULT_SENSITIVITY: 'Low' | 'Medium' | 'High' = 'High';

// ─── GPS / speed-drop detection ─────────────────────────────────────────────
/**
 * GPS polling interval in milliseconds (1 second).
 * Higher frequency wastes battery without much accuracy gain.
 */
export const GPS_INTERVAL_MS = 1000;

/**
 * Minimum speed drop (km/h) within the speed-drop window to count as
 * a secondary crash indicator.
 * 30 km/h ≈ 8.3 m/s — consistent with a moderate vehicle collision.
 */
export const SPEED_DROP_THRESHOLD_KMH = 30;

/**
 * Time window (ms) over which we check for a speed drop.
 * 2 seconds gives the GPS enough samples to show deceleration.
 */
export const SPEED_DROP_WINDOW_MS = 2000;

// ─── Countdown / Alert ──────────────────────────────────────────────────────
/**
 * Default countdown before SOS is sent (seconds).
 * 30 s gives a conscious person plenty of time to tap "I'M OK".
 */
export const DEFAULT_COUNTDOWN_SECONDS = 30;

/** Minimum allowed countdown (seconds). */
export const MIN_COUNTDOWN_SECONDS = 5;

/** Maximum allowed countdown (seconds). */
export const MAX_COUNTDOWN_SECONDS = 120;

/**
 * How often the alert beep repeats during countdown (ms).
 * Every 1.5 s keeps urgency without being overwhelming.
 */
export const BEEP_REPEAT_INTERVAL_MS = 1500;

/**
 * How often vibration repeats during countdown (ms).
 */
export const VIBRATION_REPEAT_INTERVAL_MS = 1000;

// ─── Cooldown ───────────────────────────────────────────────────────────────
/**
 * After SOS_SENT or CANCELLED, wait this many seconds before re-arming
 * detection.  Prevents rapid re-triggers from residual shaking.
 */
export const COOLDOWN_SECONDS = 10;

// ─── Location ───────────────────────────────────────────────────────────────
/**
 * Timeout (ms) for the one-shot location grab when sending SOS.
 * 5 seconds is generous; if GPS is unavailable we send "unknown".
 */
export const SOS_LOCATION_TIMEOUT_MS = 5000;

// ─── Email ──────────────────────────────────────────────────────────────────
/**
 * EmailJS REST endpoint — no backend needed.
 */
export const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

/**
 * Number of automatic retries if the email request fails.
 */
export const EMAIL_MAX_RETRIES = 1;

/**
 * Timeout for the EmailJS HTTP request (ms).
 */
export const EMAIL_TIMEOUT_MS = 10000;

// ─── Chart / UI ─────────────────────────────────────────────────────────────
/**
 * How many seconds of history the live chart shows.
 */
export const CHART_HISTORY_SECONDS = 10;

/**
 * Maximum data points kept for the chart.
 * At 50 Hz that's 500 points for 10 s, but we down-sample to ~5 Hz
 * for smooth rendering → 50 points.
 */
export const CHART_MAX_POINTS = 50;

// ─── AsyncStorage keys ──────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  USER_NAME: '@jerkguard/userName',
  EMERGENCY_EMAIL: '@jerkguard/emergencyEmail',
  COUNTDOWN_SECONDS: '@jerkguard/countdownSeconds',
  SENSITIVITY: '@jerkguard/sensitivity',
  EVENT_LOG: '@jerkguard/eventLog',
  THEME_MODE: '@jerkguard/themeMode',
} as const;
