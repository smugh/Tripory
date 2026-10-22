import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, spacing } from '@/core/theme';
import { Typography, ScreenContainer } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Halaman Tidak Ditemukan' }} />
      <View style={styles.container}>
        <Typography variant="h2" color={colors.brand.navy} style={styles.title}>
          Halaman Tidak Ditemukan
        </Typography>
        <Typography variant="body" color={colors.text.secondary} style={styles.desc}>
          Rute yang Anda tuju tidak tersedia.
        </Typography>

        <Link href="/" style={styles.link}>
          <Typography variant="label" color={colors.brand.blue}>
            Kembali ke Beranda →
          </Typography>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
  },
  title: {
    marginBottom: spacing[2],
  },
  desc: {
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  link: {
    padding: spacing[3],
    minHeight: 44,
  },
});
