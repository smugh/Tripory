import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Input, Button, Card, ScreenContainer, Badge, DatePickerModal } from '@/components/ui';
import { tripService } from '@/domains/trip/service';
import { destinationRepository } from '@/db/repositories/destination.repository';
import { packingRepository } from '@/db/repositories/packing.repository';
import { formatTripDurationLabel, calculateDurationDays } from '@/core/utils';
import { getTripPresets, TripPreset } from '@/core/constants';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

export default function NewTripScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t, format, language } = useI18n();

  const presets = getTripPresets(language);

  // Helper formatting YYYY-MM-DD
  const formatDateYmd = (d: Date) => d.toISOString().split('T')[0];

  const now = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextWeekend = new Date();
  nextWeekend.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));

  // Compute end date based on start date & duration
  const computeEndDate = (startIso: string, days: number): string => {
    const s = new Date(startIso);
    if (isNaN(s.getTime())) return startIso;
    const end = new Date(s.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
    return formatDateYmd(end);
  };

  // State: Template minimize by default as requested
  const [isTemplateExpanded, setIsTemplateExpanded] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TripPreset | null>(presets[0]);
  const [name, setName] = useState(presets[0].title);
  const [destination, setDestination] = useState(presets[0].destination);
  const [startDate, setStartDate] = useState(formatDateYmd(tomorrow));
  const [endDate, setEndDate] = useState(computeEndDate(formatDateYmd(tomorrow), presets[0].durationDays));
  const [activePicker, setActivePicker] = useState<'departure' | 'end' | null>(null);
  const [notes, setNotes] = useState('');
  const [includeStarterPack, setIncludeStarterPack] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View-only auto-computed duration response
  const durationDays = useMemo(() => calculateDurationDays(startDate, endDate), [startDate, endDate]);
  const durationLabel = useMemo(() => formatTripDurationLabel(startDate, endDate, language), [startDate, endDate, language]);
  const isBackdate = useMemo(() => startDate < formatDateYmd(now), [startDate, now]);

  const applyPreset = (preset: TripPreset) => {
    setSelectedPreset(preset);
    setName(preset.title);
    setDestination(preset.destination);
    setEndDate(computeEndDate(startDate, preset.durationDays));
  };

  const handleStartDateSelect = (dateStr: string) => {
    setStartDate(dateStr);
    if (endDate < dateStr) {
      setEndDate(dateStr);
    }
  };

  const handleEndDateSelect = (dateStr: string) => {
    if (dateStr < startDate) {
      setEndDate(startDate);
    } else {
      setEndDate(dateStr);
    }
  };

  const handleAddDaysToEnd = (daysToAdd: number) => {
    const s = new Date(startDate);
    if (!isNaN(s.getTime())) {
      const target = new Date(s.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      setEndDate(formatDateYmd(target));
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !destination.trim()) {
      Alert.alert(language === 'en' ? 'Required' : 'Perhatian', t.newTrip.alertRequired);
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
      Alert.alert(t.newTrip.alertCreateError, err instanceof Error ? err.message : 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Wizard Header */}
        <View style={styles.header}>
          <Typography variant="h2" color={themeColors.brand.navy} style={styles.headerTitle}>
            {t.newTrip.headerTitle}
          </Typography>
          <Typography variant="body" color={themeColors.text.secondary}>
            {t.newTrip.headerDesc}
          </Typography>
        </View>

        {/* SECTION 1: TEMPLATE PERJALANAN INSTAN (DEFAULT MINIMIZED) */}
        <View style={styles.sectionWrap}>
          <Pressable
            style={[
              styles.templateToggleHeader,
              { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default },
            ]}
            onPress={() => setIsTemplateExpanded((prev) => !prev)}
          >
            <View style={styles.templateHeaderLeft}>
              <View style={[styles.templateIconCircle, { backgroundColor: isDarkMode ? '#1E293B' : '#FFF0EE' }]}>
                <Ionicons name="sparkles" size={16} color={themeColors.brand.coral} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing[2] }}>
                <Typography variant="label" color={themeColors.brand.navy} style={{ fontWeight: '700' }}>
                  {t.newTrip.step1Title}
                </Typography>
                {!isTemplateExpanded && selectedPreset && (
                  <Typography variant="caption" color={themeColors.brand.coral} style={{ marginTop: 2, fontWeight: '600' }}>
                    {format(t.newTrip.activeTemplateNotice, { name: selectedPreset.title, duration: `${selectedPreset.durationDays}D` })}
                  </Typography>
                )}
              </View>
            </View>
            <View style={styles.templateHeaderRight}>
              <Typography variant="caption" color={themeColors.brand.coral} style={{ fontWeight: '700', marginRight: 4 }}>
                {isTemplateExpanded ? t.newTrip.hideTemplates : t.newTrip.showTemplates}
              </Typography>
              <Ionicons
                name={isTemplateExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={themeColors.brand.coral}
              />
            </View>
          </Pressable>

          {/* Preset Cards carousel when expanded */}
          {isTemplateExpanded && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsList}>
              {presets.map((preset) => {
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
          )}
        </View>

        {/* SECTION 2: DETAIL PERJALANAN */}
        <Card elevated style={[styles.formCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <Typography variant="label" color={themeColors.brand.navy} style={styles.sectionTitle}>
            {t.newTrip.step2Title}
          </Typography>

          <Input
            label={t.newTrip.nameLabel}
            placeholder={t.newTrip.namePlaceholder}
            value={name}
            onChangeText={setName}
          />

          <Input
            label={t.newTrip.destLabel}
            placeholder={t.newTrip.destPlaceholder}
            value={destination}
            onChangeText={setDestination}
          />

          {/* DEPARTURE DATE (CAN BACKDATE) */}
          <Typography variant="label" color={themeColors.text.primary} style={styles.fieldLabel}>
            {t.newTrip.departureDateLabel}
          </Typography>
          <Pressable
            style={[styles.dateInputSelector, { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default }]}
            onPress={() => setActivePicker('departure')}
          >
            <View style={styles.dateSelectorContent}>
              <Ionicons name="calendar" size={18} color={themeColors.brand.coral} />
              <Typography variant="body" color={themeColors.brand.navy} style={{ fontWeight: '700', marginLeft: 8 }}>
                {startDate}
              </Typography>
              {isBackdate && (
                <View style={styles.backdateInlineBadge}>
                  <Typography variant="caption" color="#B45309" style={{ fontSize: 10, fontWeight: '700' }}>
                    Backdate
                  </Typography>
                </View>
              )}
            </View>
            <View style={styles.changeDatePill}>
              <Typography variant="caption" color={themeColors.brand.coral} style={{ fontWeight: '700' }}>
                {language === 'en' ? 'Pick Date' : 'Pilih'}
              </Typography>
              <Ionicons name="chevron-forward" size={14} color={themeColors.brand.coral} style={{ marginLeft: 2 }} />
            </View>
          </Pressable>

          {/* Quick Shortcuts for Departure Date */}
          <View style={styles.dateShortcutsRow}>
            <Pressable
              style={[
                styles.dateShortcutPill,
                { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                startDate === formatDateYmd(yesterday) && { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
              ]}
              onPress={() => handleStartDateSelect(formatDateYmd(yesterday))}
            >
              <Typography
                variant="caption"
                color={startDate === formatDateYmd(yesterday) ? '#FFFFFF' : themeColors.text.secondary}
                style={styles.pillText}
              >
                {t.newTrip.yesterday}
              </Typography>
            </Pressable>

            <Pressable
              style={[
                styles.dateShortcutPill,
                { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                startDate === formatDateYmd(now) && { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
              ]}
              onPress={() => handleStartDateSelect(formatDateYmd(now))}
            >
              <Typography
                variant="caption"
                color={startDate === formatDateYmd(now) ? '#FFFFFF' : themeColors.text.secondary}
                style={styles.pillText}
              >
                {t.newTrip.today}
              </Typography>
            </Pressable>

            <Pressable
              style={[
                styles.dateShortcutPill,
                { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                startDate === formatDateYmd(tomorrow) && { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
              ]}
              onPress={() => handleStartDateSelect(formatDateYmd(tomorrow))}
            >
              <Typography
                variant="caption"
                color={startDate === formatDateYmd(tomorrow) ? '#FFFFFF' : themeColors.text.secondary}
                style={styles.pillText}
              >
                {t.newTrip.tomorrow}
              </Typography>
            </Pressable>

            <Pressable
              style={[
                styles.dateShortcutPill,
                { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                startDate === formatDateYmd(nextWeekend) && { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
              ]}
              onPress={() => handleStartDateSelect(formatDateYmd(nextWeekend))}
            >
              <Typography
                variant="caption"
                color={startDate === formatDateYmd(nextWeekend) ? '#FFFFFF' : themeColors.text.secondary}
                style={styles.pillText}
              >
                {t.newTrip.nextWeekend}
              </Typography>
            </Pressable>
          </View>

          {/* END DATE */}
          <Typography variant="label" color={themeColors.text.primary} style={[styles.fieldLabel, { marginTop: spacing[3] }]}>
            {t.newTrip.endDateLabel}
          </Typography>
          <Pressable
            style={[styles.dateInputSelector, { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default }]}
            onPress={() => setActivePicker('end')}
          >
            <View style={styles.dateSelectorContent}>
              <Ionicons name="calendar-outline" size={18} color={themeColors.brand.blue} />
              <Typography variant="body" color={themeColors.brand.navy} style={{ fontWeight: '700', marginLeft: 8 }}>
                {endDate}
              </Typography>
            </View>
            <View style={styles.changeDatePill}>
              <Typography variant="caption" color={themeColors.brand.coral} style={{ fontWeight: '700' }}>
                {language === 'en' ? 'Pick Date' : 'Pilih'}
              </Typography>
              <Ionicons name="chevron-forward" size={14} color={themeColors.brand.coral} style={{ marginLeft: 2 }} />
            </View>
          </Pressable>

          {/* Quick Shortcuts for End Date */}
          <View style={styles.dateShortcutsRow}>
            <Pressable
              style={[
                styles.dateShortcutPill,
                { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                endDate === startDate && { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
              ]}
              onPress={() => handleAddDaysToEnd(0)}
            >
              <Typography
                variant="caption"
                color={endDate === startDate ? '#FFFFFF' : themeColors.text.secondary}
                style={styles.pillText}
              >
                {t.newTrip.sameDay}
              </Typography>
            </Pressable>

            <Pressable
              style={[
                styles.dateShortcutPill,
                { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                endDate === computeEndDate(startDate, 2) && { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
              ]}
              onPress={() => handleAddDaysToEnd(1)}
            >
              <Typography
                variant="caption"
                color={endDate === computeEndDate(startDate, 2) ? '#FFFFFF' : themeColors.text.secondary}
                style={styles.pillText}
              >
                {t.newTrip.plus1Day}
              </Typography>
            </Pressable>

            <Pressable
              style={[
                styles.dateShortcutPill,
                { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                endDate === computeEndDate(startDate, 3) && { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
              ]}
              onPress={() => handleAddDaysToEnd(2)}
            >
              <Typography
                variant="caption"
                color={endDate === computeEndDate(startDate, 3) ? '#FFFFFF' : themeColors.text.secondary}
                style={styles.pillText}
              >
                {t.newTrip.plus2Days}
              </Typography>
            </Pressable>

            <Pressable
              style={[
                styles.dateShortcutPill,
                { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                endDate === computeEndDate(startDate, 4) && { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
              ]}
              onPress={() => handleAddDaysToEnd(3)}
            >
              <Typography
                variant="caption"
                color={endDate === computeEndDate(startDate, 4) ? '#FFFFFF' : themeColors.text.secondary}
                style={styles.pillText}
              >
                {t.newTrip.plus3Days}
              </Typography>
            </Pressable>
          </View>

          {/* TRIP DURATION (VIEW ONLY RESPONSE FROM START DATE AND BACKDATE) */}
          <Typography variant="label" color={themeColors.text.primary} style={[styles.fieldLabel, { marginTop: spacing[3] }]}>
            {t.newTrip.durationViewOnlyLabel}
          </Typography>

          <View
            style={[
              styles.viewOnlyDurationCard,
              {
                backgroundColor: isDarkMode ? '#0F2942' : '#F0F9FF',
                borderColor: isDarkMode ? '#0369A1' : '#BAE6FD',
              },
            ]}
          >
            <View style={styles.viewOnlyTopRow}>
              <View style={styles.viewOnlyDurationLeft}>
                <Ionicons name="time" size={20} color={themeColors.brand.coral} />
                <Typography variant="h3" color={themeColors.brand.navy} style={{ fontWeight: '800', marginLeft: 8 }}>
                  {durationLabel}
                </Typography>
              </View>
              <Badge
                label={`${durationDays}D ${Math.max(0, durationDays - 1)}N`}
                variant="primary"
                size="sm"
              />
            </View>

            <View style={styles.viewOnlyDetailsRow}>
              <Ionicons name="calendar-outline" size={14} color={themeColors.text.muted} />
              <Typography variant="caption" color={themeColors.text.secondary} style={{ marginLeft: 5 }}>
                {startDate} {t.newTrip.to} {endDate}
              </Typography>
            </View>

            {isBackdate && (
              <View style={styles.backdateNoticeBox}>
                <Ionicons name="time-outline" size={13} color={themeColors.brand.navy} />
                <Typography variant="caption" color={themeColors.brand.navy} style={{ marginLeft: 4, fontWeight: '700' }}>
                  {t.newTrip.backdateBadge}
                </Typography>
              </View>
            )}
          </View>

          {/* Switch: Pre-populate starter pack */}
          <View style={[styles.switchRow, { borderTopColor: themeColors.border.muted }]}>
            <View style={styles.switchInfo}>
              <Typography variant="label" color={themeColors.brand.navy}>
                {t.newTrip.starterPackLabel}
              </Typography>
              <Typography variant="caption" color={themeColors.text.secondary}>
                {t.newTrip.starterPackDesc}
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
            label={t.newTrip.submitBtn}
            variant="accent"
            size="lg"
            isLoading={isSubmitting}
            onPress={handleCreate}
            style={styles.submitButton}
          />
        </Card>
      </ScrollView>

      {/* Date Picker Modals */}
      <DatePickerModal
        visible={activePicker === 'departure'}
        value={startDate}
        title={t.newTrip.calendarPickerTitleDep}
        language={language}
        onConfirm={handleStartDateSelect}
        onClose={() => setActivePicker(null)}
      />

      <DatePickerModal
        visible={activePicker === 'end'}
        value={endDate}
        title={t.newTrip.calendarPickerTitleEnd}
        minDate={startDate}
        language={language}
        onConfirm={handleEndDateSelect}
        onClose={() => setActivePicker(null)}
      />
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
  templateToggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  templateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  templateIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '800',
    marginBottom: spacing[2],
  },
  presetsList: {
    gap: spacing[3],
    paddingRight: spacing[2],
    marginTop: spacing[1],
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
  pillText: {
    fontWeight: '700',
  },
  dateInputSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  dateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backdateInlineBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: 8,
  },
  changeDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: '#FFF0EE',
  },
  viewOnlyDurationCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  viewOnlyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  viewOnlyDurationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewOnlyDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backdateNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
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
