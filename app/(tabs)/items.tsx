import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Modal, Alert, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, Button, Input, EmptyState, ScreenContainer } from '@/components/ui';
import { itemRepository } from '@/db/repositories/item.repository';
import { ItemRecord } from '@/db/schema/items';
import { ITEM_CATEGORIES, ItemCategory, getQuickPackBundles, QuickBundle } from '@/core/constants';
import { useI18n } from '@/core/i18n';
import { useUIStore } from '@/stores/ui-store';

export default function ItemsScreen() {
  const themeColors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t, format, language } = useI18n();

  const quickBundles = getQuickPackBundles(language);

  const [itemsList, setItemsList] = useState<ItemRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ItemCategory>('Clothing');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemNotes, setNewItemNotes] = useState('');

  const loadItems = useCallback(async () => {
    try {
      const data = await itemRepository.getAll();
      setItemsList(data);
    } catch {
      // silent catch
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSaveItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert(language === 'en' ? 'Required' : 'Perhatian', t.inventory.alertNameRequired);
      return;
    }

    try {
      await itemRepository.create({
        name: newItemName.trim(),
        category: newItemCategory,
        quantity: parseInt(newItemQty, 10) || 1,
        notes: newItemNotes.trim() || null,
      });

      setNewItemName('');
      setNewItemNotes('');
      setNewItemQty('1');
      setIsModalOpen(false);
      loadItems();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.inventory.alertSaveError);
    }
  };

  const handleAddQuickBundle = async (bundle: QuickBundle) => {
    try {
      for (const item of bundle.items) {
        let cat: ItemCategory = 'Others';
        if (bundle.category === 'Pakaian' || bundle.category === 'Clothing') cat = 'Clothing';
        else if (bundle.category === 'Elektronik' || bundle.category === 'Electronics') cat = 'Electronics';
        else if (bundle.category === 'Kesehatan' || bundle.category === 'Medicine') cat = 'Medicine';
        else if (bundle.category === 'Paling Populer' || bundle.category === 'Documents') cat = 'Documents';

        await itemRepository.create({
          name: item.name,
          category: cat,
          quantity: 1,
          notes: language === 'en' ? 'Quick Bundle' : 'Paket Kilat',
        });
      }
      loadItems();
      Alert.alert(
        language === 'en' ? 'Success' : 'Sukses',
        format(t.inventory.alertBundleAdded, { title: bundle.title, count: bundle.items.length })
      );
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.inventory.alertBundleError);
    }
  };

  const filteredItems = itemsList.filter((item) => {
    if (selectedCategory === 'All') return true;
    return item.category === selectedCategory;
  });

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'Clothing':
        return 'shirt-outline';
      case 'Toiletries':
        return 'water-outline';
      case 'Electronics':
        return 'hardware-chip-outline';
      case 'Documents':
        return 'document-text-outline';
      case 'Medicine':
        return 'medkit-outline';
      case 'Gear & Activities':
        return 'construct-outline';
      default:
        return 'cube-outline';
    }
  };

  return (
    <ScreenContainer>
      {/* Top Header Row */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Typography variant="body" color={themeColors.text.secondary} style={{ fontSize: 13, fontWeight: '600' }}>
            {filteredItems.length === 1
              ? t.inventory.itemCountOne
              : format(t.inventory.itemCount, { count: filteredItems.length })}
          </Typography>
        </View>

        <Button
          label={t.inventory.addItemBtn}
          size="sm"
          variant="accent"
          onPress={() => setIsModalOpen(true)}
        />
      </View>

      {/* QUICK BUNDLE ROW */}
      <View style={styles.bundleSection}>
        <Typography variant="caption" color={themeColors.text.primary} style={styles.bundleLabel}>
          {t.inventory.quickBundlesLabel}
        </Typography>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bundleScroll}>
          {quickBundles.map((b) => (
            <Pressable
              key={b.title}
              style={[
                styles.bundlePill,
                {
                  backgroundColor: isDarkMode ? 'rgba(245, 107, 95, 0.12)' : '#FFF5F4',
                  borderColor: isDarkMode ? '#451A18' : '#FED7D4',
                },
              ]}
              onPress={() => handleAddQuickBundle(b)}
            >
              <Ionicons name={b.icon as any} size={14} color={themeColors.brand.coral} />
              <Typography variant="caption" color={themeColors.brand.coral} style={styles.bundlePillText}>
                + {b.title} ({b.items.length})
              </Typography>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.categoryWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', ...ITEM_CATEGORIES]}
          keyExtractor={(cat) => cat}
          renderItem={({ item: cat }) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected
                      ? themeColors.brand.blue
                      : isDarkMode
                      ? themeColors.surface.card
                      : '#F1F5F9',
                    borderColor: isSelected
                      ? themeColors.brand.blue
                      : themeColors.border.default,
                  },
                ]}
              >
                <Typography
                  variant="label"
                  color={isSelected ? '#FFFFFF' : themeColors.text.secondary}
                  style={styles.categoryPillText}
                >
                  {cat === 'All' ? t.inventory.allCategory : cat}
                </Typography>
              </Pressable>
            );
          }}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card
            elevated
            style={[
              styles.itemCard,
              { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default },
            ]}
          >
            <View style={styles.itemRow}>
              <View
                style={[
                  styles.categoryIconCircle,
                  { backgroundColor: isDarkMode ? themeColors.surface.muted : '#F0F4F8' },
                ]}
              >
                <Ionicons
                  name={getCategoryIcon(item.category)}
                  size={17}
                  color={isDarkMode ? '#93C5FD' : themeColors.brand.navy}
                />
              </View>

              <View style={styles.itemInfo}>
                <Typography variant="body" color={themeColors.text.primary} style={styles.itemName}>
                  {item.name}
                </Typography>
                <Typography variant="caption" color={themeColors.text.secondary}>
                  {t.inventory.qtyLabel} {item.quantity} {item.notes ? `• ${item.notes}` : ''}
                </Typography>
              </View>

              <Badge label={item.category} variant="neutral" size="sm" />
            </View>
          </Card>
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title={t.inventory.emptyTitle}
            description={t.inventory.emptyDesc}
            actionLabel={t.inventory.emptyAction}
            onAction={() => setIsModalOpen(true)}
          />
        }
      />

      {/* Modal Tambah Barang */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default },
            ]}
          >
            <View style={styles.modalHeader}>
              <Typography variant="h2" color={themeColors.brand.navy}>
                {t.inventory.modalTitle}
              </Typography>
              <Pressable onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close-circle-outline" size={24} color={themeColors.text.muted} />
              </Pressable>
            </View>

            <Input
              label={t.inventory.nameLabel}
              placeholder={t.inventory.namePlaceholder}
              value={newItemName}
              onChangeText={setNewItemName}
            />

            <Typography variant="label" color={themeColors.text.primary} style={styles.inputLabel}>
              {t.inventory.categoryLabel}
            </Typography>
            <View style={styles.categorySelectGrid}>
              {ITEM_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setNewItemCategory(cat)}
                  style={[
                    styles.catSelectPill,
                    {
                      backgroundColor: newItemCategory === cat
                        ? themeColors.brand.blue
                        : isDarkMode
                        ? themeColors.surface.card
                        : '#F1F5F9',
                    },
                  ]}
                >
                  <Typography
                    variant="caption"
                    color={newItemCategory === cat ? '#FFFFFF' : themeColors.text.secondary}
                    style={styles.catSelectText}
                  >
                    {cat}
                  </Typography>
                </Pressable>
              ))}
            </View>

            <Input
              label={t.inventory.qtyInputLabel}
              placeholder="1"
              value={newItemQty}
              onChangeText={setNewItemQty}
              keyboardType="numeric"
            />

            <Input
              label={t.inventory.notesLabel}
              placeholder={t.inventory.notesPlaceholder}
              value={newItemNotes}
              onChangeText={setNewItemNotes}
            />

            <View style={styles.modalButtons}>
              <Button
                label={t.inventory.cancelBtn}
                variant="ghost"
                size="md"
                onPress={() => setIsModalOpen(false)}
              />
              <Button
                label={t.inventory.saveBtn}
                variant="accent"
                size="md"
                onPress={handleSaveItem}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
    marginTop: spacing[1],
  },
  topBarLeft: {
    flex: 1,
  },
  bundleSection: {
    marginBottom: spacing[3],
  },
  bundleLabel: {
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 6,
  },
  bundleScroll: {
    gap: spacing[2],
  },
  bundlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  bundlePillText: {
    marginLeft: 5,
    fontWeight: '700',
    fontSize: 11,
  },
  categoryWrap: {
    marginBottom: spacing[3],
  },
  categoryList: {
    gap: spacing[2],
  },
  categoryPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: spacing[8],
  },
  itemCard: {
    padding: spacing[3],
    marginBottom: spacing[2],
    borderRadius: radius.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing[2],
  },
  itemName: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 27, 77, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing[5],
    paddingBottom: spacing[8],
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  inputLabel: {
    marginBottom: 6,
    fontWeight: '600',
  },
  categorySelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  catSelectPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  catSelectText: {
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[4],
  },
});
