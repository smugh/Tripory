import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, ScreenContainer } from '@/components/ui';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

export default function LanguageScreen() {
  const themeColors = useThemeColors();
  const { t, language } = useI18n();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const setLanguage = useUIStore((s) => s.setLanguage);

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF' }]}>
              <Ionicons name="globe" size={24} color={themeColors.brand.blue} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.languageSection}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted} style={{ marginTop: 2 }}>
                {language === 'en'
                  ? 'Select your preferred language for menus, trip milestones, and guidance across Tripory.'
                  : 'Pilih bahasa preferensi Anda untuk menu, milestone perjalanan, dan panduan di Tripory.'}
              </Typography>
            </View>
          </View>
        </Card>

        {/* Language Options Card */}
        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <View style={styles.languageOptions}>
            {/* English (Default) */}
            <Pressable
              style={[
                styles.langOptionCard,
                { borderColor: language === 'en' ? themeColors.brand.blue : themeColors.border.default },
                language === 'en' && { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : '#EFF6FF' },
              ]}
              onPress={() => setLanguage('en')}
            >
              <View style={styles.langOptionLeft}>
                <View style={[styles.flagBadge, { backgroundColor: language === 'en' ? themeColors.brand.blue : themeColors.border.default }]}>
                  <Typography variant="caption" color="#FFFFFF" style={{ fontWeight: '800', fontSize: 11 }}>
                    EN
                  </Typography>
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: language === 'en' ? '700' : '500' }}>
                    {t.settings.languageEn}
                  </Typography>
                  <Typography variant="caption" color={themeColors.text.muted}>
                    Default • Global System Language
                  </Typography>
                </View>
              </View>
              {language === 'en' ? (
                <Ionicons name="checkmark-circle" size={22} color={themeColors.brand.blue} />
              ) : (
                <Ionicons name="ellipse-outline" size={20} color={themeColors.text.muted} />
              )}
            </Pressable>

            {/* Bahasa Indonesia */}
            <Pressable
              style={[
                styles.langOptionCard,
                { borderColor: language === 'id' ? themeColors.brand.coral : themeColors.border.default },
                language === 'id' && { backgroundColor: isDarkMode ? 'rgba(245, 107, 95, 0.12)' : '#FFF1F2' },
              ]}
              onPress={() => setLanguage('id')}
            >
              <View style={styles.langOptionLeft}>
                <View style={[styles.flagBadge, { backgroundColor: language === 'id' ? themeColors.brand.coral : themeColors.border.default }]}>
                  <Typography variant="caption" color="#FFFFFF" style={{ fontWeight: '800', fontSize: 11 }}>
                    ID
                  </Typography>
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: language === 'id' ? '700' : '500' }}>
                    {t.settings.languageId}
                  </Typography>
                  <Typography variant="caption" color={themeColors.text.muted}>
                    Bahasa Indonesia
                  </Typography>
                </View>
              </View>
              {language === 'id' ? (
                <Ionicons name="checkmark-circle" size={22} color={themeColors.brand.coral} />
              ) : (
                <Ionicons name="ellipse-outline" size={20} color={themeColors.text.muted} />
              )}
            </Pressable>
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
  languageOptions: {
    gap: spacing[3],
  },
  langOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  langOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
