import React from 'react';
import { Alert, Linking, Pressable, View, StyleSheet, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, ScreenContainer } from '@/components/ui';
import { APP_CONFIG } from '@/core/constants';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

export default function AboutScreen() {
  const themeColors = useThemeColors();
  const { t, language, format } = useI18n();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const supportNumber = '+62 851-7976-5891';

  const openWhatsApp = async () => {
    try {
      await Linking.openURL('https://wa.me/6285179765891');
    } catch {
      Alert.alert('Tripory', t.settings.whatsappOpenFailed);
    }
  };

  const copySupportNumber = async () => {
    try {
      await Clipboard.setStringAsync('085179765891');
      Alert.alert(t.settings.numberCopiedTitle, t.settings.numberCopiedMessage);
    } catch {
      Alert.alert(t.settings.copyFailedTitle, t.settings.copyFailedMessage);
    }
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Card */}
        <Card elevated style={[styles.brandCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <Image
            source={require('@/../assets/images/logo-icon.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Typography variant="h2" color={themeColors.brand.navy} style={styles.brandTitle}>
            Tripory
          </Typography>
          <Typography variant="body" color={themeColors.brand.coral} style={styles.brandSubtitle}>
            {format(t.settings.aboutSubtitle, { version: APP_CONFIG.version })}
          </Typography>
          <Typography variant="body" color={themeColors.text.secondary} style={styles.brandDesc}>
            {t.settings.aboutText}
          </Typography>
        </Card>

        <Typography variant="label" color={themeColors.text.primary} style={styles.sectionHeader}>
          {t.settings.teamNoteTitle}
        </Typography>
        <Card elevated style={[styles.teamCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <Typography variant="body" color={themeColors.text.secondary} style={styles.teamNoteBody}>
            {t.settings.teamNoteBody}
          </Typography>
          <Pressable accessibilityRole="link" onPress={openWhatsApp} style={({ pressed }) => [styles.contactRow, { borderColor: themeColors.border.default, backgroundColor: themeColors.surface.muted, opacity: pressed ? 0.7 : 1 }]}>
            <View style={[styles.contactIcon, { backgroundColor: '#E8F8EF' }]}><Ionicons name="logo-whatsapp" size={20} color="#25A55B" /></View>
            <View style={styles.contactText}>
              <Typography variant="label" color={themeColors.text.primary}>{t.settings.contactWhatsApp}</Typography>
              <Typography variant="caption" color={themeColors.text.secondary}>{supportNumber}</Typography>
            </View>
            <Ionicons name="open-outline" size={18} color={themeColors.text.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${t.settings.copyNumber}: ${supportNumber}`} onPress={copySupportNumber} style={({ pressed }) => [styles.contactRow, { borderColor: themeColors.border.default, backgroundColor: themeColors.surface.muted, opacity: pressed ? 0.7 : 1 }]}>
            <View style={[styles.contactIcon, { backgroundColor: '#EAF2FF' }]}><Ionicons name="wallet-outline" size={20} color={themeColors.brand.blue} /></View>
            <View style={styles.contactText}>
              <Typography variant="label" color={themeColors.text.primary}>{t.settings.supportGopay}</Typography>
              <Typography variant="caption" color={themeColors.text.secondary}>{supportNumber} · a.n. Smugh</Typography>
            </View>
            <View style={styles.copyAction}>
              <Ionicons name="copy-outline" size={15} color={themeColors.brand.blue} />
              <Typography variant="caption" color={themeColors.brand.blue}>{t.settings.copyNumber}</Typography>
            </View>
          </Pressable>
        </Card>

        {/* Core Pillars Card */}
        <Typography variant="label" color={themeColors.text.primary} style={styles.sectionHeader}>
          {language === 'en' ? 'Core Architecture' : 'Arsitektur Utama'}
        </Typography>

        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <View style={[styles.pillarRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={[styles.pillarIconWrap, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF' }]}>
              <Ionicons name="cloud-offline" size={20} color={themeColors.brand.blue} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {language === 'en' ? '100% Local-First' : '100% Lokal-First'}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted}>
                {language === 'en'
                  ? 'All data is stored directly in your local device SQLite storage. Works seamlessly offline without internet.'
                  : 'Semua data tersimpan langsung di SQLite perangkat lokal. Berfungsi penuh tanpa internet.'}
              </Typography>
            </View>
          </View>

          <View style={[styles.pillarRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={[styles.pillarIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {language === 'en' ? 'Private & Secure' : 'Privat & Aman'}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted}>
                {language === 'en'
                  ? 'Zero telemetry, tracking, or external analytics. Your travels remain your personal memories.'
                  : 'Tanpa pelacakan atau analitik luar. Perjalanan Anda sepenuhnya menjadi arsip pribadi Anda.'}
              </Typography>
            </View>
          </View>

          <View style={styles.pillarRowLast}>
            <View style={[styles.pillarIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="mail" size={20} color="#EA4335" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {language === 'en' ? 'Personal Gmail Backup' : 'Pencadangan Gmail Pribadi'}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted}>
                {language === 'en'
                  ? 'Optional one-tap offline data package dispatch to your personal Gmail whenever you want.'
                  : 'Ekspor cadangan data offline satu ketukan ke email Gmail pribadi kapan pun Anda mau.'}
              </Typography>
            </View>
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: spacing[3],
    paddingBottom: spacing[8],
  },
  brandCard: {
    padding: spacing[6],
    marginBottom: spacing[4],
    borderRadius: radius.xl,
    alignItems: 'center',
    textAlign: 'center',
  },
  brandLogo: {
    width: 64,
    height: 64,
    marginBottom: spacing[2],
  },
  brandTitle: {
    fontWeight: '800',
    marginTop: spacing[1],
  },
  brandSubtitle: {
    fontWeight: '700',
    marginTop: 2,
    marginBottom: spacing[3],
  },
  brandDesc: {
    textAlign: 'center',
    lineHeight: 22,
  },
  teamCard: {
    marginBottom: spacing[4],
    padding: spacing[4],
    borderRadius: radius.lg,
    gap: spacing[3],
  },
  teamNoteBody: {
    lineHeight: 22,
  },
  contactRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  contactIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    flex: 1,
    gap: 3,
  },
  copyAction: {
    alignItems: 'center',
    gap: 2,
  },
  sectionHeader: {
    marginBottom: spacing[2],
    marginLeft: 4,
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
  },
  pillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  pillarRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  pillarIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
