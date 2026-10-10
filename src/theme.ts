/**
 * src/theme.ts
 *
 * Warm Coffee-Shop UI Theme Tokens
 * Inspired by cream / mocha / caramel / espresso coffee-shop design aesthetics.
 *
 * All colors live here as tokens — NO hard-coded hex values in screens.
 */

import { useColorScheme } from 'react-native';
import { useAppContext } from './state/AppContext';

export interface ThemeColors {
  // Base backgrounds & surfaces
  background: string;         // Light: Cream (#FBEDD7) | Dark: Espresso (#2A1C16)
  card: string;               // Light: #FEF8F1 | Dark: #3A2A22
  cardElevated: string;       // Slightly elevated card
  border: string;             // Light: #DEBEA5 | Dark: #5A4338
  
  // Brand / Palette
  primary: string;            // Light: Mocha (#7A5648) | Dark: Caramel (#D2A782)
  primaryPressed: string;     // Pressed mocha state (#644236)
  onPrimary: string;          // Light: Cream (#FBEDD7) | Dark: Espresso (#2A1C16)
  accent: string;             // Caramel (#D2A782)
  heroTan: string;            // Splash / hero warm tan (#DBA67A)
  onCaramelText: string;      // #3B2A22 (accessible dark text for caramel/tan surfaces)

  // Typography
  text: string;               // Light: #3B2A22 | Dark: #FBEDD7
  textMuted: string;          // Light: #6F5246 | Dark: #D2B8A6

  // UI elements
  inputBg: string;            // Input background
  tabBar: string;             // Tab bar background (warm white #FFFDF9 / #241712)
  tabBarActivePill: string;   // Caramel active pill highlight (#D2A782)
  tabBarActiveText: string;   // Mocha / caramel
  tabBarInactive: string;     // textMuted
  shadowColor: string;        // #7A5648 for soft warm coffee shadows

  // Buttons & Controls
  startBtn: string;           // Mocha (#7A5648)
  startBtnText: string;       // Cream (#FBEDD7)
  stopBtn: string;            // Terracotta (#B5523B)
  stopBtnText: string;        // White (#FFFFFF)
  pulsingRing: string;        // Caramel (#D2A782)

  // Semantic Colors (NEVER brown palette for these)
  safe: string;               // Safe / monitoring / I'm OK (#4F8A5B / #7DBB88)
  safeBg: string;             // Safe chip / badge background
  warning: string;            // Warning (#D98324)
  warningBg: string;          // Warning chip background
  danger: string;             // Alert / SOS / danger (#C0392B / #E5604F)
  dangerBg: string;           // Danger chip background
  alertScreenBg: string;      // #B3261E with cream text
  alertScreenText: string;    // Cream (#FBEDD7)

  // Graph Colors
  graphGLine: string;         // Mocha (#7A5648 in light / #D2A782 in dark)
  graphGFill: string;         // Caramel with 25% opacity
  graphSpeedLine: string;     // Sage green (#5B8C5A)
  graphThresholdLine: string; // Terracotta (#B5523B)
  graphGrid: string;          // Border color

  // Status Chips
  chipIdleBg: string;         // Sand (#EED9C4 / #453229)
  chipIdleText: string;       // Brown (#3B2A22 / #FBEDD7)
  chipMonitoringBg: string;   // Safe green tint
  chipMonitoringText: string; // Safe green
  chipAlertBg: string;        // Danger red tint
  chipAlertText: string;      // Danger red
}

export const lightCoffeeTheme: ThemeColors = {
  background: '#FBEDD7',
  card: '#FEF8F1',
  cardElevated: '#FFFFFF',
  border: '#DEBEA5',

  primary: '#7A5648',
  primaryPressed: '#644236',
  onPrimary: '#FBEDD7',
  accent: '#D2A782',
  heroTan: '#DBA67A',
  onCaramelText: '#3B2A22',

  text: '#3B2A22',
  textMuted: '#6F5246',

  inputBg: '#F7EDE1',
  tabBar: '#FFFDF9',
  tabBarActivePill: '#E8CAAF',
  tabBarActiveText: '#7A5648',
  tabBarInactive: '#8C6C5E',
  shadowColor: '#7A5648',

  startBtn: '#7A5648',
  startBtnText: '#FBEDD7',
  stopBtn: '#B5523B',
  stopBtnText: '#FFFFFF',
  pulsingRing: '#D2A782',

  // Semantic
  safe: '#4F8A5B',
  safeBg: '#E4F2E7',
  warning: '#D98324',
  warningBg: '#FDF1E2',
  danger: '#C0392B',
  dangerBg: '#FBEBE9',
  alertScreenBg: '#B3261E',
  alertScreenText: '#FBEDD7',

  // Graph
  graphGLine: '#7A5648',
  graphGFill: 'rgba(210, 167, 130, 0.25)',
  graphSpeedLine: '#5B8C5A',
  graphThresholdLine: '#B5523B',
  graphGrid: '#DEBEA5',

  // Chips
  chipIdleBg: '#EED9C4',
  chipIdleText: '#3B2A22',
  chipMonitoringBg: '#E4F2E7',
  chipMonitoringText: '#4F8A5B',
  chipAlertBg: '#FBEBE9',
  chipAlertText: '#C0392B',
};

export const darkEspressoTheme: ThemeColors = {
  background: '#2A1C16',
  card: '#3A2A22',
  cardElevated: '#44332A',
  border: '#5A4338',

  primary: '#D2A782',
  primaryPressed: '#B88E6A',
  onPrimary: '#2A1C16', // Buttons in dark use dark text on caramel
  accent: '#D2A782',
  heroTan: '#DBA67A',
  onCaramelText: '#3B2A22',

  text: '#FBEDD7',
  textMuted: '#D2B8A6',

  inputBg: '#2E1E17',
  tabBar: '#201510',
  tabBarActivePill: '#4A352B',
  tabBarActiveText: '#D2A782',
  tabBarInactive: '#96796A',
  shadowColor: '#120B08',

  startBtn: '#7A5648',
  startBtnText: '#FBEDD7',
  stopBtn: '#B5523B',
  stopBtnText: '#FFFFFF',
  pulsingRing: '#D2A782',

  // Semantic
  safe: '#7DBB88',
  safeBg: '#1E3624',
  warning: '#E59B46',
  warningBg: '#3E2914',
  danger: '#E5604F',
  dangerBg: '#3F1C18',
  alertScreenBg: '#B3261E',
  alertScreenText: '#FBEDD7',

  // Graph
  graphGLine: '#D2A782',
  graphGFill: 'rgba(210, 167, 130, 0.25)',
  graphSpeedLine: '#7DBB88',
  graphThresholdLine: '#E5604F',
  graphGrid: '#5A4338',

  // Chips
  chipIdleBg: '#453229',
  chipIdleText: '#FBEDD7',
  chipMonitoringBg: '#1E3624',
  chipMonitoringText: '#7DBB88',
  chipAlertBg: '#3F1C18',
  chipAlertText: '#E5604F',
};

/**
 * Hook to retrieve the current active theme colors based on
 * user settings ('system', 'light', 'dark') and system color scheme.
 */
export function useThemeColors(): ThemeColors {
  const systemScheme = useColorScheme();
  const { state } = useAppContext();
  
  const mode = state.settings.themeMode ?? 'system';
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  return isDark ? darkEspressoTheme : lightCoffeeTheme;
}

/** Check if current active mode is dark */
export function useIsDark(): boolean {
  const systemScheme = useColorScheme();
  const { state } = useAppContext();
  const mode = state.settings.themeMode ?? 'system';
  return mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
}

/** Shared spacing scale */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 36,
} as const;

/** Pill-shaped buttons and 20px card radius matching the coffee kit */
export const borderRadius = {
  sm: 8,
  md: 12,
  card: 20,     // 20px radius on cards as requested
  pill: 999,    // fully rounded pill buttons
  full: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
  xxl: 36,
  giant: 96,
} as const;
