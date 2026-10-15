/**
 * App.tsx
 *
 * Root of the JerkGuard app. Sets up:
 * - AppProvider (global state)
 * - Launch / Splash Screen (1.5 s warm tan #DBA67A hero screen)
 * - Bottom tab navigation (Home, Settings, Log) with coffee-shop pill highlights
 * - Automatic + manual light/dark theme support
 */

import React, { useState, useEffect } from 'react';
import { StatusBar, View, Text, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AppProvider } from './src/state/AppContext';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LogScreen from './src/screens/LogScreen';
import { useThemeColors, useIsDark, borderRadius } from './src/theme';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

/**
 * Tab icon helper using vector icons
 */
function getTabIconName(routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap {
  switch (routeName) {
    case 'Home':
      return focused ? 'shield' : 'shield-outline';
    case 'Settings':
      return focused ? 'settings' : 'settings-outline';
    case 'Log':
      return focused ? 'document-text' : 'document-text-outline';
    default:
      return focused ? 'cafe' : 'cafe-outline';
  }
}

/**
 * 1.5 s Coffee-Shop themed Launch / Splash screen
 * Tan (#DBA67A) background, shield icon, "JerkGuard", and slogan.
 */
function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1500); // 1.5 s
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={splashStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#DBA67A" />
      <View style={splashStyles.card}>
        <View style={splashStyles.iconCircle}>
          <Ionicons name="shield-checkmark" size={50} color="#7A5648" />
        </View>
        <Text style={splashStyles.appName}>JerkGuard</Text>
        <View style={splashStyles.pillTag}>
          <Text style={splashStyles.pillTagText}>Coffee-Shop Edition</Text>
        </View>
        <Text style={splashStyles.slogan}>Ride safe. Get help fast.</Text>
      </View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DBA67A', // hero tan
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEF8F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#7A5648',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  shieldIcon: {
    fontSize: 48,
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#3B2A22',
    letterSpacing: 1,
    marginBottom: 8,
  },
  pillTag: {
    backgroundColor: '#7A5648',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  pillTagText: {
    color: '#FBEDD7',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  slogan: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B2A22',
    opacity: 0.85,
    textAlign: 'center',
  },
});

function AppContent() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerStyle: {
              backgroundColor: colors.card,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 18,
              color: colors.text,
            },
            tabBarStyle: {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              paddingBottom: 10,
              paddingTop: 8,
              height: 68,
              elevation: 4,
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
            },
            tabBarActiveTintColor: colors.tabBarActiveText,
            tabBarInactiveTintColor: colors.tabBarInactive,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '700',
              marginTop: 2,
            },
            tabBarIcon: ({ focused }) => {
              const iconName = getTabIconName(route.name, focused);
              return (
                <View
                  style={[
                    styles.tabIconPill,
                    focused && {
                      backgroundColor: colors.tabBarActivePill,
                    },
                  ]}
                >
                  <Ionicons
                    name={iconName}
                    size={22}
                    color={focused ? colors.tabBarActiveText : colors.tabBarInactive}
                  />
                </View>
              );
            },
          })}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'JerkGuard' }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
          <Tab.Screen
            name="Log"
            component={LogScreen}
            options={{ title: 'Incident Log' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  tabIconPill: {
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
    height: 30,
  },
});

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
