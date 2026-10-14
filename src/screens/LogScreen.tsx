/**
 * src/screens/LogScreen.tsx
 *
 * Warm Coffee-Shop Themed Incident Log:
 * - 20px card radius with soft warm shadows
 * - Semantic colors for event types:
 *   • Cancelled = Safe Green (#4F8A5B / #7DBB88)
 *   • SOS sent = Danger Red (#C0392B / #E5604F)
 *   • Email failed = Warning Amber (#D98324 / #E59B46)
 * - Clear all pill button with warm coffee tokens
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAppContext } from '../state/AppContext';
import { useThemeColors, spacing, borderRadius, fontSize } from '../theme';
import { STORAGE_KEYS } from '../config';
import { Ionicons } from '@expo/vector-icons';
import type { EventLogEntry } from '../types';

export default function LogScreen() {
  const colors = useThemeColors();
  const { state, dispatch } = useAppContext();

  const clearLog = async () => {
    dispatch({ type: 'SET_EVENT_LOG', payload: [] });
    await AsyncStorage.removeItem(STORAGE_KEYS.EVENT_LOG);
  };

  const getOutcomeColor = (outcome: EventLogEntry['outcome']) => {
    switch (outcome) {
      case 'Cancelled':
        return colors.safe;
      case 'SOS sent':
        return colors.danger;
      case 'Email failed':
        return colors.warning;
      default:
        return colors.textMuted;
    }
  };

  const renderOutcomeIcon = (outcome: EventLogEntry['outcome']) => {
    switch (outcome) {
      case 'Cancelled':
        return <Ionicons name="checkmark-circle" size={20} color={colors.safe} style={{ marginRight: 6 }} />;
      case 'SOS sent':
        return <Ionicons name="alert-circle" size={20} color={colors.danger} style={{ marginRight: 6 }} />;
      case 'Email failed':
        return <Ionicons name="warning" size={20} color={colors.warning} style={{ marginRight: 6 }} />;
      default:
        return <Ionicons name="cafe" size={20} color={colors.textMuted} style={{ marginRight: 6 }} />;
    }
  };

  const renderItem = ({ item }: { item: EventLogEntry }) => (
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
      <View style={styles.cardHeader}>
        {renderOutcomeIcon(item.outcome)}
        <Text style={[styles.cardOutcome, { color: getOutcomeColor(item.outcome) }]}>
          {item.outcome}
        </Text>
      </View>
      <Text style={[styles.cardTime, { color: colors.textMuted }]}>
        {new Date(item.timestamp).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </Text>
      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Peak G</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{item.peakG.toFixed(2)}g</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Speed</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{item.speedKmh.toFixed(0)} km/h</Text>
        </View>
        {item.location && (
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>GPS</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>📍 Attached</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {state.eventLog.length > 0 && (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {state.eventLog.length} Recorded Incident{state.eventLog.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={[styles.clearBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={clearLog}
            activeOpacity={0.8}
          >
            <Text style={[styles.clearText, { color: colors.danger }]}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={state.eventLog}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={56} color={colors.accent} style={{ marginBottom: spacing.md }} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              All Clear & Safe
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Detected crash and drop events will appear here with peak G-force and location details.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  headerTitle: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  clearBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  clearText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
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
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardIcon: {
    fontSize: 18,
    marginRight: spacing.xs + 2,
  },
  cardOutcome: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  cardTime: {
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  cardStats: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  stat: {},
  statLabel: {
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
});
