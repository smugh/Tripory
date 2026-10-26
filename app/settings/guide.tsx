import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, ScreenContainer } from '@/components/ui';
import { useI18n } from '@/core/i18n';
import { useUIStore } from '@/stores/ui-store';
import { GUIDE_TOPICS, GuideTopic } from '@/data/guide-data';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type FilterCategory = 'all' | 'trips' | 'packing' | 'agenda' | 'memories' | 'settings';

export default function GuideScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { t, language, format } = useI18n();
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(() => new Set(['overview', 'tripPlanning']));
  const [previewImage, setPreviewImage] = useState<{ source: any; caption: string } | null>(null);

  const categories: { key: FilterCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: t.guide.filterAll, icon: 'grid-outline' },
    { key: 'trips', label: t.guide.filterTrips, icon: 'map-outline' },
    { key: 'packing', label: t.guide.filterPacking, icon: 'briefcase-outline' },
    { key: 'agenda', label: t.guide.filterAgenda, icon: 'cart-outline' },
    { key: 'memories', label: t.guide.filterMemories, icon: 'images-outline' },
    { key: 'settings', label: t.guide.filterSettings, icon: 'settings-outline' },
  ];

  const filteredTopics = useMemo(() => {
    return GUIDE_TOPICS.filter((topic) => {
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'trips' && topic.category !== 'trips' && topic.category !== 'general') {
          return false;
        }
        if (selectedCategory !== 'trips' && topic.category !== selectedCategory) {
          return false;
        }
      }

      // Search filter
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const title = (language === 'id' ? topic.title.id : topic.title.en).toLowerCase();
      const subtitle = (language === 'id' ? topic.subtitle.id : topic.subtitle.en).toLowerCase();
      const tip = (language === 'id' ? topic.tip.id : topic.tip.en).toLowerCase();
      const steps = (language === 'id' ? topic.steps.id : topic.steps.en).join(' ').toLowerCase();
      const keywords = topic.keywords.join(' ').toLowerCase();

      return (
        title.includes(q) ||
        subtitle.includes(q) ||
        tip.includes(q) ||
        steps.includes(q) ||
        keywords.includes(q)
      );
    });
  }, [selectedCategory, searchQuery, language]);

  const toggleExpand = (id: string) => {
    setExpandedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedTopicIds(new Set(GUIDE_TOPICS.map((top) => top.id)));
  };

  const handleCollapseAll = () => {
    setExpandedTopicIds(new Set());
  };

  const isAllExpanded = expandedTopicIds.size === GUIDE_TOPICS.length;

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Header Card */}
        <Card variant="navy" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="book" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.heroTextWrap}>
              <Typography variant="h2" color="#FFFFFF" style={styles.heroTitle}>
                {t.guide.heroTitle}
              </Typography>
              <Typography variant="caption" color="#CBD5E1" style={styles.heroSubtitle}>
                {t.guide.heroSubtitle}
              </Typography>
            </View>
          </View>
        </Card>

        {/* Search Input Bar */}
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
            placeholder={t.guide.searchPlaceholder}
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

        {/* Category Pills (Horizontal Scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => setSelectedCategory(cat.key)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected
                      ? themeColors.brand.navy
                      : themeColors.surface.card,
                    borderColor: isSelected
                      ? themeColors.brand.navy
                      : themeColors.border.default,
                  },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isSelected ? '#FFFFFF' : themeColors.text.secondary}
                  style={{ marginRight: 6 }}
                />
                <Typography
                  variant="caption"
                  color={isSelected ? '#FFFFFF' : themeColors.text.secondary}
                  style={{ fontWeight: isSelected ? '700' : '500' }}
                >
                  {cat.label}
                </Typography>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Quick Stats & Expand/Collapse Toggle */}
        <View style={styles.actionRow}>
          <Typography variant="caption" color={themeColors.text.muted}>
            {filteredTopics.length}{' '}
            {language === 'id' ? 'topik panduan' : 'topics available'}
          </Typography>
          <Pressable
            onPress={isAllExpanded ? handleCollapseAll : handleExpandAll}
            hitSlop={8}
            style={styles.toggleExpandBtn}
          >
            <Ionicons
              name={isAllExpanded ? 'contract-outline' : 'expand-outline'}
              size={14}
              color={themeColors.brand.navy}
            />
            <Typography
              variant="caption"
              color={themeColors.brand.navy}
              style={styles.toggleExpandText}
            >
              {isAllExpanded ? t.guide.collapseAll : t.guide.expandAll}
            </Typography>
          </Pressable>
        </View>

        {/* Topics List or Empty State */}
        {filteredTopics.length === 0 ? (
          <Card elevated style={[styles.emptyCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9' }]}>
              <Ionicons name="search-outline" size={36} color={themeColors.text.muted} />
            </View>
            <Typography variant="h3" color={themeColors.text.primary} style={styles.emptyTitle}>
              {t.guide.emptyTitle}
            </Typography>
            <Typography variant="body" color={themeColors.text.secondary} style={styles.emptyDesc}>
              {format(t.guide.emptyDesc, { query: searchQuery })}
            </Typography>
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              style={[styles.resetSearchBtn, { backgroundColor: themeColors.brand.navy }]}
            >
              <Typography variant="label" color="#FFFFFF">
                {t.guide.clearSearchBtn}
              </Typography>
            </Pressable>
          </Card>
        ) : (
          filteredTopics.map((topic, index) => {
            const isExpanded = expandedTopicIds.has(topic.id);
            const topicTitle = language === 'id' ? topic.title.id : topic.title.en;
            const topicSubtitle = language === 'id' ? topic.subtitle.id : topic.subtitle.en;
            const topicBadge = language === 'id' ? topic.badge.id : topic.badge.en;
            const topicCaption = language === 'id' ? topic.imageCaption.id : topic.imageCaption.en;
            const topicSteps = language === 'id' ? topic.steps.id : topic.steps.en;
            const topicTip = language === 'id' ? topic.tip.id : topic.tip.en;
            const actionLabel = topic.actionLabel
              ? (language === 'id' ? topic.actionLabel.id : topic.actionLabel.en)
              : t.guide.quickActionBtn;

            return (
              <Card
                key={topic.id}
                elevated
                style={[
                  styles.topicCard,
                  {
                    backgroundColor: themeColors.surface.card,
                    borderColor: themeColors.border.default,
                  },
                ]}
              >
                {/* Topic Header Accordion Trigger */}
                <Pressable
                  onPress={() => toggleExpand(topic.id)}
                  style={styles.topicHeader}
                  accessibilityRole="button"
                  accessibilityLabel={topicTitle}
                >
                  <View style={[styles.topicIconWrap, { backgroundColor: topic.iconBg }]}>
                    <Ionicons name={topic.icon} size={22} color={topic.iconColor} />
                  </View>
                  <View style={styles.topicTitleWrap}>
                    <View style={styles.topicBadgeRow}>
                      <Badge
                        label={topicBadge}
                        variant="neutral"
                        size="sm"
                        style={{ alignSelf: 'flex-start', marginBottom: 4 }}
                      />
                    </View>
                    <Typography
                      variant="h3"
                      color={themeColors.text.primary}
                      style={styles.topicTitle}
                    >
                      {topicTitle}
                    </Typography>
                    {!isExpanded && (
                      <Typography
                        variant="caption"
                        color={themeColors.text.muted}
                        numberOfLines={1}
                        style={{ marginTop: 2 }}
                      >
                        {topicSubtitle}
                      </Typography>
                    )}
                  </View>
                  <View style={styles.chevronWrap}>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={themeColors.text.muted}
                    />
                  </View>
                </Pressable>

                {/* Collapsible Content Body */}
                {isExpanded && (
                  <View style={styles.topicBody}>
                    <Typography
                      variant="body"
                      color={themeColors.text.secondary}
                      style={styles.topicDescription}
                    >
                      {topicSubtitle}
                    </Typography>

                    {/* Screenshot Frame */}
                    <View
                      style={[
                        styles.screenshotFrame,
                        {
                          backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
                          borderColor: themeColors.border.default,
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() =>
                          setPreviewImage({
                            source: topic.image,
                            caption: topicCaption,
                          })
                        }
                        accessibilityRole="imagebutton"
                        accessibilityLabel={topicCaption}
                        style={styles.screenshotPressable}
                      >
                        <Image
                          source={topic.image}
                          style={styles.screenshotImage}
                          resizeMode="contain"
                        />
                        <View style={styles.tapToZoomPill}>
                          <Ionicons name="scan-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Typography variant="caption" color="#FFFFFF" style={{ fontSize: 11, fontWeight: '600' }}>
                            {t.guide.tapToPreview}
                          </Typography>
                        </View>
                      </Pressable>
                      <View style={styles.captionRow}>
                        <Ionicons
                          name="information-circle-outline"
                          size={14}
                          color={themeColors.text.muted}
                          style={{ marginRight: 6, marginTop: 1 }}
                        />
                        <Typography
                          variant="caption"
                          color={themeColors.text.muted}
                          style={styles.captionText}
                        >
                          {topicCaption}
                        </Typography>
                      </View>
                    </View>

                    {/* Step by step list */}
                    <View style={styles.stepsContainer}>
                      {topicSteps.map((step, stepIdx) => (
                        <View key={stepIdx} style={styles.stepItemRow}>
                          <View
                            style={[
                              styles.stepNumberBadge,
                              { backgroundColor: themeColors.brand.navy },
                            ]}
                          >
                            <Typography variant="caption" color="#FFFFFF" style={styles.stepNumberText}>
                              {stepIdx + 1}
                            </Typography>
                          </View>
                          <Typography
                            variant="body"
                            color={themeColors.text.primary}
                            style={styles.stepText}
                          >
                            {step}
                          </Typography>
                        </View>
                      ))}
                    </View>

                    {/* Tip Box */}
                    <View
                      style={[
                        styles.tipBox,
                        {
                          backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
                          borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                        },
                      ]}
                    >
                      <View style={styles.tipHeader}>
                        <Ionicons name="bulb" size={16} color="#D97706" style={{ marginRight: 6 }} />
                        <Typography variant="label" color="#B45309" style={{ fontSize: 12, fontWeight: '800' }}>
                          {t.guide.tipLabel}
                        </Typography>
                      </View>
                      <Typography variant="caption" color={isDarkMode ? '#FCD34D' : '#92400E'} style={styles.tipContent}>
                        {topicTip}
                      </Typography>
                    </View>

                    {/* Action Route Button */}
                    {topic.actionRoute && (
                      <Pressable
                        onPress={() => router.push(topic.actionRoute as any)}
                        style={({ pressed }) => [
                          styles.actionButton,
                          {
                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                            borderColor: themeColors.border.default,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Typography variant="label" color={themeColors.brand.navy} style={{ fontWeight: '700' }}>
                          {actionLabel}
                        </Typography>
                        <Ionicons name="arrow-forward" size={16} color={themeColors.brand.navy} />
                      </Pressable>
                    )}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Fullscreen Screenshot Modal */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalHeader}>
            <Typography variant="h3" color="#FFFFFF" style={{ flex: 1 }}>
              {t.guide.screenshotModalTitle}
            </Typography>
            <Pressable
              onPress={() => setPreviewImage(null)}
              style={styles.modalCloseBtn}
              hitSlop={10}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          {previewImage && (
            <View style={styles.modalContent}>
              <Image
                source={previewImage.source}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={styles.modalCaptionWrap}>
                <Typography variant="body" color="#E2E8F0" style={styles.modalCaptionText}>
                  {previewImage.caption}
                </Typography>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing[1],
    paddingBottom: spacing[10],
  },
  heroCard: {
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontWeight: '800',
  },
  heroSubtitle: {
    lineHeight: 18,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    height: 46,
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
  categoriesScroll: {
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
    paddingHorizontal: 4,
  },
  toggleExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleExpandText: {
    fontWeight: '700',
  },
  topicCard: {
    borderRadius: radius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  topicIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  topicTitleWrap: {
    flex: 1,
  },
  topicBadgeRow: {
    marginBottom: 2,
  },
  topicTitle: {
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
  },
  chevronWrap: {
    paddingLeft: spacing[2],
    paddingTop: 4,
  },
  topicBody: {
    marginTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
    paddingTop: spacing[3],
  },
  topicDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing[3],
  },
  screenshotFrame: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing[3],
  },
  screenshotPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: spacing[3],
    position: 'relative',
  },
  screenshotImage: {
    width: '100%',
    height: 220,
  },
  tapToZoomPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  captionText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  stepsContainer: {
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
    marginTop: 2,
  },
  stepNumberText: {
    fontWeight: '800',
    fontSize: 11,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  tipBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tipContent: {
    fontSize: 12,
    lineHeight: 17,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  emptyCard: {
    padding: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  emptyTitle: {
    fontWeight: '700',
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  emptyDesc: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[4],
  },
  resetSearchBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'space-between',
    paddingTop: spacing[8],
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[4],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing[4],
  },
  modalImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.65,
  },
  modalCaptionWrap: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: radius.md,
    padding: spacing[3],
    marginTop: spacing[3],
    width: '100%',
  },
  modalCaptionText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
