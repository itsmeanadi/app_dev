/**
 * src/hooks/useMonitoring.ts
 *
 * The main monitoring engine. Manages the accelerometer, GPS, and the
 * state machine transitions for MONITORING → ALERT_COUNTDOWN.
 *
 * This hook:
 * 1. Subscribes to the accelerometer at ~50 Hz
 * 2. Watches GPS position at ~1 Hz
 * 3. Runs jerk detection on every accel sample
 * 4. Feeds live data into the chart
 * 5. Triggers the alert when a jerk is detected
 */

import { useEffect, useRef, useCallback } from 'react';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { useAppContext } from '../state/AppContext';
import {
  computeMagnitudeG,
  movingAverage,
  shouldTriggerAlert,
} from '../detection';
import type { SpeedRecord } from '../detection';
import { ACCEL_INTERVAL_MS, GPS_INTERVAL_MS } from '../config';

/**
 * Convert m/s to km/h. Treat negative speed (GPS glitch) as 0.
 */
function msToKmh(metersPerSecond: number): number {
  return Math.max(0, metersPerSecond * 3.6);
}

export function useMonitoring() {
  const { state, dispatch } = useAppContext();

  // Refs to hold sensor data without triggering re-renders
  const magnitudesRef = useRef<number[]>([]);
  const speedHistoryRef = useRef<SpeedRecord[]>([]);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const accelSubRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const chartIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestSpeedRef = useRef(0);
  const latestGRef = useRef(1);
  const monitoringStartRef = useRef(0);
  const isMonitoringRef = useRef(false);

  // Start monitoring sensors
  const startMonitoring = useCallback(async () => {
    if (isMonitoringRef.current) return;
    isMonitoringRef.current = true;

    // Reset data
    magnitudesRef.current = [];
    speedHistoryRef.current = [];
    latestSpeedRef.current = 0;
    latestGRef.current = 1;
    monitoringStartRef.current = Date.now();

    dispatch({ type: 'SET_APP_STATE', payload: 'MONITORING' });
    dispatch({ type: 'CLEAR_CHART' });

    // Keep the screen awake while monitoring
    try {
      await activateKeepAwakeAsync('monitoring');
    } catch { /* non-critical */ }

    // ── Accelerometer ──────────────────────────────────────────────────
    Accelerometer.setUpdateInterval(ACCEL_INTERVAL_MS); // 20 ms = 50 Hz

    let sampleCount = 0;
    accelSubRef.current = Accelerometer.addListener((data) => {
      // 1. Calculate raw impact g with gravity removed: |sqrt(x^2 + y^2 + z^2) - 1|
      const rawImpactG = computeMagnitudeG(data.x, data.y, data.z);
      magnitudesRef.current.push(rawImpactG);

      // Keep recent samples (last 20 samples = 400 ms)
      if (magnitudesRef.current.length > 20) {
        magnitudesRef.current = magnitudesRef.current.slice(-20);
      }

      // 2. Detection uses fast 2-sample average (or raw sample) against threshold
      // This catches immediate shocks without being dampened by heavy moving averages.
      const len = magnitudesRef.current.length;
      const fastDetectG = len >= 2
        ? (magnitudesRef.current[len - 1] + magnitudesRef.current[len - 2]) / 2
        : rawImpactG;

      // Update latestGRef for chart and readouts
      latestGRef.current = rawImpactG;

      // 3. RUN DETECTION ON EVERY RAW SENSOR SAMPLE (every 20 ms)
      // Never throttled by React state renders.
      if (isMonitoringRef.current) {
        const triggered = shouldTriggerAlert(
          fastDetectG,
          state.settings.sensitivity,
          speedHistoryRef.current,
          state.gpsAvailable,
        );

        if (triggered) {
          isMonitoringRef.current = false; // prevent re-triggering during countdown
          dispatch({ type: 'START_ALERT', payload: { peakG: fastDetectG } });
          return;
        }
      }

      // 4. THROTTLE UI UPDATES SEPARATELY (~10 Hz = every 5th sample at 50 Hz)
      sampleCount++;
      if (sampleCount % 5 === 0) {
        dispatch({
          type: 'UPDATE_SENSOR_DATA',
          payload: { g: rawImpactG, speedKmh: latestSpeedRef.current },
        });
      }
    });

    // ── GPS ─────────────────────────────────────────────────────────────
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        dispatch({ type: 'SET_GPS_AVAILABLE', payload: true });

        locationSubRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: GPS_INTERVAL_MS,
            distanceInterval: 0,
          },
          (location) => {
            const speedKmh = msToKmh(location.coords.speed ?? 0);
            latestSpeedRef.current = speedKmh;

            speedHistoryRef.current.push({
              timestamp: Date.now(),
              speedKmh,
            });

            // Keep only the last 10 records (~10 s)
            if (speedHistoryRef.current.length > 10) {
              speedHistoryRef.current = speedHistoryRef.current.slice(-10);
            }
          },
        );
      } else {
        dispatch({ type: 'SET_GPS_AVAILABLE', payload: false });
      }
    } catch {
      dispatch({ type: 'SET_GPS_AVAILABLE', payload: false });
    }

    // ── Chart data feeder (5 Hz → 50 points in 10 s) ───────────────────
    chartIntervalRef.current = setInterval(() => {
      dispatch({
        type: 'ADD_CHART_POINT',
        payload: {
          time: Date.now() - monitoringStartRef.current,
          gForce: latestGRef.current,
          speedKmh: latestSpeedRef.current,
        },
      });
    }, 200); // 200 ms = 5 Hz
  }, [dispatch, state.settings.sensitivity, state.gpsAvailable]);

  // Stop all sensors
  const stopMonitoring = useCallback(() => {
    isMonitoringRef.current = false;

    accelSubRef.current?.remove();
    accelSubRef.current = null;

    locationSubRef.current?.remove();
    locationSubRef.current = null;

    if (chartIntervalRef.current) {
      clearInterval(chartIntervalRef.current);
      chartIntervalRef.current = null;
    }

    try {
      deactivateKeepAwake('monitoring');
    } catch { /* non-critical */ }

    dispatch({ type: 'SET_APP_STATE', payload: 'IDLE' });
  }, [dispatch]);

  // Pause detection (for ALERT_COUNTDOWN, CANCELLED, SOS_SENT)
  // Sensors keep running for display but detection stops
  const pauseDetection = useCallback(() => {
    isMonitoringRef.current = false;
  }, []);

  // Resume detection (after cooldown)
  const resumeDetection = useCallback(() => {
    if (accelSubRef.current) {
      isMonitoringRef.current = true;
      dispatch({ type: 'SET_APP_STATE', payload: 'MONITORING' });
    }
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      accelSubRef.current?.remove();
      locationSubRef.current?.remove();
      if (chartIntervalRef.current) clearInterval(chartIntervalRef.current);
      try { deactivateKeepAwake('monitoring'); } catch { /* */ }
    };
  }, []);

  return {
    startMonitoring,
    stopMonitoring,
    pauseDetection,
    resumeDetection,
    isMonitoring: isMonitoringRef.current,
  };
}
