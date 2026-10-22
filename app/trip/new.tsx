import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Input, Button, Card, ScreenContainer, Badge } from '@/components/ui';
import { tripService } from '@/domains/trip/service';
import { destinationRepository } from '@/db/repositories/destination.repository';
import { packingRepository } from '@/db/repositories/packing.repository';
import { formatTripDurationLabel } from '@/core/utils';
import { TRIP_PRESETS, TripPreset } from '@/core/constants';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

export default function NewTripScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { language } = useI18n();

  // Helper formatting YYYY-MM-DD
  const formatDateYmd = (d: Date) => d.toISOString().split('T')[0];

  const now = new Date();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextWeekend = new Date();
  nextWeekend.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));

  const [selectedPreset, setSelectedPreset] = useState<TripPreset | null>(TRIP_PRESETS[0]);
  const [name, setName] = useState(TRIP_PRESETS[0].title);
  const [destination, setDestination] = useState(TRIP_PRESETS[0].destination);
  const [startDate, setStartDate] = useState(formatDateYmd(tomorrow));
  const [durationDays, setDurationDays] = useState(TRIP_PRESETS[0].durationDays);
  const [notes, setNotes] = useState('');
  const [includeStarterPack, setIncludeStarterPack] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute end date based on start date & duration
  const computeEndDate = (startIso: string, days: number): string => {
    const s = new Date(startIso);
    if (isNaN(s.getTime())) return startIso;
    const end = new Date(s.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
    return formatDateYmd(end);
  };

  const endDate = computeEndDate(startDate, durationDays);
  const durationLabel = formatTripDurationLabel(startDate, endDate);

  const applyPreset = (preset: TripPreset) => {
    setSelectedPreset(preset);
    setName(preset.title);
    setDestination(preset.destination);
    setDurationDays(preset.durationDays);
  };

  const handleStartDateSelect = (date: Date) => {
    setStartDate(formatDateYmd(date));
  };

  const handleCreate = async () => {
    if (!name.trim() || !destination.trim()) {
      Alert.alert('Perhatian', 'Nama perjalanan dan destinasi utama wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      const trip = await tripService.createTrip({
        name,
        destination,
        startDate,
        endDate,
        notes,
      });

      // Jika user memilih menyertakan paket starter:
      if (includeStarterPack && selectedPreset) {
        // Buat titik destinasi roadmap awal
        const createdDests = [];
        for (let i = 0; i < selectedPreset.defaultDestinations.length; i++) {
          const d = selectedPreset.defaultDestinations[i];
          const destRecord = await destinationRepository.create({
            tripId: trip.id,
            name: d.name,
            activity: d.activity,
            dayNumber: d.dayNumber,
            orderIndex: i,
            plannedTime: d.plannedTime,
            locationLabel: null,
            latitude: null,
            longitude: null,
          });
          createdDests.push(destRecord);
        }

        // Buat checklist barang starter
        for (const it of selectedPreset.defaultItems) {
          await packingRepository.addTripItem({
            tripId: trip.id,
            itemId: null,
            customName: it.name,
            category: it.category,
            plannedDestinationId: createdDests[0]?.id ?? null,
            state: 'planned',
            priority: it.priority,
            quantity: it.quantity,
            notes: null,
          });
        }
      }

      router.replace(`/trip/${trip.id}`);
    } catch (err) {
      Alert.alert('Gagal Membuat Trip', err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Back Navigation */}
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={20} color={themeColors.brand.navy} />
          <Typography variant="label" color={themeColors.brand.navy} style={styles.backText}>
            {language === 'en' ? 'Back' : 'Kembali'}
          </Typography>
        </Pressable>

        {/* Wizard Header */}
        <View style={styles.header}>
          <Typography variant="h2" color={themeColors.brand.navy} style={styles.headerTitle}>
            {language === 'en' ? 'Plan Your Journey' : 'Rencanakan Perjalanan Anda'}
          </Typography>
          <Typography variant="body" color={themeColors.text.secondary}>
            {language === 'en'
              ? 'Choose a quick template or customize your schedule details.'
              : 'Pilih template kilat atau sesuaikan rincian jadwal perjalanan Anda.'}
          </Typography>
        </View>

        {/* SECTION 1: TEMPLATE PERJALANAN INSTAN */}
        <View style={styles.sectionWrap}>
          <Typography variant="label" color={themeColors.brand.navy} style={styles.sectionTitle}>
            {language === 'en' ? '1. Select Quick Template (Recommended)' : '1. Pilih Template Kilat (Rekomendasi)'}
          </Typography>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsList}>
            {TRIP_PRESETS.map((preset) => {
              const isSelected = selectedPreset?.id === preset.id;
              return (
                <Pressable
                  key={preset.id}
                  onPress={() => applyPreset(preset)}
                  style={[
                    styles.presetCard,
                    {
                      backgroundColor: themeColors.surface.card,
                      borderColor: isSelected ? themeColors.brand.coral : themeColors.border.default,
                    },
                    isSelected && {
                      backgroundColor: isDarkMode ? 'rgba(245, 107, 95, 0.15)' : '#FFF9F8',
                    },
                  ]}
                >
                  <View style={styles.presetTop}>
                    <Ionicons
                      name={preset.icon as any}
                      size={20}
                      color={isSelected ? themeColors.brand.coral : themeColors.brand.blue}
                    />
                    <Badge
                      label={preset.badge}
                      variant={isSelected ? 'accent' : 'neutral'}
                      size="sm"
                    />
                  </View>
                  <Typography
                    variant="h3"
                    color={themeColors.text.primary}
                    style={styles.presetTitle}
                    numberOfLines={1}
                  >
                    {preset.title}
                  </Typography>
                  <Typography variant="caption" color={themeColors.text.secondary} numberOfLines={2}>
                    {preset.tagline}
                  </Typography>

                  <View style={[styles.presetFooter, { borderTopColor: themeColors.border.muted }]}>
                    <Ionicons name="location-outline" size={12} color={themeColors.text.muted} />
                    <Typography variant="caption" color={themeColors.text.muted} style={styles.presetDestText}>
                      {preset.destination}
                    </Typography>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* SECTION 2: DETAIL PERJALANAN */}
        <Card elevated style={[styles.formCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <Typography variant="label" color={themeColors.brand.navy} style={styles.sectionTitle}>
            {language === 'en' ? '2. Customize Trip Information' : '2. Sesuaikan Informasi Perjalanan'}
          </Typography>

          <Input
            label={language === 'en' ? 'Trip Name *' : 'Nama Perjalanan *'}
            placeholder={language === 'en' ? 'e.g. Weekend Getaway' : 'Contoh: Liburan Seru Akhir Pekan'}
            value={name}
            onChangeText={setName}
          />

          <Input
            label={language === 'en' ? 'Main Destination *' : 'Destinasi Utama *'}
            placeholder={language === 'en' ? 'e.g. Puncak, Bogor' : 'Contoh: Puncak, Bogor'}
            value={destination}
            onChangeText={setDestination}
          />

          {/* Quick Date Shortcuts */}
          <Typography variant="label" color={themeColors.text.primary} style={styles.fieldLabel}>
            {language === 'en' ? 'Departure Date' : 'Waktu Keberangkatan'}
          </Typography>
          <View style={styles.dateShortcutsRow}>
            <Pressable
              style={[
                styles.dateShortcutPill,
                { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                startDate === formatDateYmd(now) && { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
              ]}
              onPress={() => handleStartDateSelect(now)}
            >
              <Typography
                variant="caption"
                color={startDate === formatDateYmd(now) ? '#FFFFFF' : themeColors.text.secondary}
                style={styles.pillText}
              >
                {language === 'en' ? 'Today' : 'Hari Ini'}
              </Typography>
            </Pressable>

            <Pressable
              style={[
                styles.dateShortcutPill,
                { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                startDate === formatDateYmd(tomorrow) && { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
              ]}
              onPress={() => handleStartDateSelect(tomorrow)}
            >
              <Typography
                variant="caption"
                color={startDate === formatDateYmd(tomorrow) ? '#FFFFFF' : themeColors.text.secondary}
                style={styles.pillText}
              >
                {language === 'en' ? 'Tomorrow' : 'Besok'}
              </Typography>
            </Pressable>

            <Pressable
              style={[
                styles.dateShortcutPill,
                { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                startDate === formatDateYmd(nextWeekend) && { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
              ]}
              onPress={() => handleStartDateSelect(nextWeekend)}
            >
              <Typography
                variant="caption"
                color={startDate === formatDateYmd(nextWeekend) ? '#FFFFFF' : themeColors.text.secondary}
                style={styles.pillText}
              >
                {language === 'en' ? 'Next Weekend' : 'Akhir Pekan'}
              </Typography>
            </Pressable>
          </View>

          {/* Duration Selector */}
          <Typography variant="label" color={themeColors.text.primary} style={styles.fieldLabel}>
            {language === 'en' ? 'Trip Duration' : 'Durasi Perjalanan'}
          </Typography>
          <View style={styles.durationPillsRow}>
            {[
              { days: 1, label: language === 'en' ? '1 Day' : '1 Hari' },
              { days: 2, label: '2D 1N' },
              { days: 3, label: '3D 2N' },
              { days: 4, label: '4D 3N' },
              { days: 5, label: '5D 4N' },
            ].map((dur) => (
              <Pressable
                key={dur.days}
                style={[
                  styles.durPill,
                  { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                  durationDays === dur.days && { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
                ]}
                onPress={() => setDurationDays(dur.days)}
              >
                <Typography
                  variant="caption"
                  color={durationDays === dur.days ? '#FFFFFF' : themeColors.brand.navy}
                  style={styles.pillText}
                >
                  {dur.label}
                </Typography>
              </Pressable>
            ))}
          </View>

          {/* Computed Duration Banner */}
          <View style={[styles.durationBanner, { backgroundColor: isDarkMode ? '#082F49' : '#F0F9FF', borderColor: isDarkMode ? '#0369A1' : '#BAE6FD' }]}>
            <Ionicons name="calendar-outline" size={18} color={themeColors.brand.blue} />
            <View style={styles.bannerInfo}>
              <Typography variant="label" color={themeColors.brand.navy}>
                {durationLabel}
              </Typography>
              <Typography variant="caption" color={themeColors.text.secondary}>
                {startDate} {language === 'en' ? 'to' : 'sampai'} {endDate}
              </Typography>
            </View>
          </View>

          {/* Switch: Pre-populate starter pack */}
          <View style={[styles.switchRow, { borderTopColor: themeColors.border.muted }]}>
            <View style={styles.switchInfo}>
              <Typography variant="label" color={themeColors.brand.navy}>
                {language === 'en' ? 'Include Starter Roadmap & Checklist' : 'Sertakan Roadmap & Checklist Starter'}
              </Typography>
              <Typography variant="caption" color={themeColors.text.secondary}>
                {language === 'en'
                  ? 'Automatically pre-fills 3 destination stops and essential items.'
                  : 'Otomatis mengisi 3 titik destinasi dan barang esensial agar Anda tidak perlu mengetik dari nol.'}
              </Typography>
            </View>
            <Switch
              value={includeStarterPack}
              onValueChange={setIncludeStarterPack}
              trackColor={{ false: themeColors.border.default, true: themeColors.brand.coral }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Submit CTA */}
          <Button
            label={language === 'en' ? '🚀 Create & Open Trip Roadmap' : '🚀 Buat & Buka Roadmap Perjalanan'}
            variant="accent"
            size="lg"
            isLoading={isSubmitting}
            onPress={handleCreate}
            style={styles.submitButton}
          />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: spacing[3],
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
    paddingVertical: spacing[1],
  },
  backText: {
    marginLeft: 6,
    fontWeight: '700',
  },
  header: {
    marginBottom: spacing[4],
  },
  headerTitle: {
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sectionWrap: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontWeight: '800',
    marginBottom: spacing[2],
  },
  presetsList: {
    gap: spacing[3],
    paddingRight: spacing[2],
  },
  presetCard: {
    width: 220,
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    padding: spacing[3],
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  presetCardActive: {
    borderColor: colors.brand.coral,
    backgroundColor: '#FFF9F8',
  },
  presetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  presetTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  presetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingTop: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  presetDestText: {
    marginLeft: 4,
    fontSize: 11,
  },
  formCard: {
    padding: spacing[5],
    marginBottom: spacing[6],
  },
  fieldLabel: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  dateShortcutsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  dateShortcutPill: {
    flex: 1,
    backgroundColor: colors.surface.muted,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  dateShortcutActive: {
    backgroundColor: colors.brand.navy,
    borderColor: colors.brand.navy,
  },
  durationPillsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  durPill: {
    flex: 1,
    backgroundColor: colors.surface.muted,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  durPillActive: {
    backgroundColor: colors.brand.navy,
    borderColor: colors.brand.navy,
  },
  pillText: {
    fontWeight: '700',
  },
  durationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[4],
  },
  bannerInfo: {
    marginLeft: 10,
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
    marginBottom: spacing[4],
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  submitButton: {
    marginTop: spacing[1],
  },
});
