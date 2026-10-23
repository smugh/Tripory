import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, ScreenContainer } from '@/components/ui';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

export default function AppearanceScreen() {
  const themeColors = useThemeColors();
  const { t, language } = useI18n();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Info Card */}
        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF' }]}>
              <Ionicons name="color-palette" size={24} color={themeColors.brand.blue} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.appearanceSection}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted} style={{ marginTop: 2 }}>
                {language === 'en'
                  ? 'Personalize screen themes, touch haptic vibrations, and visual contrast for clear visibility outdoors.'
                  : 'Sesuaikan tema tampilan layar, respons getaran haptik, dan kontras visual untuk kenyamanan di luar ruangan.'}
              </Typography>
            </View>
          </View>
        </Card>

        {/* Options Card */}
        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          {/* Dark Mode Toggle */}
          <View style={[styles.infoRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={styles.infoLeft}>
              <View style={[styles.optionIconWrap, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.2)' : '#EFF6FF' }]}>
                <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={18} color={isDarkMode ? '#38BDF8' : themeColors.brand.blue} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '600' }}>
                  {t.settings.darkMode}
                </Typography>
                <Typography variant="caption" color={themeColors.text.muted}>
                  {t.settings.darkModeDesc}
                </Typography>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              thumbColor="#FFFFFF"
              trackColor={{ false: themeColors.border.default, true: themeColors.brand.blue }}
            />
          </View>

          {/* Haptic Feedback */}
          <View style={[styles.infoRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={styles.infoLeft}>
              <View style={[styles.optionIconWrap, { backgroundColor: isDarkMode ? 'rgba(245, 107, 95, 0.2)' : '#FFF1F2' }]}>
                <Ionicons name="finger-print-outline" size={18} color={themeColors.brand.coral} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '600' }}>
                  {t.settings.haptics}
                </Typography>
                <Typography variant="caption" color={themeColors.text.muted}>
                  {t.settings.hapticsDesc}
                </Typography>
              </View>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              thumbColor="#FFFFFF"
              trackColor={{ false: themeColors.border.default, true: themeColors.brand.coral }}
            />
          </View>

          {/* High Contrast */}
          <View style={styles.infoRowLast}>
            <View style={styles.infoLeft}>
              <View style={[styles.optionIconWrap, { backgroundColor: isDarkMode ? 'rgba(147, 197, 253, 0.15)' : '#F1F5F9' }]}>
                <Ionicons name="contrast-outline" size={18} color={themeColors.brand.navy} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '600' }}>
                  {t.settings.contrast}
                </Typography>
                <Typography variant="caption" color={themeColors.text.muted}>
                  {t.settings.contrastDesc}
                </Typography>
              </View>
            </View>
            <Switch
              value={highContrast}
              onValueChange={setHighContrast}
              thumbColor="#FFFFFF"
              trackColor={{ false: themeColors.border.default, true: themeColors.brand.blue }}
            />
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  infoRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
});
