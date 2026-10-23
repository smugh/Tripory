import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, ScreenContainer } from '@/components/ui';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

export default function PrivacyScreen() {
  const themeColors = useThemeColors();
  const { t, language } = useI18n();
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  const handleBackupInfo = () => {
    Alert.alert(
      t.settings.backupAlertTitle,
      t.settings.backupAlertDesc,
      [{ text: t.settings.understood }]
    );
  };

  const handleExportSummary = () => {
    Alert.alert(
      t.settings.exportAlertTitle,
      t.settings.exportAlertDesc,
      [{ text: t.settings.ok }]
    );
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
              <Ionicons name="lock-closed" size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.dataSection}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted} style={{ marginTop: 2 }}>
                {language === 'en'
                  ? 'All journeys, routes, photos, and inventories remain strictly on your device. Zero telemetry, zero cloud tracking.'
                  : 'Semua perjalanan, rute, foto, dan inventaris tersimpan di perangkat Anda. Tanpa telemetri dan tanpa pelacakan cloud.'}
              </Typography>
            </View>
          </View>
        </Card>

        {/* Actions Card */}
        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <Pressable style={[styles.actionRow, { borderBottomColor: themeColors.border.muted }]} onPress={handleBackupInfo}>
            <View style={styles.infoLeft}>
              <View style={[styles.optionIconWrap, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '600' }}>
                  {t.settings.securityBackup}
                </Typography>
                <Typography variant="caption" color={themeColors.text.muted}>
                  {t.settings.securityBackupDesc}
                </Typography>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color={themeColors.text.muted} />
          </Pressable>

          <Pressable style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={handleExportSummary}>
            <View style={styles.infoLeft}>
              <View style={[styles.optionIconWrap, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.2)' : '#EFF6FF' }]}>
                <Ionicons name="share-outline" size={18} color={themeColors.brand.blue} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '600' }}>
                  {t.settings.exportSummary}
                </Typography>
                <Typography variant="caption" color={themeColors.text.muted}>
                  {t.settings.exportSummaryDesc}
                </Typography>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color={themeColors.text.muted} />
          </Pressable>
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
  card: {
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
});
