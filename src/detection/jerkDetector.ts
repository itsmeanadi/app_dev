/**
 * src/detection/jerkDetector.ts
 *
 * Pure-function jerk detection — no side effects, no hooks, no React.
 * This file is easy to unit-test and explain in a college presentation.
 *
 * HOW IT WORKS:
 * 1.  The accelerometer gives us (x, y, z) in m/s².
 *     We convert to g by dividing by 9.81.
 *     The magnitude = sqrt(x² + y² + z²).
 *     At rest this is ≈ 1 g (gravity).
 *
 * 2.  We smooth the magnitude with a short moving average (configurable
 *     window size) to filter out sensor noise.
 *
 * 3.  We compare the smoothed magnitude to a threshold (depends on the
 *     chosen sensitivity level).
 *
 * 4.  Optionally, we also check for a sudden GPS speed drop (≥ 30 km/h
 *     within 2 seconds), which is a secondary crash indicator.
 *
 * 5.  A jerk is triggered if:
 *     – The g threshold is exceeded, AND
 *     – Either a speed drop is also detected, OR GPS data is unavailable
 *       (so we don't block detection indoors).
 */

import {
  SENSITIVITY_THRESHOLDS,
  MOVING_AVG_WINDOW,
  SPEED_DROP_THRESHOLD_KMH,
  SPEED_DROP_WINDOW_MS,
} from '../config';
import type { SensitivityLevel } from '../types';

/**
 * Convert raw accelerometer reading to impact acceleration in g with gravity removed.
 * At rest, the device experiences 1.0 g from Earth's gravity; subtracting 1 gives ~0.0 g at rest.
 * Any sudden motion or shake will produce positive impact g values (|magnitude - 1|).
 */
export function computeMagnitudeG(x: number, y: number, z: number): number {
  const totalG = Math.sqrt(x * x + y * y + z * z);
  return Math.abs(totalG - 1.0);
}

/**
 * Apply a simple moving average to an array of magnitudes.
 * Returns the average of the last `windowSize` values.
 *
 * @param magnitudes  All recent magnitude readings (newest last).
 * @param windowSize  How many samples to average (default from config).
 */
export function movingAverage(
  magnitudes: number[],
  windowSize: number = MOVING_AVG_WINDOW,
): number {
  if (magnitudes.length === 0) return 0; // no data → assume rest (0 g impact)
  const start = Math.max(0, magnitudes.length - windowSize);
  const window = magnitudes.slice(start);
  return window.reduce((sum, v) => sum + v, 0) / window.length;
}

/**
 * Check whether the smoothed g-force exceeds the threshold for the
 * given sensitivity level.
 */
export function isAccelTriggered(
  smoothedG: number,
  sensitivity: SensitivityLevel,
): boolean {
  const threshold = SENSITIVITY_THRESHOLDS[sensitivity];
  return smoothedG >= threshold;
}

/**
 * Speed-drop record used by `isSpeedDropTriggered`.
 */
export interface SpeedRecord {
  /** Unix timestamp in ms */
  timestamp: number;
  /** Speed in km/h (0 if unavailable) */
  speedKmh: number;
}

/**
 * Check whether speed dropped by ≥ SPEED_DROP_THRESHOLD_KMH within
 * the last SPEED_DROP_WINDOW_MS.
 *
 * @param speedHistory  Array of recent speed records, newest last.
 * @returns true if a qualifying speed drop is found.
 */
export function isSpeedDropTriggered(speedHistory: SpeedRecord[]): boolean {
  if (speedHistory.length < 2) return false;

  const now = speedHistory[speedHistory.length - 1];
  const cutoff = now.timestamp - SPEED_DROP_WINDOW_MS;

  // Find the maximum speed within the window
  let maxSpeed = 0;
  for (const record of speedHistory) {
    if (record.timestamp >= cutoff && record.speedKmh > maxSpeed) {
      maxSpeed = record.speedKmh;
    }
  }

  // Check if the drop from max to current exceeds the threshold
  const drop = maxSpeed - now.speedKmh;
  return drop >= SPEED_DROP_THRESHOLD_KMH;
}

/**
 * Main detection function — determines if a jerk event should trigger.
 *
 * Logic:
 * – If accelerometer says YES:
 *     – If GPS is available AND speed-drop is also YES → trigger
 *     – If GPS is unavailable → trigger (accelerometer-only mode)
 *     – If GPS is available but no speed drop → do NOT trigger
 *       (reduces false positives when GPS is working)
 *
 * EXCEPTION: if gpsAvailable is false, we trigger on accel alone so
 * the app still works indoors.
 *
 * @param smoothedG       The moving-averaged g magnitude.
 * @param sensitivity     Current user sensitivity setting.
 * @param speedHistory    Recent GPS speed records.
 * @param gpsAvailable    Whether GPS data is available at all.
 * @returns               true if a jerk alert should start.
 */
export function shouldTriggerAlert(
  smoothedG: number,
  sensitivity: SensitivityLevel,
  speedHistory: SpeedRecord[],
  gpsAvailable: boolean,
): boolean {
  // Primary trigger: G-force spike exceeds threshold
  const accelTriggered = isAccelTriggered(smoothedG, sensitivity);
  if (accelTriggered) {
    return true;
  }

  // Secondary trigger: sudden vehicle deceleration (GPS speed drop >= 30 km/h)
  if (gpsAvailable && isSpeedDropTriggered(speedHistory)) {
    return true;
  }

  return false;
}
