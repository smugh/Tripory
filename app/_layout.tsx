import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useDatabase } from '@/hooks/useDatabase';
import { colors, spacing } from '@/core/theme';
import { Typography, Button } from '@/components/ui';

export default function RootLayout() {
  const { isDatabaseReady, schemaVersion, error, retry } = useDatabase();

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="dark" />
        <Typography variant="h3" color={colors.status.error} style={styles.errorTitle}>
          Terjadi Gangguan Database
        </Typography>
        <Typography variant="body" color={colors.text.secondary} style={styles.errorMessage}>
          {error}
        </Typography>
        {retry && (
          <Button
            variant="primary"
            label="Coba Muat Ulang"
            onPress={retry}
            style={styles.retryButton}
          />
        )}
      </View>
    );
  }

  if (!isDatabaseReady) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.brand.navy} />
        <Typography variant="caption" color={colors.text.secondary} style={styles.loadingText}>
          Menyiapkan database lokal Tripory...
        </Typography>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface.card,
          },
          headerTintColor: colors.brand.navy,
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: colors.surface.page,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="trip/[id]"
          options={{
            title: 'Detail Perjalanan',
            headerBackTitle: 'Kembali',
          }}
        />
        <Stack.Screen
          name="trip/new"
          options={{
            title: 'Buat Perjalanan',
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.page,
    padding: spacing[6],
  },
  loadingText: {
    marginTop: spacing[4],
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
