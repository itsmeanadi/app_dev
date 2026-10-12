/**
 * src/state/AppContext.tsx
 *
 * Global state for JerkGuard, managed via React Context + useReducer.
 *
 * STATE MACHINE:
 *   IDLE  ──▶  MONITORING  ──▶  ALERT_COUNTDOWN  ──▶  CANCELLED
 *                   ▲                                       │
 *                   │              (10 s cooldown)           │
 *                   └───────────────────────────────────────-┘
 *                   ▲                                       │
 *                   │          ALERT_COUNTDOWN  ──▶  SOS_SENT
 *                   │                                       │
 *                   └───────────────────────────────────────-┘
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STORAGE_KEYS,
  DEFAULT_COUNTDOWN_SECONDS,
  DEFAULT_SENSITIVITY,
} from '../config';
import type { AppState, SensitivityLevel, EventLogEntry, UserSettings, ChartDataPoint } from '../types';

// ─── State shape ────────────────────────────────────────────────────────────
interface State {
  appState: AppState;
  settings: UserSettings;
  settingsLoaded: boolean;
  currentG: number;
  peakG: number;
  currentSpeedKmh: number;
  countdownRemaining: number;
  gpsAvailable: boolean;
  eventLog: EventLogEntry[];
  chartData: ChartDataPoint[];
  lastEvent: EventLogEntry | null;
  sosError: string | null;
}

const initialState: State = {
  appState: 'IDLE',
  settings: {
    userName: '',
    emergencyEmail: '',
    countdownSeconds: DEFAULT_COUNTDOWN_SECONDS,
    sensitivity: DEFAULT_SENSITIVITY,
  },
  settingsLoaded: false,
  currentG: 0.0,
  peakG: 0,
  currentSpeedKmh: 0,
  countdownRemaining: DEFAULT_COUNTDOWN_SECONDS,
  gpsAvailable: false,
  eventLog: [],
  chartData: [],
  lastEvent: null,
  sosError: null,
};

// ─── Actions ────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_APP_STATE'; payload: AppState }
  | { type: 'SET_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'SETTINGS_LOADED'; payload: UserSettings }
  | { type: 'UPDATE_SENSOR_DATA'; payload: { g: number; speedKmh: number } }
  | { type: 'SET_COUNTDOWN'; payload: number }
  | { type: 'SET_GPS_AVAILABLE'; payload: boolean }
  | { type: 'ADD_EVENT'; payload: EventLogEntry }
  | { type: 'SET_EVENT_LOG'; payload: EventLogEntry[] }
  | { type: 'ADD_CHART_POINT'; payload: ChartDataPoint }
  | { type: 'CLEAR_CHART' }
  | { type: 'START_ALERT'; payload: { peakG: number } }
  | { type: 'SET_SOS_ERROR'; payload: string | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_APP_STATE':
      return { ...state, appState: action.payload };

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'SETTINGS_LOADED':
      return { ...state, settings: action.payload, settingsLoaded: true };

    case 'UPDATE_SENSOR_DATA':
      return {
        ...state,
        currentG: action.payload.g,
        currentSpeedKmh: action.payload.speedKmh,
        peakG: Math.max(state.peakG, action.payload.g),
      };

    case 'SET_COUNTDOWN':
      return { ...state, countdownRemaining: action.payload };

    case 'SET_GPS_AVAILABLE':
      return { ...state, gpsAvailable: action.payload };

    case 'ADD_EVENT': {
      const newLog = [action.payload, ...state.eventLog].slice(0, 100); // keep last 100
      return { ...state, eventLog: newLog, lastEvent: action.payload };
    }

    case 'SET_EVENT_LOG':
      return { ...state, eventLog: action.payload, lastEvent: action.payload[0] ?? null };

    case 'ADD_CHART_POINT': {
      const maxPoints = 50;
      const newData = [...state.chartData, action.payload];
      return {
        ...state,
        chartData: newData.length > maxPoints ? newData.slice(-maxPoints) : newData,
      };
    }

    case 'CLEAR_CHART':
      return { ...state, chartData: [] };

    case 'START_ALERT':
      return {
        ...state,
        appState: 'ALERT_COUNTDOWN',
        peakG: action.payload.peakG,
        countdownRemaining: state.settings.countdownSeconds,
        sosError: null,
      };

    case 'SET_SOS_ERROR':
      return { ...state, sosError: action.payload };

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────
interface AppContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;
  saveSettings: (settings: Partial<UserSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  addEventLog: (entry: EventLogEntry) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load settings and event log from AsyncStorage on mount
  const loadSettings = useCallback(async () => {
    try {
      const [name, email, countdown, sens, logJson, theme] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_NAME),
        AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_EMAIL),
        AsyncStorage.getItem(STORAGE_KEYS.COUNTDOWN_SECONDS),
        AsyncStorage.getItem(STORAGE_KEYS.SENSITIVITY),
        AsyncStorage.getItem(STORAGE_KEYS.EVENT_LOG),
        AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE),
      ]);

      dispatch({
        type: 'SETTINGS_LOADED',
        payload: {
          userName: name ?? '',
          emergencyEmail: email ?? '',
          countdownSeconds: countdown ? parseInt(countdown, 10) : DEFAULT_COUNTDOWN_SECONDS,
          sensitivity: (sens as SensitivityLevel) ?? DEFAULT_SENSITIVITY,
          themeMode: (theme as any) ?? 'system',
        },
      });

      if (logJson) {
        try {
          const parsed = JSON.parse(logJson) as EventLogEntry[];
          dispatch({ type: 'SET_EVENT_LOG', payload: parsed });
        } catch { /* corrupted log — ignore */ }
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
  }, []);

  // Save settings to AsyncStorage
  const saveSettings = useCallback(async (updates: Partial<UserSettings>) => {
    dispatch({ type: 'SET_SETTINGS', payload: updates });
    const merged = { ...stateRef.current.settings, ...updates };
    try {
      const promises = [
        AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, merged.userName),
        AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_EMAIL, merged.emergencyEmail),
        AsyncStorage.setItem(STORAGE_KEYS.COUNTDOWN_SECONDS, String(merged.countdownSeconds)),
        AsyncStorage.setItem(STORAGE_KEYS.SENSITIVITY, merged.sensitivity),
      ];
      if (merged.themeMode) {
        promises.push(AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, merged.themeMode));
      }
      await Promise.all(promises);
    } catch (err) {
      console.warn('Failed to save settings:', err);
    }
  }, []);

  // Add an event and persist the log
  const addEventLog = useCallback(async (entry: EventLogEntry) => {
    dispatch({ type: 'ADD_EVENT', payload: entry });
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEYS.EVENT_LOG);
      const log: EventLogEntry[] = existing ? JSON.parse(existing) : [];
      log.unshift(entry);
      await AsyncStorage.setItem(
        STORAGE_KEYS.EVENT_LOG,
        JSON.stringify(log.slice(0, 100)),
      );
    } catch (err) {
      console.warn('Failed to save event log:', err);
    }
  }, []);

  // Auto-load on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <AppContext.Provider value={{ state, dispatch, saveSettings, loadSettings, addEventLog }}>
      {children}
    </AppContext.Provider>
  );
}

/** Hook to access app state — throws if used outside AppProvider */
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>');
  return ctx;
}
