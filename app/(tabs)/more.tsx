import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, ScreenContainer } from '@/components/ui';
import { APP_CONFIG } from '@/core/constants';
import { useUIStore } from '@/stores/ui-store';
import { useCategoryStore } from '@/stores/category-store';
import { useI18n } from '@/core/i18n';
import { GUIDE_TOPICS } from '@/data/guide-data';

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

  const [searchQuery, setSearchQuery] = useState('');

  const allMenuItems: SettingMenuItem[] = [
    {
      id: 'guide',
      title: t.settings.menuGuideTitle,
      subtitle: t.settings.menuGuideDesc,
      icon: 'book',
      iconColor: '#059669',
      iconBg: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
      route: '/settings/guide',
      badgeLabel: t.settings.menuBadgeGuide,
      badgeVariant: 'success',
    },
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

  const filteredMenuItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allMenuItems;
    return allMenuItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    );
  }, [allMenuItems, searchQuery]);

  const matchedGuideTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return GUIDE_TOPICS.filter((topic) => {
      const title = (language === 'id' ? topic.title.id : topic.title.en).toLowerCase();
      const subtitle = (language === 'id' ? topic.subtitle.id : topic.subtitle.en).toLowerCase();
      const keywords = topic.keywords.join(' ').toLowerCase();
      return title.includes(q) || subtitle.includes(q) || keywords.includes(q);
    });
  }, [searchQuery, language]);

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* Search Bar for Settings & Guide */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: themeColors.surface.card,
              borderColor: themeColors.border.default,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={themeColors.text.muted}
            style={styles.searchIcon}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t.settings.menuSearchPlaceholder}
            placeholderTextColor={themeColors.text.muted}
            style={[styles.searchInput, { color: themeColors.text.primary }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              style={styles.clearSearchBtn}
            >
              <Ionicons name="close-circle" size={18} color={themeColors.text.muted} />
            </Pressable>
          )}
        </View>

        {/* Section Header */}
        <Typography variant="label" color={themeColors.text.primary} style={styles.sectionHeader}>
          {language === 'en' ? 'System & Preferences' : 'Pengaturan & Preferensi'}
        </Typography>

        {/* Clean Menu List Card or Search Results */}
        {filteredMenuItems.length > 0 ? (
          <Card
            elevated
            style={[
              styles.menuListCard,
              {
                backgroundColor: themeColors.surface.card,
                borderColor: themeColors.border.default,
              },
            ]}
          >
            {filteredMenuItems.map((item, index) => {
              const isLast = index === filteredMenuItems.length - 1;
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.menuItemRow,
                    !isLast && {
                      borderBottomColor: themeColors.border.muted,
                      borderBottomWidth: 1,
                    },
                    pressed && {
                      backgroundColor: isDarkMode
                        ? 'rgba(255, 255, 255, 0.04)'
                        : '#F8FAFC',
                    },
                  ]}
                  onPress={() => router.push(item.route as any)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon} size={20} color={item.iconColor} />
                  </View>

                  <View style={styles.menuTextWrap}>
                    <Typography
                      variant="body"
                      color={themeColors.text.primary}
                      style={styles.menuTitle}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={themeColors.text.muted}
                      style={styles.menuSubtitle}
                      numberOfLines={1}
                    >
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
        ) : (
          <Card
            elevated
            style={[
              styles.emptyCard,
              {
                backgroundColor: themeColors.surface.card,
                borderColor: themeColors.border.default,
              },
            ]}
          >
            <Ionicons name="search-outline" size={32} color={themeColors.text.muted} style={{ marginBottom: 8 }} />
            <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700', textAlign: 'center' }}>
              {format(t.settings.menuSearchEmpty, { query: searchQuery })}
            </Typography>
            <Typography variant="caption" color={themeColors.text.muted} style={{ textAlign: 'center', marginTop: 4 }}>
              {t.settings.menuSearchEmptyDesc}
            </Typography>
          </Card>
        )}

        {/* Matched Guide Topics Section when searching */}
        {searchQuery.trim().length > 0 && matchedGuideTopics.length > 0 && (
          <View style={styles.relatedGuidesSection}>
            <View style={styles.relatedGuidesHeader}>
              <Ionicons name="book-outline" size={16} color={themeColors.brand.navy} style={{ marginRight: 6 }} />
              <Typography variant="label" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.menuRelatedGuides} ({matchedGuideTopics.length})
              </Typography>
            </View>

            <Card
              elevated
              style={[
                styles.menuListCard,
                {
                  backgroundColor: themeColors.surface.card,
                  borderColor: themeColors.border.default,
                },
              ]}
            >
              {matchedGuideTopics.map((topic, index) => {
                const topicTitle = language === 'id' ? topic.title.id : topic.title.en;
                const topicSubtitle = language === 'id' ? topic.subtitle.id : topic.subtitle.en;
                const isLast = index === matchedGuideTopics.length - 1;

                return (
                  <Pressable
                    key={topic.id}
                    style={({ pressed }) => [
                      styles.menuItemRow,
                      !isLast && {
                        borderBottomColor: themeColors.border.muted,
                        borderBottomWidth: 1,
                      },
                      pressed && {
                        backgroundColor: isDarkMode
                          ? 'rgba(255, 255, 255, 0.04)'
                          : '#F8FAFC',
                      },
                    ]}
                    onPress={() => router.push('/settings/guide' as any)}
                  >
                    <View style={[styles.menuIconWrap, { backgroundColor: topic.iconBg }]}>
                      <Ionicons name={topic.icon} size={18} color={topic.iconColor} />
                    </View>
                    <View style={styles.menuTextWrap}>
                      <Typography
                        variant="body"
                        color={themeColors.text.primary}
                        style={styles.menuTitle}
                      >
                        {topicTitle}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={themeColors.text.muted}
                        style={styles.menuSubtitle}
                        numberOfLines={1}
                      >
                        {topicSubtitle}
                      </Typography>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={themeColors.brand.navy} />
                  </Pressable>
                );
              })}
            </Card>
          </View>
        )}
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
    marginBottom: spacing[3],
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    height: 44,
    marginBottom: spacing[3],
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
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
  emptyCard: {
    padding: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    marginBottom: spacing[4],
  },
  relatedGuidesSection: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  relatedGuidesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
    marginLeft: 4,
  },
});
