import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, Modal, Alert, Pressable, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, Button, Input, EmptyState, ScreenContainer } from '@/components/ui';
import { itemRepository } from '@/db/repositories/item.repository';
import { ItemRecord } from '@/db/schema/items';
import { useCategoryStore } from '@/stores/category-store';
import { useI18n } from '@/core/i18n';
import { useUIStore } from '@/stores/ui-store';
import { useActiveInputStore } from '@/stores/active-input-store';
import { mediaService } from '@/services/media';

export default function ItemsScreen() {
  const themeColors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t, format, language } = useI18n();

  const categories = useCategoryStore((s) => s.categories);

  const [itemsList, setItemsList] = useState<ItemRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);
  const modalScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const keyboardHeight = useActiveInputStore((s) => s.keyboardHeight);

  useEffect(() => {
    if (isModalOpen) {
      useActiveInputStore.getState().setActiveScrollRef(modalScrollRef);
    } else {
      useActiveInputStore.getState().setActiveScrollRef(null);
    }
  }, [isModalOpen]);

  // Form states for Add / Edit
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<string>(categories[0] || 'Clothing');
  const [itemImageUri, setItemImageUri] = useState<string | null>(null);
  const [itemNotes, setItemNotes] = useState('');
  const [itemIsGroup, setItemIsGroup] = useState(false);
  const [itemParentId, setItemParentId] = useState<string | null>(null);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

  // Item Detail & Quick Move States
  const [detailItem, setDetailItem] = useState<ItemRecord | null>(null);
  const [itemToMoveGroup, setItemToMoveGroup] = useState<ItemRecord | null>(null);

  const availableGroups = useMemo(
    () => itemsList.filter((it) => it.isGroup === 1 && it.id !== editingItem?.id),
    [itemsList, editingItem]
  );

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

  // Keep category in sync if categories list changes
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(itemCategory)) {
      setItemCategory(categories[0]);
    }
  }, [categories, itemCategory]);

  const handleOpenAddItemModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory(categories[0] || 'Clothing');
    setItemImageUri(null);
    setItemNotes('');
    setItemIsGroup(false);
    setItemParentId(null);
    setSelectedChildIds([]);
    setIsModalOpen(true);
  };

  const handleOpenAddGroupModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory(categories[0] || 'Gear & Activities');
    setItemImageUri(null);
    setItemNotes('');
    setItemIsGroup(true);
    setItemParentId(null);
    setSelectedChildIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ItemRecord) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemImageUri(item.imageUri || null);
    setItemNotes(item.notes || '');
    setItemIsGroup(item.isGroup === 1);
    setItemParentId(item.parentId || null);
    setSelectedChildIds(itemsList.filter((it) => it.parentId === item.id).map((it) => it.id));
    setIsModalOpen(true);
  };

  const handleOpenDetailModal = (item: ItemRecord) => {
    setDetailItem(item);
  };

  const handlePickCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'en' ? 'Permission Denied' : 'Izin Ditolak',
          language === 'en' ? 'Camera permission is required to take photos.' : 'Izin kamera diperlukan untuk mengambil foto.'
        );
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2, // Ukuran paling rendah
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setItemImageUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Failed to open camera.');
    }
  };

  const handlePickGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'en' ? 'Permission Denied' : 'Izin Ditolak',
          language === 'en' ? 'Gallery permission is required to choose photos.' : 'Izin galeri diperlukan untuk memilih foto.'
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2, // Ukuran paling rendah
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setItemImageUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Failed to open gallery.');
    }
  };

  const handleShowPhotoOptions = () => {
    Alert.alert(
      t.inventory.photoModalTitle,
      t.inventory.photoModalDesc,
      [
        {
          text: t.inventory.photoTakeCamera,
          onPress: handlePickCamera,
        },
        {
          text: t.inventory.photoChooseGallery,
          onPress: handlePickGallery,
        },
        {
          text: t.inventory.cancelBtn,
          style: 'cancel',
        },
      ]
    );
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      Alert.alert(language === 'en' ? 'Required' : 'Perhatian', t.inventory.alertNameRequired);
      return;
    }

    try {
      const previousImageUri = editingItem?.imageUri ?? null;
      let savedImageUri = itemImageUri || null;
      if (savedImageUri && !mediaService.isManagedPhotoUri(savedImageUri)) {
        const savedPhoto = await mediaService.savePhoto({ sourceUri: savedImageUri });
        savedImageUri = savedPhoto.fullUri;
      }

      if (editingItem) {
        // Update existing item (Update / U of CRUD)
        await itemRepository.update(editingItem.id, {
          name: itemName.trim(),
          category: itemCategory,
          notes: itemNotes.trim() || null,
          imageUri: savedImageUri,
          isGroup: itemIsGroup ? 1 : 0,
          parentId: itemIsGroup ? null : (itemParentId || null),
        });

        if (itemIsGroup) {
          // Sync children
          const currentChildren = itemsList.filter((it) => it.parentId === editingItem.id);
          for (const ch of currentChildren) {
            if (!selectedChildIds.includes(ch.id)) {
              await itemRepository.updateParent(ch.id, null);
            }
          }
          for (const childId of selectedChildIds) {
            await itemRepository.updateParent(childId, editingItem.id);
          }
        }
      } else {
        // Create new item (Create / C of CRUD)
        const created = await itemRepository.create({
          name: itemName.trim(),
          category: itemCategory,
          quantity: 1,
          notes: itemNotes.trim() || null,
          imageUri: savedImageUri,
          isGroup: itemIsGroup ? 1 : 0,
          parentId: itemIsGroup ? null : (itemParentId || null),
        });

        if (itemIsGroup && selectedChildIds.length > 0) {
          for (const childId of selectedChildIds) {
            await itemRepository.updateParent(childId, created.id);
          }
        }
      }

      if (previousImageUri && previousImageUri !== savedImageUri) {
        await mediaService.deletePhotoByUri(previousImageUri);
      }

      setIsModalOpen(false);
      setEditingItem(null);
      loadItems();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.inventory.alertSaveError);
    }
  };

  const handleConfirmDelete = (item: ItemRecord) => {
    Alert.alert(
      t.inventory.deleteModalTitle,
      format(t.inventory.deleteModalMessage, { name: item.name }),
      [
        {
          text: t.inventory.cancelBtn,
          style: 'cancel',
        },
        {
          text: t.inventory.deleteBtn,
          style: 'destructive',
          onPress: async () => {
            try {
              await itemRepository.delete(item.id);
              if (item.imageUri) await mediaService.deletePhotoByUri(item.imageUri);
              if (isModalOpen && editingItem?.id === item.id) {
                setIsModalOpen(false);
                setEditingItem(null);
              }
              loadItems();
            } catch {
              Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.inventory.deleteError);
            }
          },
        },
      ]
    );
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

        <View style={styles.topBarActions}>
          <Button
            label={language === 'en' ? '+ Item' : '+ Barang'}
            size="sm"
            variant="secondary"
            onPress={handleOpenAddItemModal}
          />
          <Button
            label={language === 'en' ? '+ Group/Pack' : '+ Grup/Paket'}
            size="sm"
            variant="accent"
            onPress={handleOpenAddGroupModal}
          />
        </View>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.categoryWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', ...categories]}
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

      {/* Items List (Read / R of CRUD) */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isGroup = item.isGroup === 1;
          const childCount = itemsList.filter((it) => it.parentId === item.id).length;
          const parentGroup = item.parentId ? itemsList.find((it) => it.id === item.parentId) : null;

          return (
            <Pressable
              onPress={() => handleOpenDetailModal(item)}
              style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
            >
              <Card
                elevated
                style={[
                  styles.itemCard,
                  { backgroundColor: themeColors.surface.card, borderColor: isGroup ? themeColors.brand.blue : themeColors.border.default },
                  isGroup && { borderWidth: 1.5 },
                ]}
              >
                <View style={styles.itemRow}>
                  {item.imageUri ? (
                    <Image source={{ uri: item.imageUri }} style={styles.itemThumbImage} resizeMode="cover" />
                  ) : (
                    <View
                      style={[
                        styles.categoryIconCircle,
                        {
                          backgroundColor: isGroup
                            ? (isDarkMode ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE')
                            : (isDarkMode ? themeColors.surface.muted : '#F0F4F8'),
                        },
                      ]}
                    >
                      <Ionicons
                        name={isGroup ? 'cube' : getCategoryIcon(item.category)}
                        size={18}
                        color={isGroup ? themeColors.brand.blue : (isDarkMode ? '#93C5FD' : themeColors.brand.navy)}
                      />
                    </View>
                  )}

                  <View style={styles.itemInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Typography variant="body" color={themeColors.text.primary} style={styles.itemName}>
                        {item.name}
                      </Typography>
                      {isGroup && (
                        <Badge label={t.inventory.groupBadge} variant="accent" size="sm" />
                      )}
                    </View>
                    <Typography variant="caption" color={themeColors.text.secondary} numberOfLines={1}>
                      {isGroup
                        ? format(t.inventory.groupItemsCount, { count: childCount })
                        : parentGroup
                        ? `↳ ${t.inventory.childBadge}: ${parentGroup.name}`
                        : item.notes ? item.notes : item.category}
                    </Typography>
                  </View>

                  {/* Right Actions: Category Badge & Direct Action Buttons */}
                  <View style={styles.itemActionsRight}>
                    <Badge label={item.category} variant="neutral" size="sm" />
                    <View style={styles.iconButtonsRow}>
                      <Pressable
                        style={[
                          styles.iconBtn,
                          { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' },
                        ]}
                        hitSlop={8}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(item);
                        }}
                      >
                        <Ionicons name="pencil" size={14} color={themeColors.brand.blue} />
                      </Pressable>
                      <Pressable
                        style={[
                          styles.iconBtn,
                          { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' },
                        ]}
                        hitSlop={8}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleConfirmDelete(item);
                        }}
                      >
                        <Ionicons name="trash-outline" size={15} color={themeColors.status.error} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title={t.inventory.emptyTitle}
            description={t.inventory.emptyDesc}
            actionLabel={t.inventory.emptyAction}
            onAction={handleOpenAddItemModal}
          />
        }
      />

      {/* Modal Tambah / Edit Barang (Create & Update / C & U of CRUD) */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default },
            ]}
          >
            <ScrollView
              ref={modalScrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              contentContainerStyle={[
                styles.modalScrollContent,
                keyboardHeight > 0 && { paddingBottom: keyboardHeight + 120 },
              ]}
              onScroll={(e) => useActiveInputStore.getState().setActiveScrollY(e.nativeEvent.contentOffset.y)}
              scrollEventThrottle={16}
            >
              <View style={styles.modalHeader}>
                <Typography variant="h2" color={themeColors.brand.navy}>
                  {editingItem ? t.inventory.editModalTitle : t.inventory.modalTitle}
                </Typography>
                <Pressable onPress={() => setIsModalOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={themeColors.text.muted} />
                </Pressable>
              </View>

              {/* 1. Item Photo Picker (Camera or Local Gallery) */}
              <Typography variant="label" color={themeColors.text.primary} style={styles.inputLabel}>
                {t.inventory.photoLabel}
              </Typography>

              {itemImageUri ? (
                <View style={styles.photoPreviewRow}>
                  <Image source={{ uri: itemImageUri }} style={styles.photoPreviewImage} />
                  <View style={styles.photoActionButtons}>
                    <Button
                      label={t.inventory.photoChangeBtn}
                      size="sm"
                      variant="secondary"
                      onPress={handleShowPhotoOptions}
                    />
                    <Button
                      label={t.inventory.photoRemoveBtn}
                      size="sm"
                      variant="ghost"
                      onPress={() => setItemImageUri(null)}
                      style={{ marginTop: 6 }}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.photoPickerBtnsRow}>
                  <Pressable
                    style={[
                      styles.photoChoiceBtn,
                      { backgroundColor: isDarkMode ? themeColors.surface.muted : '#F1F5F9', borderColor: themeColors.border.default },
                    ]}
                    onPress={handlePickCamera}
                  >
                    <Ionicons name="camera" size={20} color={themeColors.brand.coral} />
                    <Typography variant="caption" color={themeColors.text.primary} style={styles.photoChoiceText}>
                      {t.inventory.photoTakeCamera}
                    </Typography>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.photoChoiceBtn,
                      { backgroundColor: isDarkMode ? themeColors.surface.muted : '#F1F5F9', borderColor: themeColors.border.default },
                    ]}
                    onPress={handlePickGallery}
                  >
                    <Ionicons name="image" size={20} color={themeColors.brand.blue} />
                    <Typography variant="caption" color={themeColors.text.primary} style={styles.photoChoiceText}>
                      {t.inventory.photoChooseGallery}
                    </Typography>
                  </Pressable>
                </View>
              )}

              {/* Item Type: Single vs Group Parent */}
              <Typography variant="label" color={themeColors.text.primary} style={styles.inputLabel}>
                {t.inventory.itemTypeLabel}
              </Typography>
              <View style={styles.typeSegmentRow}>
                <Pressable
                  style={[
                    styles.typeSegmentBtn,
                    { borderColor: themeColors.border.default, backgroundColor: isDarkMode ? themeColors.surface.muted : '#F8FAFC' },
                    !itemIsGroup && { backgroundColor: themeColors.brand.blue, borderColor: themeColors.brand.blue },
                  ]}
                  onPress={() => setItemIsGroup(false)}
                >
                  <Ionicons name="cube-outline" size={16} color={!itemIsGroup ? '#FFFFFF' : themeColors.text.secondary} />
                  <Typography variant="caption" color={!itemIsGroup ? '#FFFFFF' : themeColors.text.secondary} style={{ fontWeight: '700', marginLeft: 6 }}>
                    {t.inventory.itemTypeSingle}
                  </Typography>
                </Pressable>

                <Pressable
                  style={[
                    styles.typeSegmentBtn,
                    { borderColor: themeColors.border.default, backgroundColor: isDarkMode ? themeColors.surface.muted : '#F8FAFC' },
                    itemIsGroup && { backgroundColor: themeColors.brand.blue, borderColor: themeColors.brand.blue },
                  ]}
                  onPress={() => {
                    setItemIsGroup(true);
                    setItemParentId(null);
                  }}
                >
                  <Ionicons name="folder-open-outline" size={16} color={itemIsGroup ? '#FFFFFF' : themeColors.text.secondary} />
                  <Typography variant="caption" color={itemIsGroup ? '#FFFFFF' : themeColors.text.secondary} style={{ fontWeight: '700', marginLeft: 6 }}>
                    {t.inventory.itemTypeGroup}
                  </Typography>
                </Pressable>
              </View>

              {!itemIsGroup && availableGroups.length > 0 && (
                <View style={{ marginTop: spacing[3], marginBottom: spacing[2] }}>
                  <Typography variant="label" color={themeColors.text.primary} style={styles.inputLabel}>
                    {t.inventory.parentGroupLabel}
                  </Typography>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 4 }}>
                    <Pressable
                      style={[
                        styles.parentGroupPill,
                        { borderColor: themeColors.border.default, backgroundColor: isDarkMode ? themeColors.surface.muted : '#F1F5F9' },
                        itemParentId === null && { backgroundColor: themeColors.brand.blue, borderColor: themeColors.brand.blue },
                      ]}
                      onPress={() => setItemParentId(null)}
                    >
                      <Typography variant="caption" color={itemParentId === null ? '#FFFFFF' : themeColors.text.secondary} style={{ fontWeight: '600' }}>
                        {t.inventory.noParent}
                      </Typography>
                    </Pressable>
                    {availableGroups.map((grp: ItemRecord) => (
                      <Pressable
                        key={grp.id}
                        style={[
                          styles.parentGroupPill,
                          { borderColor: themeColors.border.default, backgroundColor: isDarkMode ? themeColors.surface.muted : '#F1F5F9' },
                          itemParentId === grp.id && { backgroundColor: themeColors.brand.blue, borderColor: themeColors.brand.blue },
                        ]}
                        onPress={() => setItemParentId(grp.id)}
                      >
                        <Ionicons name="cube" size={13} color={itemParentId === grp.id ? '#FFFFFF' : themeColors.brand.coral} style={{ marginRight: 4 }} />
                        <Typography variant="caption" color={itemParentId === grp.id ? '#FFFFFF' : themeColors.text.primary} style={{ fontWeight: '600' }}>
                          {grp.name}
                        </Typography>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {itemIsGroup && (
                <View style={{ marginTop: spacing[3], marginBottom: spacing[2] }}>
                  <Typography variant="label" color={themeColors.text.primary} style={styles.inputLabel}>
                    {t.inventory.selectItemsForGroup}
                  </Typography>
                  <Typography variant="caption" color={themeColors.text.secondary} style={{ marginBottom: 6 }}>
                    {t.inventory.selectItemsForGroupDesc}
                  </Typography>
                  <View
                    style={{
                      maxHeight: 160,
                      borderWidth: 1,
                      borderColor: themeColors.border.default,
                      borderRadius: radius.md,
                      padding: 6,
                      backgroundColor: isDarkMode ? themeColors.surface.muted : '#F8FAFC',
                    }}
                  >
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                      {itemsList
                        .filter((it) => it.isGroup !== 1 && (it.parentId === null || it.parentId === editingItem?.id))
                        .map((it) => {
                          const isSelected = selectedChildIds.includes(it.id);
                          return (
                            <Pressable
                              key={it.id}
                              style={[
                                styles.childSelectRow,
                                {
                                  backgroundColor: isSelected
                                    ? (isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE')
                                    : 'transparent',
                                  borderColor: isSelected ? themeColors.brand.blue : themeColors.border.default,
                                },
                              ]}
                              onPress={() => {
                                setSelectedChildIds((prev) =>
                                  prev.includes(it.id) ? prev.filter((id) => id !== it.id) : [...prev, it.id]
                                );
                              }}
                            >
                              <Ionicons
                                name={isSelected ? 'checkbox' : 'square-outline'}
                                size={18}
                                color={isSelected ? themeColors.brand.blue : themeColors.text.secondary}
                              />
                              <Typography variant="caption" color={themeColors.text.primary} style={{ marginLeft: 8, fontWeight: '600', flex: 1 }}>
                                {it.name}
                              </Typography>
                              <Badge label={it.category} variant="neutral" size="sm" />
                            </Pressable>
                          );
                        })}
                      {itemsList.filter((it) => it.isGroup !== 1 && (it.parentId === null || it.parentId === editingItem?.id)).length === 0 && (
                        <Typography variant="caption" color={themeColors.text.secondary} style={{ fontStyle: 'italic', padding: 8 }}>
                          {language === 'en' ? 'No standalone items available to bundle.' : 'Belum ada barang mandiri untuk dimasukkan.'}
                        </Typography>
                      )}
                    </ScrollView>
                  </View>
                </View>
              )}

              {/* 2. Item Name */}
              <Input
                label={itemIsGroup ? t.inventory.groupNameLabel : t.inventory.nameLabel}
                placeholder={itemIsGroup ? t.inventory.groupNamePlaceholder : t.inventory.namePlaceholder}
                value={itemName}
                onChangeText={setItemName}
              />

              {/* 3. Category Select */}
              <Typography variant="label" color={themeColors.text.primary} style={styles.inputLabel}>
                {t.inventory.categoryLabel}
              </Typography>
              <View style={styles.categorySelectGrid}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setItemCategory(cat)}
                    style={[
                      styles.catSelectPill,
                      {
                        backgroundColor: itemCategory === cat
                          ? themeColors.brand.blue
                          : isDarkMode
                          ? themeColors.surface.card
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <Typography
                      variant="caption"
                      color={itemCategory === cat ? '#FFFFFF' : themeColors.text.secondary}
                      style={styles.catSelectText}
                    >
                      {cat}
                    </Typography>
                  </Pressable>
                ))}
              </View>

              {/* 4. Notes (Optional) */}
              <Input
                label={t.inventory.notesLabel}
                placeholder={t.inventory.notesPlaceholder}
                value={itemNotes}
                onChangeText={setItemNotes}
              />

              {/* Modal Buttons */}
              <View style={styles.modalButtons}>
                {editingItem && (
                  <Button
                    label={t.inventory.deleteBtn}
                    variant="destructive"
                    size="md"
                    onPress={() => handleConfirmDelete(editingItem)}
                    style={{ marginRight: 'auto' }}
                  />
                )}
                <Button
                  label={t.inventory.cancelBtn}
                  variant="ghost"
                  size="md"
                  onPress={() => setIsModalOpen(false)}
                />
                <Button
                  label={editingItem ? t.inventory.saveChangesBtn : t.inventory.saveBtn}
                  variant="accent"
                  size="md"
                  onPress={handleSaveItem}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Item Detail Modal */}
      {detailItem && (
        <Modal
          visible={!!detailItem}
          transparent
          animationType="fade"
          onRequestClose={() => setDetailItem(null)}
        >
          <Pressable style={styles.modalOverlayCenter} onPress={() => setDetailItem(null)}>
            <Pressable
              style={[
                styles.detailModalCard,
                { backgroundColor: themeColors.surface.card },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View style={styles.detailHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Typography variant="h3" color={themeColors.brand.navy} style={{ fontWeight: '700' }}>
                    {detailItem.isGroup === 1 ? t.inventory.groupDetailTitle : t.inventory.itemDetailTitle}
                  </Typography>
                </View>
                <Pressable onPress={() => setDetailItem(null)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={themeColors.text.secondary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Photo or Icon */}
                <View style={styles.detailImageContainer}>
                  {detailItem.imageUri ? (
                    <Image source={{ uri: detailItem.imageUri }} style={styles.detailImage} resizeMode="cover" />
                  ) : (
                    <View
                      style={[
                        styles.detailIconCircle,
                        {
                          backgroundColor: detailItem.isGroup === 1
                            ? (isDarkMode ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE')
                            : (isDarkMode ? themeColors.surface.muted : '#F0F4F8'),
                        },
                      ]}
                    >
                      <Ionicons
                        name={detailItem.isGroup === 1 ? 'cube' : getCategoryIcon(detailItem.category)}
                        size={40}
                        color={detailItem.isGroup === 1 ? themeColors.brand.blue : (isDarkMode ? '#93C5FD' : themeColors.brand.navy)}
                      />
                    </View>
                  )}
                </View>

                {/* Name */}
                <Typography variant="h2" color={themeColors.text.primary} style={styles.detailItemName}>
                  {detailItem.name}
                </Typography>

                {/* Badges */}
                <View style={styles.detailBadgesRow}>
                  <Badge
                    label={detailItem.isGroup === 1 ? t.inventory.groupBadge : (language === 'en' ? 'SINGLE ITEM' : 'BARANG SATUAN')}
                    variant={detailItem.isGroup === 1 ? 'accent' : 'neutral'}
                    size="md"
                  />
                  <Badge label={detailItem.category} variant="neutral" size="md" />
                </View>

                {/* Group / Container Mapping */}
                <View
                  style={[
                    styles.detailMappingBox,
                    {
                      backgroundColor: isDarkMode ? themeColors.surface.muted : '#F8FAFC',
                      borderColor: themeColors.border.default,
                    },
                  ]}
                >
                  <Typography variant="caption" color={themeColors.text.secondary} style={{ fontWeight: '700', marginBottom: 6 }}>
                    {t.inventory.detailGroupMapping}
                  </Typography>

                  {detailItem.isGroup === 1 ? (
                    <View>
                      <Typography variant="body" color={themeColors.brand.navy} style={{ fontWeight: '600' }}>
                        {format(t.inventory.detailGroupContains, {
                          count: itemsList.filter((it) => it.parentId === detailItem.id).length,
                        })}
                      </Typography>
                      <View style={{ marginTop: 6, gap: 4 }}>
                        {itemsList
                          .filter((it) => it.parentId === detailItem.id)
                          .map((ch) => (
                            <View key={ch.id} style={styles.detailChildItemRow}>
                              <Ionicons name="return-down-forward" size={14} color={themeColors.brand.blue} />
                              <Typography variant="caption" color={themeColors.text.primary} style={{ marginLeft: 6, fontWeight: '600', flex: 1 }}>
                                {ch.name}
                              </Typography>
                              <Badge label={ch.category} variant="neutral" size="sm" />
                            </View>
                          ))}
                        {itemsList.filter((it) => it.parentId === detailItem.id).length === 0 && (
                          <Typography variant="caption" color={themeColors.text.secondary} style={{ fontStyle: 'italic', marginTop: 4 }}>
                            {t.inventory.groupEmptyDesc}
                          </Typography>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        {detailItem.parentId ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="cube" size={15} color={themeColors.brand.blue} style={{ marginRight: 5 }} />
                            <Typography variant="body" color={themeColors.brand.navy} style={{ fontWeight: '600' }}>
                              {itemsList.find((it) => it.id === detailItem.parentId)?.name || 'Unknown Group'}
                            </Typography>
                          </View>
                        ) : (
                          <Typography variant="body" color={themeColors.text.secondary}>
                            {t.inventory.detailNoGroup}
                          </Typography>
                        )}
                      </View>

                      <Button
                        label={language === 'en' ? 'Move Group' : 'Pindah Grup'}
                        size="sm"
                        variant="secondary"
                        onPress={() => {
                          const it = detailItem;
                          setItemToMoveGroup(it);
                        }}
                      />
                    </View>
                  )}
                </View>

                {/* Notes */}
                {detailItem.notes && (
                  <View style={{ marginTop: spacing[3] }}>
                    <Typography variant="caption" color={themeColors.text.secondary} style={{ fontWeight: '700', marginBottom: 4 }}>
                      {t.inventory.detailNotesLabel}
                    </Typography>
                    <View
                      style={[
                        styles.detailNotesBox,
                        {
                          backgroundColor: isDarkMode ? themeColors.surface.muted : '#F8FAFC',
                          borderColor: themeColors.border.default,
                        },
                      ]}
                    >
                      <Typography variant="body" color={themeColors.text.primary} style={{ fontSize: 13, lineHeight: 19 }}>
                        {detailItem.notes}
                      </Typography>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.detailActionButtonsRow}>
                <Button
                  label={t.inventory.deleteBtn}
                  variant="destructive"
                  size="sm"
                  onPress={() => {
                    const it = detailItem;
                    setDetailItem(null);
                    handleConfirmDelete(it);
                  }}
                  style={{ marginRight: 'auto' }}
                />
                <Button
                  label={detailItem.isGroup === 1 ? t.inventory.editGroupBtn : t.inventory.editItemBtn}
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    const it = detailItem;
                    setDetailItem(null);
                    handleOpenEditModal(it);
                  }}
                />
                <Button
                  label={t.inventory.cancelBtn}
                  variant="ghost"
                  size="sm"
                  onPress={() => setDetailItem(null)}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Quick Move Group Modal */}
      {itemToMoveGroup && (
        <Modal
          visible={!!itemToMoveGroup}
          transparent
          animationType="fade"
          onRequestClose={() => setItemToMoveGroup(null)}
        >
          <Pressable style={styles.modalOverlayCenter} onPress={() => setItemToMoveGroup(null)}>
            <Pressable
              style={[
                styles.modalCard,
                { backgroundColor: themeColors.surface.card, maxHeight: '80%' },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Typography variant="h3" color={themeColors.brand.navy}>
                    {t.inventory.moveToGroupTitle}
                  </Typography>
                  <Typography variant="caption" color={themeColors.text.secondary} style={{ marginTop: 2 }}>
                    {t.inventory.moveToGroupSubtitle}
                  </Typography>
                </View>
                <Pressable onPress={() => setItemToMoveGroup(null)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={themeColors.text.secondary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 300 }}>
                {/* Standalone option */}
                <Pressable
                  style={[
                    styles.moveGroupOptionRow,
                    {
                      backgroundColor: !itemToMoveGroup.parentId
                        ? (isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE')
                        : (isDarkMode ? themeColors.surface.muted : '#F8FAFC'),
                      borderColor: !itemToMoveGroup.parentId ? themeColors.brand.blue : themeColors.border.default,
                    },
                  ]}
                  onPress={async () => {
                    const it = itemToMoveGroup;
                    try {
                      await itemRepository.updateParent(it.id, null);
                      await loadItems();
                      if (detailItem?.id === it.id) {
                        setDetailItem({ ...detailItem, parentId: null });
                      }
                      setItemToMoveGroup(null);
                    } catch {
                      Alert.alert('Error', 'Gagal memindahkan barang.');
                    }
                  }}
                >
                  <Ionicons name="cube-outline" size={20} color={!itemToMoveGroup.parentId ? themeColors.brand.blue : themeColors.text.secondary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Typography variant="body" color={themeColors.brand.navy} style={{ fontWeight: '600' }}>
                      {t.inventory.detachFromGroup}
                    </Typography>
                    <Typography variant="caption" color={themeColors.text.secondary}>
                      {language === 'en' ? 'Make this item standalone' : 'Jadikan barang ini mandiri tanpa paket'}
                    </Typography>
                  </View>
                  {!itemToMoveGroup.parentId && (
                    <Ionicons name="checkmark-circle" size={20} color={themeColors.brand.blue} />
                  )}
                </Pressable>

                {/* Available Groups */}
                {availableGroups.map((grp: ItemRecord) => {
                  const isSelected = itemToMoveGroup.parentId === grp.id;
                  const childCount = itemsList.filter((it) => it.parentId === grp.id).length;
                  return (
                    <Pressable
                      key={grp.id}
                      style={[
                        styles.moveGroupOptionRow,
                        {
                          backgroundColor: isSelected
                            ? (isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE')
                            : (isDarkMode ? themeColors.surface.muted : '#F8FAFC'),
                          borderColor: isSelected ? themeColors.brand.blue : themeColors.border.default,
                        },
                      ]}
                      onPress={async () => {
                        const it = itemToMoveGroup;
                        try {
                          await itemRepository.updateParent(it.id, grp.id);
                          await loadItems();
                          if (detailItem?.id === it.id) {
                            setDetailItem({ ...detailItem, parentId: grp.id });
                          }
                          setItemToMoveGroup(null);
                        } catch {
                          Alert.alert('Error', 'Gagal memindahkan barang.');
                        }
                      }}
                    >
                      <Ionicons name="cube" size={20} color={isSelected ? themeColors.brand.blue : themeColors.brand.coral} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Typography variant="body" color={themeColors.brand.navy} style={{ fontWeight: '600' }}>
                          {grp.name}
                        </Typography>
                        <Typography variant="caption" color={themeColors.text.secondary}>
                          {childCount} {language === 'en' ? 'items inside' : 'barang di dalamnya'}
                        </Typography>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={themeColors.brand.blue} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Button
                label={t.inventory.cancelBtn}
                variant="secondary"
                size="md"
                onPress={() => setItemToMoveGroup(null)}
                style={{ marginTop: 12 }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
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
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  itemThumbImage: {
    width: 42,
    height: 42,
    borderRadius: 8,
    marginRight: spacing[3],
    backgroundColor: '#E2E8F0',
  },
  categoryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    marginBottom: 2,
  },
  itemActionsRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  iconButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 27, 77, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(7, 27, 77, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalCard: {
    width: '100%',
    borderRadius: radius.lg,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailModalCard: {
    width: '100%',
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: '85%',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  detailImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  detailImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: '#E2E8F0',
  },
  detailIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailItemName: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  detailBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing[3],
  },
  detailMappingBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  detailChildItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailNotesBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  detailActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingTop: spacing[3],
  },
  moveGroupOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  childSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: 4,
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing[5],
    paddingBottom: spacing[8],
    borderWidth: 1,
    maxHeight: '88%',
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: spacing[2],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  inputLabel: {
    marginBottom: 6,
    fontWeight: '600',
  },
  photoPickerBtnsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  photoChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  photoChoiceText: {
    fontWeight: '600',
    fontSize: 12,
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  photoPreviewImage: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: '#CBD5E1',
  },
  photoActionButtons: {
    flex: 1,
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
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  typeSegmentRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  typeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  parentGroupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: 8,
  },
});
