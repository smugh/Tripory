import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, ScreenContainer } from '@/components/ui';
import { APP_CONFIG } from '@/core/constants';
import { useUIStore } from '@/stores/ui-store';
import { useCategoryStore } from '@/stores/category-store';
import { useI18n } from '@/core/i18n';

interface SettingMenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  route: string;
  badgeLabel?: string;
  badgeVariant?: 'accent' | 'neutral' | 'success' | 'warning' | 'info';
}

export default function SettingsScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { t, language, format } = useI18n();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const gmailAccount = useUIStore((s) => s.gmailAccount);
  const categories = useCategoryStore((s) => s.categories);

  const menuItems: SettingMenuItem[] = [
    {
      id: 'categories',
      title: t.settings.categoriesSection,
      subtitle: t.settings.menuCategoriesDesc,
      icon: 'pricetags',
      iconColor: themeColors.brand.blue,
      iconBg: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF',
      route: '/settings/categories',
      badgeLabel: format(t.settings.menuBadgeCategories, { count: categories.length }),
      badgeVariant: 'info',
    },
    {
      id: 'permissions',
      title: t.settings.permissionsSection,
      subtitle: t.settings.menuPermissionsDesc,
      icon: 'shield-checkmark',
      iconColor: '#10B981',
      iconBg: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
      route: '/settings/permissions',
      badgeLabel: t.settings.menuBadgePermissions,
      badgeVariant: 'success',
    },
    {
      id: 'backup',
      title: t.settings.gmailSection,
      subtitle: t.settings.menuBackupDesc,
      icon: 'cloud-upload',
      iconColor: '#EA4335',
      iconBg: '#FEE2E2',
      route: '/settings/backup',
      badgeLabel: gmailAccount ? t.settings.gmailConnected : t.settings.gmailNotSet,
      badgeVariant: gmailAccount ? 'success' : 'neutral',
    },
    {
      id: 'language',
      title: t.settings.languageSection,
      subtitle: t.settings.menuLanguageDesc,
      icon: 'globe',
      iconColor: themeColors.brand.coral,
      iconBg: isDarkMode ? 'rgba(245, 107, 95, 0.15)' : '#FFF1F2',
      route: '/settings/language',
      badgeLabel: language === 'en' ? 'EN' : 'ID',
      badgeVariant: 'accent',
    },
    {
      id: 'appearance',
      title: t.settings.appearanceSection,
      subtitle: t.settings.menuAppearanceDesc,
      icon: 'color-palette',
      iconColor: '#8B5CF6',
      iconBg: isDarkMode ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF',
      route: '/settings/appearance',
      badgeLabel: isDarkMode ? 'Dark' : 'Light',
      badgeVariant: 'neutral',
    },
    {
      id: 'privacy',
      title: t.settings.dataSection,
      subtitle: t.settings.menuPrivacyDesc,
      icon: 'lock-closed',
      iconColor: '#0EA5E9',
      iconBg: isDarkMode ? 'rgba(14, 165, 233, 0.15)' : '#F0F9FF',
      route: '/settings/privacy',
    },
    {
      id: 'albums',
      title: t.settings.menuAlbumsTitle,
      subtitle: t.settings.menuAlbumsDesc,
      icon: 'images',
      iconColor: '#F59E0B',
      iconBg: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
      route: '/settings/albums',
    },
    {
      id: 'about',
      title: t.settings.aboutSection,
      subtitle: format(t.settings.menuAboutDesc, { version: APP_CONFIG.version }),
      icon: 'information-circle',
      iconColor: themeColors.brand.navy,
      iconBg: isDarkMode ? 'rgba(147, 197, 253, 0.15)' : '#F1F5F9',
      route: '/settings/about',
    },
  ];

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <Card variant="navy" style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.profileInfo}>
              <Typography variant="h3" color="#FFFFFF" style={styles.profileName}>
                {t.settings.profileName}
              </Typography>
              <Typography variant="caption" color="#CBD5E1" style={styles.profileDesc}>
                {t.settings.profileDesc}
              </Typography>
            </View>
          </View>
        </Card>

        {/* Section Header */}
        <Typography variant="label" color={themeColors.text.primary} style={styles.sectionHeader}>
          {language === 'en' ? 'System & Preferences' : 'Pengaturan & Preferensi'}
        </Typography>

        {/* Clean Menu List Card */}
        <Card elevated style={[styles.menuListCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          {menuItems.map((item, index) => {
            const isLast = index === menuItems.length - 1;
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.menuItemRow,
                  !isLast && { borderBottomColor: themeColors.border.muted, borderBottomWidth: 1 },
                  pressed && { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC' },
                ]}
                onPress={() => router.push(item.route as any)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={20} color={item.iconColor} />
                </View>

                <View style={styles.menuTextWrap}>
                  <Typography variant="body" color={themeColors.text.primary} style={styles.menuTitle}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color={themeColors.text.muted} style={styles.menuSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Typography>
                </View>

                <View style={styles.menuRightWrap}>
                  {item.badgeLabel && (
                    <Badge
                      label={item.badgeLabel}
                      variant={item.badgeVariant || 'neutral'}
                      size="sm"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Ionicons name="chevron-forward" size={18} color={themeColors.text.muted} />
                </View>
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing[1],
    paddingBottom: spacing[8],
  },
  profileCard: {
    padding: spacing[4],
    marginTop: 0,
    marginBottom: spacing[4],
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontWeight: '800',
  },
  profileDesc: {
    lineHeight: 18,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: spacing[2],
    marginLeft: 4,
    fontWeight: '700',
    fontSize: 13,
  },
  menuListCard: {
    borderRadius: radius.lg,
    paddingVertical: spacing[1],
    paddingHorizontal: 0,
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
    marginLeft: spacing[3],
    marginRight: spacing[2],
  },
  menuTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  menuSubtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  menuRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
