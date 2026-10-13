/**
 * src/hooks/useAlertCountdown.ts
 *
 * Manages the ALERT_COUNTDOWN state: plays the alert beep using expo-audio
 * (configured to play even in iOS silent mode), triggers vibration/haptics,
 * and handles "I'M OK" or SOS transitions.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Vibration, Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { useAppContext } from '../state/AppContext';
import { sendSOSEmail } from '../services/emailService';
import {
  BEEP_REPEAT_INTERVAL_MS,
  COOLDOWN_SECONDS,
  SOS_LOCATION_TIMEOUT_MS,
} from '../config';
import type { EventLogEntry } from '../types';

// Import the generated beep sound
const BEEP_ASSET = require('../../assets/beep.wav');

export function useAlertCountdown() {
  const { state, dispatch, addEventLog } = useAppContext();
  const playerRef = useRef<AudioPlayer | null>(null);
  const beepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hapticTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onResumeRef = useRef<(() => void) | null>(null);

  const isActiveAlertRef = useRef(false);

  /** Register a callback for when cooldown finishes → resume monitoring */
  const setOnResume = useCallback((cb: () => void) => {
    onResumeRef.current = cb;
  }, []);

  /**
   * Configure audio mode for emergency (plays even in iOS silent mode)
   * and play the short beep sound.
   */
  const playBeep = useCallback(async () => {
    if (!isActiveAlertRef.current) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true, // critical for iOS silent mode
        shouldPlayInBackground: false,
      });

      if (!isActiveAlertRef.current) return;

      if (!playerRef.current) {
        playerRef.current = createAudioPlayer(BEEP_ASSET);
      }

      const player = playerRef.current;
      if (!isActiveAlertRef.current || !player) {
        player?.pause();
        return;
      }

      // Rewind and play safely
      await player.seekTo(0);
      if (isActiveAlertRef.current && playerRef.current) {
        player.play();
      }
    } catch (err) {
      console.warn('Beep playback error:', err);
    }
  }, []);

  /**
   * Start the alert: repeating beep and vibration/haptics.
   */
  const startAlert = useCallback(() => {
    isActiveAlertRef.current = true;

    // Clear any existing timer just in case
    if (beepTimerRef.current) {
      clearInterval(beepTimerRef.current);
    }

    // Play beep immediately, then repeat on interval
    playBeep();
    beepTimerRef.current = setInterval(() => {
      if (isActiveAlertRef.current) {
        playBeep();
      }
    }, BEEP_REPEAT_INTERVAL_MS);

    // Vibration / Haptics loop
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 500, 500], true); // repeat pattern on Android
    } else {
      if (hapticTimerRef.current) clearInterval(hapticTimerRef.current);
      hapticTimerRef.current = setInterval(() => {
        if (isActiveAlertRef.current) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }, 1000);
    }
  }, [playBeep]);

  /**
   * Stop all alert sounds, vibrations, and timers.
   */
  const stopAlertEffects = useCallback(async () => {
    isActiveAlertRef.current = false;

    // Clear beep interval immediately
    if (beepTimerRef.current) {
      clearInterval(beepTimerRef.current);
      beepTimerRef.current = null;
    }

    // Clear haptic interval
    if (hapticTimerRef.current) {
      clearInterval(hapticTimerRef.current);
      hapticTimerRef.current = null;
    }

    // Immediately stop and release audio player
    const player = playerRef.current;
    playerRef.current = null;
    if (player) {
      try {
        player.pause();
        player.remove();
      } catch (err) {
        console.warn('Error stopping audio player:', err);
      }
    }

    // Cancel hardware vibration
    Vibration.cancel();
  }, []);

  /**
   * Start cooldown timer, then resume monitoring.
   */
  const startCooldown = useCallback(() => {
    cooldownRef.current = setTimeout(() => {
      onResumeRef.current?.();
    }, COOLDOWN_SECONDS * 1000);
  }, []);

  /**
   * User tapped "I'M OK" — cancel the alert.
   */
  const cancelAlert = useCallback(async () => {
    await stopAlertEffects();

    dispatch({ type: 'SET_APP_STATE', payload: 'CANCELLED' });

    const entry: EventLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      outcome: 'Cancelled',
      peakG: state.peakG,
      speedKmh: state.currentSpeedKmh,
    };

    await addEventLog(entry);
    startCooldown();
  }, [stopAlertEffects, dispatch, state.peakG, state.currentSpeedKmh, addEventLog, startCooldown]);

  /**
   * Countdown reached 0 — send SOS email.
   */
  const sendSOS = useCallback(async () => {
    await stopAlertEffects();
    dispatch({ type: 'SET_APP_STATE', payload: 'SOS_SENT' });

    // Get current location (one-shot, with timeout)
    let lat = 0;
    let lng = 0;
    let locationObtained = false;

    try {
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Location timeout')), SOS_LOCATION_TIMEOUT_MS),
        ),
      ]);

      if (loc) {
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
        locationObtained = true;
      }
    } catch {
      // Location unavailable — send SOS anyway with notice
    }

    const mapsLink = locationObtained
      ? `https://maps.google.com/?q=${lat},${lng}`
      : 'Location unavailable';

    // Try to send the email
    let outcome: EventLogEntry['outcome'] = 'SOS sent';
    try {
      await sendSOSEmail({
        to_email: state.settings.emergencyEmail,
        user_name: state.settings.userName || 'JerkGuard User',
        time: new Date().toLocaleString(),
        maps_link: mapsLink,
        speed_kmh: state.currentSpeedKmh.toFixed(1),
        peak_g: state.peakG.toFixed(2),
        message: `🚨 EMERGENCY: ${state.settings.userName || 'A JerkGuard user'} may have been in an accident! ` +
          `Peak impact: ${state.peakG.toFixed(2)}g at ${state.currentSpeedKmh.toFixed(1)} km/h.`,
      });
      dispatch({ type: 'SET_SOS_ERROR', payload: null });
    } catch (err: any) {
      outcome = 'Email failed';
      dispatch({ type: 'SET_SOS_ERROR', payload: err.message });
    }

    const entry: EventLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      outcome,
      peakG: state.peakG,
      speedKmh: state.currentSpeedKmh,
      location: locationObtained ? { latitude: lat, longitude: lng } : undefined,
    };

    await addEventLog(entry);
    startCooldown();
  }, [
    stopAlertEffects,
    dispatch,
    state.settings,
    state.peakG,
    state.currentSpeedKmh,
    addEventLog,
    startCooldown,
  ]);

  /**
   * Retry sending SOS (called from SOS_SENT error screen).
   */
  const retrySOS = useCallback(async () => {
    dispatch({ type: 'SET_SOS_ERROR', payload: null });
    await sendSOS();
  }, [dispatch, sendSOS]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAlertEffects();
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, [stopAlertEffects]);

  return {
    startAlert,
    cancelAlert,
    sendSOS,
    retrySOS,
    stopAlertEffects,
    setOnResume,
  };
}
