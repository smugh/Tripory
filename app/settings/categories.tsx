import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, ScreenContainer } from '@/components/ui';
import { useCategoryStore } from '@/stores/category-store';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

export default function CategoriesScreen() {
  const themeColors = useThemeColors();
  const { t, language, format } = useI18n();
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  const categories = useCategoryStore((s) => s.categories);
  const addCategory = useCategoryStore((s) => s.addCategory);
  const deleteCategory = useCategoryStore((s) => s.deleteCategory);

  const [isAddCatModalVisible, setIsAddCatModalVisible] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  const handleAddCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    const res = addCategory(trimmed);
    if (res.success) {
      setNewCatInput('');
      setIsAddCatModalVisible(false);
    } else {
      Alert.alert(language === 'en' ? 'Notice' : 'Perhatian', res.error || 'Failed to add category');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    Alert.alert(
      t.settings.deleteCategoryConfirmTitle,
      format(t.settings.deleteCategoryConfirmDesc, { name: cat }),
      [
        { text: t.settings.cancel, style: 'cancel' },
        {
          text: language === 'en' ? 'Delete' : 'Hapus',
          style: 'destructive',
          onPress: () => {
            const res = deleteCategory(cat);
            if (!res.success && res.error) {
              Alert.alert(language === 'en' ? 'Notice' : 'Perhatian', res.error);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Description Card */}
        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF' }]}>
              <Ionicons name="pricetags" size={24} color={themeColors.brand.blue} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.categoriesSection}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted} style={{ marginTop: 2 }}>
                {t.settings.categoriesDesc}
              </Typography>
            </View>
          </View>
        </Card>

        {/* Action Header & Categories Wrap */}
        <View style={styles.listHeaderRow}>
          <Typography variant="label" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
            {language === 'en' ? `Categories (${categories.length})` : `Daftar Kategori (${categories.length})`}
          </Typography>
          <Pressable
            style={[styles.addBtn, { backgroundColor: themeColors.brand.blue }]}
            onPress={() => setIsAddCatModalVisible(true)}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Typography variant="caption" color="#FFFFFF" style={{ fontWeight: '700', marginLeft: 4 }}>
              {t.settings.addCategoryBtn}
            </Typography>
          </Pressable>
        </View>

        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <View style={styles.categoriesWrap}>
            {categories.map((cat) => (
              <View
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : '#F1F5F9',
                    borderColor: themeColors.border.default,
                  },
                ]}
              >
                <Typography variant="caption" color={themeColors.text.primary} style={styles.categoryChipText}>
                  {cat}
                </Typography>
                <Pressable
                  onPress={() => handleDeleteCategory(cat)}
                  hitSlop={8}
                  style={styles.categoryDeleteBtn}
                >
                  <Ionicons name="close-circle" size={17} color={themeColors.brand.coral} />
                </Pressable>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      {/* Add Category Modal */}
      <Modal
        visible={isAddCatModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddCatModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsAddCatModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: themeColors.surface.card,
                borderColor: themeColors.border.default,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.2)' : '#EFF6FF' }]}>
                <Ionicons name="pricetag" size={24} color={themeColors.brand.blue} />
              </View>
              <Typography variant="h3" color={themeColors.text.primary} style={styles.modalTitle}>
                {t.settings.addCategoryPromptTitle}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted} style={styles.modalSubtitle}>
                {t.settings.addCategoryPromptDesc}
              </Typography>
            </View>

            <TextInput
              style={[
                styles.addCatInput,
                {
                  color: themeColors.text.primary,
                  borderColor: themeColors.border.focus,
                  backgroundColor: isDarkMode ? themeColors.surface.muted : '#F8FAFC',
                },
              ]}
              placeholder={t.settings.categoryNamePlaceholder}
              placeholderTextColor={themeColors.text.muted}
              value={newCatInput}
              onChangeText={setNewCatInput}
              autoFocus
              maxLength={30}
            />

            <View style={styles.catModalActions}>
              <Pressable
                style={[styles.modalBtnSecondary, { backgroundColor: isDarkMode ? themeColors.surface.muted : '#F1F5F9' }]}
                onPress={() => {
                  setNewCatInput('');
                  setIsAddCatModalVisible(false);
                }}
              >
                <Typography variant="label" color={themeColors.text.primary}>
                  {t.settings.cancel}
                </Typography>
              </Pressable>

              <Pressable
                style={[styles.modalBtnPrimary, { backgroundColor: themeColors.brand.blue }]}
                onPress={handleAddCategory}
              >
                <Typography variant="label" color="#FFFFFF">
                  {language === 'en' ? 'Add Category' : 'Tambah Kategori'}
                </Typography>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
    marginHorizontal: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontWeight: '600',
    marginRight: 6,
  },
  categoryDeleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  modalTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    textAlign: 'center',
    marginTop: 4,
  },
  addCatInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    fontSize: 14,
    marginBottom: spacing[4],
  },
  catModalActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  modalBtnSecondary: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
