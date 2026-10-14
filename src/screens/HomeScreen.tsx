/**
 * src/screens/HomeScreen.tsx
 *
 * Warm Coffee-Shop Themed Home Screen:
 * - START / STOP toggle: mocha circle with cream text / terracotta STOP with white text
 * - Caramel pulsing ring while monitoring
 * - Cards with 20px radius and soft warm shadows (shadowColor #7A5648)
 * - Status chip: Idle (sand with brown text), Monitoring (safe green), Alert (danger red)
 * - Full-screen alert: alertScreenBg #B3261E with cream text & safe green I'M OK button
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { useAppContext } from '../state/AppContext';
import { useMonitoring } from '../hooks/useMonitoring';
import { useAlertCountdown } from '../hooks/useAlertCountdown';
import { useThemeColors, spacing, borderRadius, fontSize } from '../theme';
import { COOLDOWN_SECONDS, SENSITIVITY_THRESHOLDS } from '../config';
import { LiveChart } from '../components/LiveChart';
import type { AppState } from '../types';

export default function HomeScreen() {
  const colors = useThemeColors();
  const { state } = useAppContext();
  const monitoring = useMonitoring();
  const alert = useAlertCountdown();

  // Stable refs for hooks to avoid infinite re-render loops in effects
  const monitoringRef = useRef(monitoring);
  monitoringRef.current = monitoring;
  const alertRef = useRef(alert);
  alertRef.current = alert;

  const [countdownDisplay, setCountdownDisplay] = useState(state.settings.countdownSeconds);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownValueRef = useRef(state.settings.countdownSeconds);

  // Caramel pulsing ring animation for the monitoring button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isActive = state.appState !== 'IDLE';
  const isMonitoringState = state.appState === 'MONITORING';

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isMonitoringState) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isMonitoringState, pulseAnim]);

  // Register resume callback so cooldown → MONITORING works
  useEffect(() => {
    alertRef.current.setOnResume(() => {
      monitoringRef.current.resumeDetection();
    });
  }, []);

  // Handle transition into ALERT_COUNTDOWN cleanly without re-render thrashing
  useEffect(() => {
    if (state.appState === 'ALERT_COUNTDOWN') {
      monitoringRef.current.pauseDetection();
      alertRef.current.startAlert();

      const initialSeconds = state.settings.countdownSeconds;
      countdownValueRef.current = initialSeconds;
      setCountdownDisplay(initialSeconds);

      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      countdownTimerRef.current = setInterval(() => {
        countdownValueRef.current -= 1;
        setCountdownDisplay(countdownValueRef.current);

        if (countdownValueRef.current <= 0) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          alertRef.current.sendSOS();
        }
      }, 1000);
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      alertRef.current.stopAlertEffects();
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      alertRef.current.stopAlertEffects();
    };
  }, [state.appState, state.settings.countdownSeconds]);

  // Handle START button
  const handleStart = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission',
        'Location was denied. JerkGuard will work with accelerometer only. GPS speed detection will be unavailable.',
        [{ text: 'OK' }],
      );
    }
    monitoringRef.current.startMonitoring();
  }, []);

  // Handle STOP button
  const handleStop = useCallback(() => {
    alertRef.current.stopAlertEffects();
    monitoringRef.current.stopMonitoring();
  }, []);

  // Handle "I'M OK" button
  const handleImOk = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    alertRef.current.cancelAlert();
  }, []);

  // Status chip token styling
  const getStatusInfo = (appState: AppState) => {
    switch (appState) {
      case 'IDLE':
        return { label: '● Idle', color: colors.chipIdleText, bg: colors.chipIdleBg };
      case 'MONITORING':
        return { label: '● Monitoring', color: colors.chipMonitoringText, bg: colors.chipMonitoringBg };
      case 'ALERT_COUNTDOWN':
        return { label: '● ALERT', color: colors.chipAlertText, bg: colors.chipAlertBg };
      case 'CANCELLED':
        return { label: '● Cancelled (cooldown)', color: colors.warning, bg: colors.warningBg };
      case 'SOS_SENT':
        return { label: '● SOS Sent', color: colors.danger, bg: colors.dangerBg };
      default:
        return { label: '● Unknown', color: colors.textMuted, bg: colors.chipIdleBg };
    }
  };

  const statusInfo = getStatusInfo(state.appState);
  const currentThreshold = SENSITIVITY_THRESHOLDS[state.settings.sensitivity] ?? 0.8;

  // ── Full-screen alert overlay: #B3261E with cream text ─────────────────
  if (state.appState === 'ALERT_COUNTDOWN') {
    return (
      <View style={[styles.alertOverlay, { backgroundColor: colors.alertScreenBg }]}>
        <Text style={styles.alertEmoji}>🚨</Text>
        <Text style={[styles.alertTitle, { color: colors.alertScreenText }]}>CRASH DETECTED</Text>
        <Text style={[styles.alertSubtitle, { color: colors.alertScreenText }]}>
          Sending SOS in
        </Text>
        <Text style={[styles.countdownNumber, { color: colors.alertScreenText }]}>
          {countdownDisplay}
        </Text>
        <Text style={[styles.alertSubtitle, { color: colors.alertScreenText }]}>seconds</Text>

        {/* Pill-shaped I'M OK button */}
        <TouchableOpacity
          style={[styles.imOkButton, { backgroundColor: colors.safe }]}
          onPress={handleImOk}
          activeOpacity={0.8}
        >
          <Text style={[styles.imOkText, { color: colors.cardElevated }]}>I'M OK — STOP</Text>
        </TouchableOpacity>

        <Text style={[styles.alertInfo, { color: colors.alertScreenText }]}>
          Peak: {state.peakG.toFixed(2)}g • Speed: {state.currentSpeedKmh.toFixed(0)} km/h
        </Text>
      </View>
    );
  }

  // ── SOS Sent / Error overlay ───────────────────────────────────────────
  if (state.appState === 'SOS_SENT' && state.sosError) {
    return (
      <View style={[styles.alertOverlay, { backgroundColor: colors.alertScreenBg }]}>
        <Text style={styles.alertEmoji}>⚠️</Text>
        <Text style={[styles.alertTitle, { color: colors.alertScreenText }]}>EMAIL FAILED</Text>
        <Text style={[styles.alertSubtitle, { marginHorizontal: 20, color: colors.alertScreenText }]}>
          {state.sosError}
        </Text>
        <TouchableOpacity
          style={[styles.imOkButton, { backgroundColor: colors.warning }]}
          onPress={() => alertRef.current.retrySOS()}
          activeOpacity={0.8}
        >
          <Text style={[styles.imOkText, { color: colors.onCaramelText }]}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Normal Coffee-Shop UI ──────────────────────────────────────────────
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Status Chip */}
      <View style={[styles.statusChip, { backgroundColor: statusInfo.bg, borderColor: colors.border }]}>
        <Text style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.label}
        </Text>
      </View>

      {/* GPS Notice */}
      {isActive && !state.gpsAvailable && (
        <View style={[styles.noticeBar, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}>
          <Text style={[styles.noticeText, { color: colors.warning }]}>
            📍 GPS unavailable — using accelerometer only
          </Text>
        </View>
      )}

      {/* Hero Circular Button with Caramel Pulsing Ring while Monitoring */}
      <View style={styles.buttonWrapper}>
        {isMonitoringState && (
          <Animated.View
            style={[
              styles.pulsingRing,
              {
                borderColor: colors.pulsingRing,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}
        <TouchableOpacity
          style={[
            styles.mainButton,
            {
              backgroundColor: isActive ? colors.stopBtn : colors.startBtn,
              shadowColor: colors.shadowColor,
            },
          ]}
          onPress={isActive ? handleStop : handleStart}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isActive ? 'stop' : 'shield-checkmark'}
            size={40}
            color={isActive ? colors.stopBtnText : colors.startBtnText}
            style={{ marginBottom: 4 }}
          />
          <Text style={[styles.mainButtonText, { color: isActive ? colors.stopBtnText : colors.startBtnText }]}>
            {isActive ? 'STOP' : 'START'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Live Readouts in 20px Cards */}
      <View style={styles.readoutRow}>
        <View
          style={[
            styles.readoutCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.shadowColor,
            },
          ]}
        >
          <Text style={[styles.readoutLabel, { color: colors.textMuted }]}>Speed</Text>
          <Text style={[styles.readoutValue, { color: colors.text }]}>
            {state.currentSpeedKmh.toFixed(1)}
          </Text>
          <Text style={[styles.readoutUnit, { color: colors.textMuted }]}>km/h</Text>
        </View>

        <View
          style={[
            styles.readoutCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.shadowColor,
            },
          ]}
        >
          <Text style={[styles.readoutLabel, { color: colors.textMuted }]}>Impact G-Force</Text>
          <Text
            style={[
              styles.readoutValue,
              { color: state.currentG >= currentThreshold ? colors.danger : colors.text },
            ]}
          >
            {state.currentG.toFixed(2)}
          </Text>
          <Text style={[styles.readoutUnit, { color: colors.textMuted }]}>g</Text>
        </View>
      </View>

      {/* Live Chart in 20px Card */}
      {isActive && (
        <View
          style={[
            styles.chartContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.shadowColor,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Sensor Telemetry</Text>
          <LiveChart data={state.chartData} thresholdG={currentThreshold} />
        </View>
      )}

      {/* Last Event Card */}
      {state.lastEvent && (
        <View
          style={[
            styles.lastEventCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.shadowColor,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Last Event</Text>
          <Text style={[styles.eventDetail, { color: colors.textMuted }]}>
            {new Date(state.lastEvent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
          <View style={styles.eventRow}>
            <Text
              style={[
                styles.eventOutcome,
                {
                  color:
                    state.lastEvent.outcome === 'Cancelled'
                      ? colors.safe
                      : state.lastEvent.outcome === 'SOS sent'
                        ? colors.danger
                        : colors.warning,
                },
              ]}
            >
              {state.lastEvent.outcome === 'Cancelled' ? '✅ Cancelled' : state.lastEvent.outcome === 'SOS sent' ? '🚨 SOS Sent' : '⚠️ Email Failed'}
            </Text>
            <Text style={[styles.eventDetail, { color: colors.textMuted }]}>
              {state.lastEvent.peakG.toFixed(2)}g • {state.lastEvent.speedKmh.toFixed(0)} km/h
            </Text>
          </View>
        </View>
      )}

      {/* Cooldown feedback banner */}
      {state.appState === 'SOS_SENT' && !state.sosError && (
        <View style={[styles.feedbackBar, { backgroundColor: colors.safeBg, borderColor: colors.safe }]}>
          <Text style={[styles.feedbackText, { color: colors.safe }]}>
            ✅ SOS email sent. Resuming in {COOLDOWN_SECONDS}s...
          </Text>
        </View>
      )}

      {state.appState === 'CANCELLED' && (
        <View style={[styles.feedbackBar, { backgroundColor: colors.safeBg, borderColor: colors.safe }]}>
          <Text style={[styles.feedbackText, { color: colors.safe }]}>
            ✅ Alert stopped. Resuming in {COOLDOWN_SECONDS}s...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  statusChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.pill, // pill-shaped status chip
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  noticeBar: {
    padding: spacing.sm,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    marginBottom: spacing.md,
    width: '100%',
  },
  noticeText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonWrapper: {
    width: 190,
    height: 190,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  pulsingRing: {
    position: 'absolute',
    width: 184,
    height: 184,
    borderRadius: 92,
    borderWidth: 3,
    opacity: 0.65,
  },
  mainButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  mainButtonIcon: {
    fontSize: 34,
    marginBottom: 2,
  },
  mainButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 2,
  },
  readoutRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    width: '100%',
  },
  readoutCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.card, // 20px card
    alignItems: 'center',
    borderWidth: 1,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  readoutLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  readoutValue: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    fontVariant: ['tabular-nums'] as const,
  },
  readoutUnit: {
    fontSize: fontSize.xs,
    marginTop: 2,
    fontWeight: '600',
  },
  chartContainer: {
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.card, // 20px card
    borderWidth: 1,
    marginBottom: spacing.md,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  lastEventCard: {
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.card, // 20px card
    borderWidth: 1,
    marginBottom: spacing.md,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  eventOutcome: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  eventDetail: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  feedbackBar: {
    padding: spacing.md,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    width: '100%',
    marginTop: spacing.xs,
  },
  feedbackText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  // ── Alert overlay ────────────────────────────────────────────────────
  alertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  alertEmoji: {
    fontSize: 72,
    marginBottom: spacing.md,
  },
  alertTitle: {
    fontSize: fontSize.xl,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  alertSubtitle: {
    fontSize: fontSize.md,
    opacity: 0.9,
    textAlign: 'center',
    fontWeight: '600',
  },
  countdownNumber: {
    fontSize: 130,
    fontWeight: '900',
    fontVariant: ['tabular-nums'] as const,
    lineHeight: 145,
    marginVertical: spacing.sm,
  },
  imOkButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.pill, // pill-shaped button
    marginTop: spacing.lg,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minWidth: 260,
    alignItems: 'center',
  },
  imOkText: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
  alertInfo: {
    fontSize: fontSize.xs,
    opacity: 0.8,
    marginTop: spacing.xl,
    fontWeight: '600',
  },
});
