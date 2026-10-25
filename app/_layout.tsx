import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useDatabase } from '@/hooks/useDatabase';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Button } from '@/components/ui';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

// Prevent the native splash screen from auto-hiding before ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { isDatabaseReady, schemaVersion, error, retry } = useDatabase();
  const themeColors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t } = useI18n();

  // In-app branded splash screen state
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const splashFadeAnim = useRef(new Animated.Value(1)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    // Gentle pulse animation on the logo
    Animated.spring(logoScaleAnim, {
      toValue: 1,
      tension: 30,
      friction: 7,
      useNativeDriver: true,
    }).start();

    if (isDatabaseReady) {
      // Hide native OS splash screen
      SplashScreen.hideAsync().catch(() => {});

      // Keep branded splash screen visible briefly so user enjoys the logo, then fade out smoothly
      const timer = setTimeout(() => {
        Animated.timing(splashFadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          setIsSplashVisible(false);
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isDatabaseReady, splashFadeAnim, logoScaleAnim]);

  // Error screen in case of persistent database failure
  if (error && !isDatabaseReady) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeColors.surface.page }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <Typography variant="h3" color={themeColors.status.error} style={styles.errorTitle}>
          {t.splash.dbErrorTitle}
        </Typography>
        <Typography variant="body" color={themeColors.text.secondary} style={styles.errorMessage}>
          {error}
        </Typography>
        {retry && (
          <Button
            variant="primary"
            label={t.splash.retryBtn}
            onPress={retry}
            style={styles.retryButton}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.rootWrapper}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Main Navigation Stack */}
      {isDatabaseReady && <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: themeColors.surface.card,
          },
          headerTintColor: themeColors.brand.navy,
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: themeColors.surface.page,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="memories/[id]"
          options={{
            title: 'Memories',
            headerBackTitle: t.trip.back,
          }}
        />
        <Stack.Screen
          name="trip/[id]"
          options={{
            title: t.trip.details,
            headerBackTitle: t.trip.back,
          }}
        />
        <Stack.Screen
          name="trip/new"
          options={{
            title: t.newTrip.screenTitle,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="destination/[id]"
          options={{
            title: t.destDetail.screenTitle,
            headerBackTitle: t.trip.back,
          }}
        />
        <Stack.Screen
          name="trip/close"
          options={{
            title: t.tripClose.screenTitle,
            headerBackTitle: t.trip.back,
          }}
        />
        <Stack.Screen
          name="settings/categories"
          options={{
            title: t.settings.categoriesSection,
            headerBackTitle: t.trip.back,
          }}
        />
        <Stack.Screen
          name="settings/permissions"
          options={{
            title: t.settings.permissionsSection,
            headerBackTitle: t.trip.back,
          }}
        />
        <Stack.Screen
          name="settings/backup"
          options={{
            title: t.settings.gmailSection,
            headerBackTitle: t.trip.back,
          }}
        />
        <Stack.Screen
          name="settings/language"
          options={{
            title: t.settings.languageSection,
            headerBackTitle: t.trip.back,
          }}
        />
        <Stack.Screen
          name="settings/appearance"
          options={{
            title: t.settings.appearanceSection,
            headerBackTitle: t.trip.back,
          }}
        />
        <Stack.Screen
          name="settings/privacy"
          options={{
            title: t.settings.dataSection,
            headerBackTitle: t.trip.back,
          }}
        />
        <Stack.Screen
          name="settings/about"
          options={{
            title: t.settings.aboutSection,
            headerBackTitle: t.trip.back,
          }}
        />
      </Stack>}

      {/* Branded Splash Screen Overlay with Primary Logo Centered */}
      {isSplashVisible && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.splashContainer,
            {
              backgroundColor: isDarkMode ? '#111C30' : '#FFFFFF',
              opacity: splashFadeAnim,
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.splashCenter}>
            <Animated.View style={{ transform: [{ scale: logoScaleAnim }] }}>
              <Image
                source={require('@/../assets/images/logo-horizontal.png')}
                style={styles.splashLogo}
                resizeMode="contain"
              />
            </Animated.View>

            <Typography
              variant="body"
              color={themeColors.text.secondary}
              style={styles.splashTagline}
            >
              {t.splash.tagline}
            </Typography>

            <View style={styles.loadingWrap}>
              <ActivityIndicator
                size="small"
                color={themeColors.brand.coral}
                style={styles.spinner}
              />
              <Typography variant="caption" color={themeColors.text.muted}>
                {t.splash.loading}
              </Typography>
            </View>
          </View>

          <View style={styles.splashFooter}>
            <Typography variant="caption" color={themeColors.text.muted}>
              Tripory v1.0.3 • Offline-First Travel Companion
            </Typography>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  splashCenter: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  splashLogo: {
    width: 300,
    maxWidth: '90%',
    height: 110,
  },
  splashTagline: {
    marginTop: spacing[3],
    fontSize: 13,
    letterSpacing: 0.8,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[6],
    gap: spacing[2],
  },
  spinner: {
    marginRight: 2,
  },
  splashFooter: {
    position: 'absolute',
    bottom: 36,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  errorTitle: {
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: spacing[4],
  },
  retryButton: {
    minWidth: 160,
  },
});
