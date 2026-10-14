/**
 * src/screens/SettingsScreen.tsx
 *
 * Warm Coffee-Shop Themed Settings:
 * - Mocha & caramel segmented controls and pill buttons
 * - 20px card radius with soft warm shadows
 * - Automatic + manual Light / Dark ("espresso") theme switcher
 * - Test email and simulate jerk buttons using semantic/brand tokens
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { useAppContext } from '../state/AppContext';
import { sendTestEmail, isEmailConfigured } from '../services/emailService';
import { useThemeColors, spacing, borderRadius, fontSize } from '../theme';
import { MIN_COUNTDOWN_SECONDS, MAX_COUNTDOWN_SECONDS, SENSITIVITY_THRESHOLDS } from '../config';
import type { SensitivityLevel, ThemeMode } from '../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { state, dispatch, saveSettings } = useAppContext();
  const { settings } = state;

  const [testLoading, setTestLoading] = useState(false);

  const handleNameChange = (text: string) => {
    saveSettings({ userName: text });
  };

  const handleEmailChange = (text: string) => {
    saveSettings({ emergencyEmail: text });
  };

  const handleCountdownChange = (delta: number) => {
    const newVal = Math.min(
      MAX_COUNTDOWN_SECONDS,
      Math.max(MIN_COUNTDOWN_SECONDS, settings.countdownSeconds + delta),
    );
    saveSettings({ countdownSeconds: newVal });
  };

  const handleSensitivity = (level: SensitivityLevel) => {
    saveSettings({ sensitivity: level });
  };

  const handleThemeMode = (mode: ThemeMode) => {
    saveSettings({ themeMode: mode });
  };

  const handleTestEmail = async () => {
    if (!settings.emergencyEmail || !EMAIL_REGEX.test(settings.emergencyEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address first.');
      return;
    }
    if (!isEmailConfigured()) {
      Alert.alert(
        'EmailJS Not Configured',
        'Fill in the EXPO_PUBLIC_EMAILJS_* variables in your .env file. See README for instructions.',
      );
      return;
    }

    setTestLoading(true);
    try {
      await sendTestEmail(settings.emergencyEmail, settings.userName || 'Coffee-Shop Demo');
      Alert.alert(
        'Success ✅',
        `Dispatched to: ${settings.emergencyEmail}\n\nNote: If this still arrives in your own inbox, your EmailJS template "To Email" field is still set to your email instead of {{to_email}}.`,
      );
    } catch (err: any) {
      Alert.alert('Failed ❌', err.message);
    } finally {
      setTestLoading(false);
    }
  };

  const handleSimulateJerk = () => {
    if (state.appState !== 'MONITORING') {
      Alert.alert(
        'Start Monitoring First',
        'Tap START on the Home screen, then come back here to simulate a jerk.',
      );
      return;
    }
    dispatch({ type: 'START_ALERT', payload: { peakG: 4.2 } });
  };

  const emailValid = EMAIL_REGEX.test(settings.emergencyEmail);
  const currentThemeMode: ThemeMode = settings.themeMode ?? 'system';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Theme Mode Selector Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Automatic system mode or manual coffee theme
        </Text>
        <View style={styles.segmentedRow}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => {
            const isSelected = currentThemeMode === mode;
            const label = mode === 'system' ? 'Auto 🌗' : mode === 'light' ? 'Cream ☕' : 'Espresso 🌙';
            return (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.inputBg,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleThemeMode(mode)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: isSelected ? colors.onPrimary : colors.text,
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Emergency Profile Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>Emergency Contact</Text>

        <Text style={[styles.inputLabel, { color: colors.text }]}>Your Name</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={settings.userName}
          onChangeText={handleNameChange}
          placeholder="e.g. John Doe"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
        />

        <Text style={[styles.inputLabel, { color: colors.text, marginTop: spacing.md }]}>
          Emergency Contact Email
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              color: colors.text,
              borderColor: settings.emergencyEmail && !emailValid ? colors.danger : colors.border,
            },
          ]}
          value={settings.emergencyEmail}
          onChangeText={handleEmailChange}
          placeholder="e.g. contact@example.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {settings.emergencyEmail.length > 0 && !emailValid && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            Please enter a valid email address
          </Text>
        )}
      </View>

      {/* Tuning Controls Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>Alert Settings</Text>

        {/* Countdown Stepper */}
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          Countdown Duration: {settings.countdownSeconds}s
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Time before SOS is sent ({MIN_COUNTDOWN_SECONDS}–{MAX_COUNTDOWN_SECONDS}s)
        </Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleCountdownChange(-5)}
          >
            <Text style={[styles.stepperText, { color: colors.onPrimary }]}>−5</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleCountdownChange(-1)}
          >
            <Text style={[styles.stepperText, { color: colors.onPrimary }]}>−1</Text>
          </TouchableOpacity>

          <View style={[styles.stepperDisplay, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.stepperValue, { color: colors.text }]}>
              {settings.countdownSeconds}s
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleCountdownChange(1)}
          >
            <Text style={[styles.stepperText, { color: colors.onPrimary }]}>+1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleCountdownChange(5)}
          >
            <Text style={[styles.stepperText, { color: colors.onPrimary }]}>+5</Text>
          </TouchableOpacity>
        </View>

        {/* Sensitivity Segmented Control & Threshold Readout */}
        <View style={styles.thresholdHeaderRow}>
          <Text style={[styles.inputLabel, { color: colors.text, marginTop: spacing.md }]}>
            Jerk Sensitivity
          </Text>
          <View style={[styles.thresholdBadge, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Text style={[styles.thresholdBadgeText, { color: colors.onCaramelText }]}>
              Trigger: {SENSITIVITY_THRESHOLDS[settings.sensitivity] ?? 1.2}g
            </Text>
          </View>
        </View>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          High ({SENSITIVITY_THRESHOLDS.High}g) • Medium ({SENSITIVITY_THRESHOLDS.Medium}g) • Low ({SENSITIVITY_THRESHOLDS.Low}g)
        </Text>
        <View style={styles.segmentedRow}>
          {(['High', 'Medium', 'Low'] as SensitivityLevel[]).map((level) => {
            const isSelected = settings.sensitivity === level;
            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.inputBg,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleSensitivity(level)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: isSelected ? colors.onPrimary : colors.text,
                    },
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Action Buttons (Pill-shaped) */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.safe }]}
          onPress={handleTestEmail}
          disabled={testLoading}
          activeOpacity={0.85}
        >
          {testLoading ? (
            <ActivityIndicator color={colors.cardElevated} />
          ) : (
            <Text style={[styles.actionText, { color: colors.cardElevated }]}>
              📧 Send Test Email
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.accent }]}
          onPress={handleSimulateJerk}
          activeOpacity={0.85}
        >
          <Text style={[styles.actionText, { color: colors.onCaramelText }]}>
            💥 Simulate Jerk (Demo)
          </Text>
        </TouchableOpacity>
      </View>

      {/* EmailJS Status Card */}
      <View
        style={[
          styles.configStatus,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
          },
        ]}
      >
        <Text style={[styles.configTitle, { color: colors.text }]}>EmailJS Gateway Status</Text>
        <Text
          style={[
            styles.configValue,
            { color: isEmailConfigured() ? colors.safe : colors.danger },
          ]}
        >
          {isEmailConfigured() ? '✅ Configured (Ready to dispatch)' : '❌ Not configured — see README'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.card, // 20px card radius
    borderWidth: 1,
    marginBottom: spacing.md,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    marginBottom: 2,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  hint: {
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  input: {
    fontSize: fontSize.md,
    padding: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  errorText: {
    fontSize: fontSize.xs,
    marginTop: 4,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.pill, // pill stepper button
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperText: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  stepperDisplay: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    minWidth: 76,
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    fontVariant: ['tabular-nums'] as const,
  },
  thresholdHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  thresholdBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  thresholdBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.pill, // pill segmented button
    alignItems: 'center',
    borderWidth: 1,
  },
  segmentText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  actionSection: {
    marginTop: spacing.sm,
    gap: spacing.sm + 4,
  },
  actionBtn: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.pill, // fully rounded pill
    alignItems: 'center',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  configStatus: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  configTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  configValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
