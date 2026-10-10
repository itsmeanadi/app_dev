/**
 * src/types.ts
 *
 * Shared TypeScript types for JerkGuard.
 */

/**
 * The five states of the JerkGuard state machine.
 *
 * IDLE            – app open, not yet monitoring
 * MONITORING      – sensors active, watching for a jerk
 * ALERT_COUNTDOWN – jerk detected, countdown is ticking
 * CANCELLED       – user tapped "I'M OK", entering cooldown
 * SOS_SENT        – countdown hit 0, SOS email attempted
 */
export type AppState =
  | 'IDLE'
  | 'MONITORING'
  | 'ALERT_COUNTDOWN'
  | 'CANCELLED'
  | 'SOS_SENT';

/** Sensitivity levels — mapped to g thresholds in config.ts */
export type SensitivityLevel = 'Low' | 'Medium' | 'High';

/** A single entry in the event log */
export interface EventLogEntry {
  id: string;
  timestamp: string;           // ISO string
  outcome: 'Cancelled' | 'SOS sent' | 'Email failed';
  peakG: number;               // highest g during the event
  speedKmh: number;            // speed at trigger time
  location?: {
    latitude: number;
    longitude: number;
  };
}

/** Theme preference mode */
export type ThemeMode = 'system' | 'light' | 'dark';

/** User-configurable settings persisted in AsyncStorage */
export interface UserSettings {
  userName: string;
  emergencyEmail: string;
  countdownSeconds: number;
  sensitivity: SensitivityLevel;
  themeMode?: ThemeMode;
}

/** Data point for the live chart */
export interface ChartDataPoint {
  time: number;   // ms since monitoring started
  gForce: number;
  speedKmh: number;
}
