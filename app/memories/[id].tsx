import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, Card, Badge } from '@/components/ui';
import { useThemeColors, spacing, radius } from '@/core/theme';
import { useI18n } from '@/core/i18n';
import { tripRepository } from '@/db/repositories/trip.repository';
import { destinationRepository } from '@/db/repositories/destination.repository';
import { momentRepository } from '@/db/repositories/moment.repository';
import { packingRepository } from '@/db/repositories/packing.repository';
import { mediaService } from '@/services/media';
import { TripRecord } from '@/db/schema/trips';
import { DestinationRecord } from '@/db/schema/destinations';
import { MomentRecord } from '@/db/schema/moments';
import { TripItemRecord } from '@/db/schema/trip-items';
import { formatDateRange, formatTripDurationLabel } from '@/core/utils';

type StoryEntry =
  | { kind: 'destination'; key: string; sortAt: number; destination: DestinationRecord }
  | { kind: 'moment'; key: string; sortAt: number; moment: MomentRecord };

export default function TravelMemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const { language } = useI18n();
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [moments, setMoments] = useState<MomentRecord[]>([]);
  const [missingItems, setMissingItems] = useState<TripItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadStory = useCallback(async () => {
    if (!id) return;
    try {
      const tripRecord = await tripRepository.getById(id);
      if (!tripRecord) return;
      setTrip(tripRecord);
      setNotesDraft(tripRecord.notes ?? '');
      const [tripStops, tripMoments, tripItems] = await Promise.all([
        destinationRepository.getByTripId(id),
        momentRepository.getByTripId(id),
        packingRepository.getByTripId(id),
      ]);
      setDestinations(tripStops);
      setMoments(tripMoments);
      setMissingItems(tripItems.filter((item) => item.state === 'missing'));
    } catch {
      setTrip(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStory();
  }, [loadStory]);

  const saveEdits = async () => {
    if (!trip) return;
    try {
      setIsSaving(true);
      const notes = notesDraft.trim() || null;
      await tripRepository.update(trip.id, { notes });
      setTrip({ ...trip, notes });
      setIsEditing(false);
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', language === 'en' ? 'Could not save your notes.' : 'Catatan belum berhasil disimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  const addMemoryPhoto = async (useCamera: boolean) => {
    if (!trip) return;
    try {
      setIsSaving(true);
      const media = useCamera
        ? await mediaService.takePhoto()
        : await mediaService.pickImageFromGallery();
      if (!media) return;
      await momentRepository.create({
        tripId: trip.id,
        destinationId: null,
        caption: null,
        photoPath: media.fullUri,
        locationName: null,
        latitude: null,
        longitude: null,
        capturedAt: new Date().toISOString(),
      });
      setMoments(await momentRepository.getByTripId(trip.id));
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', language === 'en' ? 'Could not add this photo.' : 'Foto belum berhasil ditambahkan.');
    } finally {
      setIsSaving(false);
    }
  };

  const promptAddPhoto = () => {
    Alert.alert(
      language === 'en' ? 'Add a memory photo' : 'Tambah foto kenangan',
      language === 'en' ? 'Choose where to get the photo.' : 'Pilih sumber foto.',
      [
        { text: language === 'en' ? 'Take photo' : 'Ambil foto', onPress: () => addMemoryPhoto(true) },
        { text: language === 'en' ? 'Choose from gallery' : 'Pilih dari galeri', onPress: () => addMemoryPhoto(false) },
        { text: language === 'en' ? 'Cancel' : 'Batal', style: 'cancel' },
      ]
    );
  };

  const storyEntries = useMemo<StoryEntry[]>(() => {
    if (!trip) return [];
    const start = new Date(trip.startDate);
    const destinationEntries: StoryEntry[] = destinations.map((destination) => {
      const day = new Date(start);
      day.setDate(day.getDate() + Math.max(0, destination.dayNumber - 1));
      return {
        kind: 'destination',
        key: `destination-${destination.id}`,
        sortAt: day.getTime(),
        destination,
      };
    });
    const momentEntries: StoryEntry[] = moments
      .filter((moment) => moment.photoPath && !moment.photoPath.startsWith('local://placeholder'))
      .map((moment) => ({
        kind: 'moment',
        key: `moment-${moment.id}`,
        sortAt: new Date(moment.capturedAt).getTime(),
        moment,
      }));
    return [...destinationEntries, ...momentEntries].sort((a, b) => a.sortAt - b.sortAt);
  }, [destinations, moments, trip]);

  const coverImage = moments.find((moment) => !moment.photoPath.startsWith('local://placeholder'))?.photoPath
    || destinations.find((destination) => destination.imageUri)?.imageUri
    || null;

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand.coral} />
        </View>
      </ScreenContainer>
    );
  }

  if (!trip) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <Typography variant="body" color={colors.text.secondary}>
            {language === 'en' ? 'This memory could not be found.' : 'Kenangan ini tidak ditemukan.'}
          </Typography>
          <Pressable onPress={() => router.back()} style={styles.backFallback}>
            <Typography variant="label" color={colors.brand.blue}>{language === 'en' ? 'Go back' : 'Kembali'}</Typography>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, styles.heroFallback]} />
          )}
          <View style={styles.heroShade} />
          {isEditing ? (
            <Pressable onPress={promptAddPhoto} style={styles.heroPhotoAction} disabled={isSaving}>
              <Ionicons name="camera-outline" size={17} color="#FFFFFF" />
              <Typography variant="caption" color="#FFFFFF" style={styles.heroPhotoActionText}>
                {language === 'en' ? 'Add a photo' : 'Tambah foto'}
              </Typography>
            </Pressable>
          ) : null}
          <View style={styles.heroCopy}>
            <Badge label={language === 'en' ? 'TRAVEL MEMORY' : 'KENANGAN PERJALANAN'} variant="accent" size="sm" />
            <Typography variant="h1" color="#FFFFFF" style={styles.heroTitle}>{trip.name}</Typography>
            <View style={styles.heroDestination}>
              <Ionicons name="location-sharp" size={15} color="#FFD0C8" />
              <Typography variant="body" color="#FFFFFF" style={styles.heroDestinationText}>{trip.destination}</Typography>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.metaCard, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.brand.coral} />
            <View style={styles.metaCopy}>
              <Typography variant="caption" color={colors.text.muted}>{language === 'en' ? 'WHEN' : 'WAKTU'}</Typography>
              <Typography variant="label" color={colors.brand.navy}>{formatDateRange(trip.startDate, trip.endDate, language)}</Typography>
            </View>
          </View>
          <View style={[styles.metaCard, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <Ionicons name="time-outline" size={18} color={colors.brand.blue} />
            <View style={styles.metaCopy}>
              <Typography variant="caption" color={colors.text.muted}>{language === 'en' ? 'LENGTH' : 'DURASI'}</Typography>
              <Typography variant="label" color={colors.brand.navy}>{formatTripDurationLabel(trip.startDate, trip.endDate, language)}</Typography>
            </View>
          </View>
        </View>

        {trip.hasMissingItems || missingItems.length > 0 ? (
          <View style={styles.missingNote}>
            <Ionicons name="alert-circle" size={20} color="#B54708" />
            <View style={styles.missingNoteCopy}>
              <Typography variant="label" color="#8A3412">
                {language === 'en' ? 'A few things did not make it home' : 'Ada barang yang belum kembali'}
              </Typography>
              <Typography variant="caption" color="#8A3412" style={styles.missingNoteText}>
                {language === 'en'
                  ? 'These items were marked missing during the return check.'
                  : 'Barang berikut ditandai belum ditemukan saat cek kepulangan.'}
              </Typography>
              {missingItems.map((item) => (
                <Typography key={item.id} variant="caption" color="#8A3412" style={styles.missingItemName}>
                  • {item.customName}{item.quantity > 1 ? ` × ${item.quantity}` : ''}
                </Typography>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.storyHeading}>
          <View>
            <Typography variant="h2" color={colors.brand.navy}>
              {language === 'en' ? 'The journey' : 'Alur perjalanan'}
            </Typography>
            <Typography variant="caption" color={colors.text.secondary}>
              {language === 'en' ? 'Little moments that made this trip yours.' : 'Potongan momen yang membuat perjalanan ini berkesan.'}
            </Typography>
          </View>
          <Ionicons name="sparkles-outline" size={22} color={colors.brand.coral} />
        </View>

        {storyEntries.length === 0 ? (
          <Card style={styles.emptyStory}>
            <Ionicons name="images-outline" size={28} color={colors.brand.coral} />
            <Typography variant="body" color={colors.text.secondary} style={styles.emptyStoryText}>
              {language === 'en'
                ? 'No stops or photos were saved for this trip. The journey still happened; this album can grow whenever you add its memories.'
                : 'Belum ada destinasi atau foto yang tersimpan untuk perjalanan ini. Ceritanya tetap ada, dan album ini bisa dilengkapi kapan saja.'}
            </Typography>
          </Card>
        ) : (
          <View style={styles.timeline}>
            {storyEntries.map((entry, index) => (
              <View key={entry.key} style={styles.timelineEntry}>
                <View style={styles.timelineRail}>
                  <View style={[styles.timelineDot, { backgroundColor: entry.kind === 'moment' ? colors.brand.coral : colors.brand.blue }]}>
                    <Ionicons name={entry.kind === 'moment' ? 'camera' : 'location'} size={12} color="#FFFFFF" />
                  </View>
                  {index < storyEntries.length - 1 ? <View style={[styles.timelineLine, { backgroundColor: colors.border.default }]} /> : null}
                </View>
                <View style={styles.timelineContent}>
                  {entry.kind === 'destination' ? (
                    <Card style={styles.destinationCard}>
                      <View style={styles.dayRow}>
                        <Badge label={`${language === 'en' ? 'DAY' : 'HARI'} ${entry.destination.dayNumber}`} variant="accent" size="sm" />
                        {entry.destination.plannedTime ? (
                          <Typography variant="caption" color={colors.text.muted}>{entry.destination.plannedTime}</Typography>
                        ) : null}
                      </View>
                      <Typography variant="h3" color={colors.brand.navy} style={styles.destinationTitle}>{entry.destination.name}</Typography>
                      {entry.destination.activity ? (
                        <Typography variant="body" color={colors.text.secondary}>{entry.destination.activity}</Typography>
                      ) : null}
                      {entry.destination.locationLabel ? (
                        <View style={styles.locationLabel}>
                          <Ionicons name="navigate-outline" size={13} color={colors.brand.blue} />
                          <Typography variant="caption" color={colors.brand.blue}>{entry.destination.locationLabel}</Typography>
                        </View>
                      ) : null}
                      {entry.destination.imageUri ? (
                        <Image source={{ uri: entry.destination.imageUri }} style={styles.destinationImage} resizeMode="cover" />
                      ) : null}
                    </Card>
                  ) : (
                    <View style={[styles.memoryCard, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
                      <Image source={{ uri: entry.moment.photoPath }} style={styles.memoryImage} resizeMode="cover" />
                      <View style={styles.memoryCaption}>
                        <Typography variant="label" color={colors.brand.navy}>
                          {entry.moment.caption || (language === 'en' ? 'A moment to remember' : 'Momen untuk dikenang')}
                        </Typography>
                        <View style={styles.memoryMeta}>
                          <Ionicons name="time-outline" size={13} color={colors.text.muted} />
                          <Typography variant="caption" color={colors.text.muted}>
                            {new Date(entry.moment.capturedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
                              day: 'numeric', month: 'long', year: 'numeric',
                            })}
                          </Typography>
                          {entry.moment.locationName ? (
                            <>
                              <Ionicons name="location-outline" size={13} color={colors.brand.coral} />
                              <Typography variant="caption" color={colors.text.secondary} numberOfLines={1} style={styles.memoryLocation}>
                                {entry.moment.locationName}
                              </Typography>
                            </>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.notesCard, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
          <View style={styles.notesHeader}>
            <View style={styles.notesTitleRow}>
              <Ionicons name="book-outline" size={18} color={colors.brand.coral} />
              <Typography variant="h3" color={colors.brand.navy} style={styles.notesTitle}>
                {language === 'en' ? 'Trip notes' : 'Catatan perjalanan'}
              </Typography>
            </View>
          </View>
          {isEditing ? (
            <TextInput
              value={notesDraft}
              onChangeText={setNotesDraft}
              multiline
              textAlignVertical="top"
              placeholder={language === 'en' ? 'Write down a detail you want to remember…' : 'Tulis detail perjalanan yang ingin kamu kenang…'}
              placeholderTextColor={colors.text.muted}
              style={[styles.notesInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: colors.surface.page }]}
            />
          ) : (
            <Typography variant="body" color={trip.notes ? colors.text.primary : colors.text.muted} style={styles.notesBody}>
              {trip.notes || (language === 'en' ? 'No notes yet. Use the button below to add a detail from this journey.' : 'Belum ada catatan. Gunakan tombol di bawah untuk menambahkan cerita perjalanan ini.')}
            </Typography>
          )}
        </View>

        <Pressable
          onPress={isEditing ? saveEdits : () => { setNotesDraft(trip.notes ?? ''); setIsEditing(true); }}
          style={({ pressed }) => [styles.bottomEditButton, pressed && !isSaving ? styles.bottomEditButtonPressed : null]}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? (language === 'en' ? 'Save album changes' : 'Simpan perubahan album') : (language === 'en' ? 'Edit album' : 'Edit album')}
        >
          {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
            <Ionicons name={isEditing ? 'checkmark-circle-outline' : 'create-outline'} size={21} color="#FFFFFF" />
          )}
          <Typography variant="label" color="#FFFFFF" style={styles.bottomEditButtonText}>
            {isSaving ? (language === 'en' ? 'Saving…' : 'Menyimpan…') : isEditing ? (language === 'en' ? 'Save changes' : 'Simpan perubahan') : (language === 'en' ? 'Edit album' : 'Edit album')}
          </Typography>
        </Pressable>

        <View style={styles.closingNote}>
          <Ionicons name="heart" size={15} color={colors.brand.coral} />
          <Typography variant="caption" color={colors.text.muted} style={styles.closingText}>
            {language === 'en' ? 'Some places stay with us long after we leave.' : 'Ada tempat yang tetap tinggal di hati setelah kita pulang.'}
          </Typography>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  backFallback: { marginTop: spacing[3], padding: spacing[2] },
  scrollContent: { paddingBottom: spacing[8] },
  hero: { height: 300, overflow: 'hidden', justifyContent: 'space-between', backgroundColor: '#17345E' },
  heroFallback: { backgroundColor: '#17345E' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5, 18, 44, 0.40)' },
  heroPhotoAction: {
    position: 'absolute', top: spacing[3], right: spacing[4], minHeight: 40,
    paddingHorizontal: spacing[3], borderRadius: radius.full, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(12, 31, 60, 0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)',
  },
  heroPhotoActionText: { fontWeight: '800' },
  bottomEditButton: {
    minHeight: 56, marginHorizontal: spacing[4], marginTop: spacing[4], paddingHorizontal: spacing[4],
    borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2],
    backgroundColor: '#F56B5F', borderWidth: 1, borderColor: '#F56B5F',
    shadowColor: '#071B4D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 4,
  },
  bottomEditButtonPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  bottomEditButtonText: { fontSize: 16, fontWeight: '800' },
  heroCopy: { paddingHorizontal: spacing[5], paddingBottom: spacing[5] },
  heroTitle: { fontSize: 28, fontWeight: '800', marginTop: spacing[2], marginBottom: 5 },
  heroDestination: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroDestinationText: { fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[4], marginTop: -18, marginBottom: spacing[4] },
  metaCard: {
    flex: 1, minHeight: 60, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing[2],
    paddingVertical: spacing[2], flexDirection: 'row', alignItems: 'center', gap: spacing[2],
  },
  metaCopy: { flex: 1 },
  missingNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginHorizontal: spacing[4],
    marginBottom: spacing[4], padding: spacing[3], borderRadius: radius.lg,
    backgroundColor: '#FFF4E5', borderWidth: 1, borderColor: '#F8D9A8',
  },
  missingNoteCopy: { flex: 1 },
  missingNoteText: { marginTop: 2, lineHeight: 18 },
  missingItemName: { marginTop: 4, fontWeight: '700' },
  storyHeading: {
    marginHorizontal: spacing[4], marginBottom: spacing[3], flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  emptyStory: { marginHorizontal: spacing[4], alignItems: 'center', padding: spacing[5] },
  emptyStoryText: { textAlign: 'center', lineHeight: 22, marginTop: spacing[3] },
  timeline: { paddingHorizontal: spacing[4] },
  timelineEntry: { flexDirection: 'row', alignItems: 'stretch' },
  timelineRail: { width: 36, alignItems: 'center' },
  timelineDot: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineLine: { width: 2, flex: 1, minHeight: 22, marginTop: -1 },
  timelineContent: { flex: 1, paddingBottom: spacing[3] },
  destinationCard: { padding: spacing[3] },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  destinationTitle: { marginTop: spacing[1], marginBottom: 2 },
  locationLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing[2] },
  destinationImage: { width: '100%', height: 125, borderRadius: radius.md, marginTop: spacing[2] },
  memoryCard: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1 },
  memoryImage: { width: '100%', height: 230, backgroundColor: '#E2E8F0' },
  memoryCaption: { padding: spacing[3] },
  memoryMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  memoryLocation: { flexShrink: 1 },
  notesCard: { marginHorizontal: spacing[4], marginTop: spacing[2], padding: spacing[4], borderWidth: 1, borderRadius: radius.lg },
  notesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] },
  notesTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  notesTitle: { marginBottom: 0 },
  notesBody: { lineHeight: 22 },
  notesInput: { minHeight: 112, padding: spacing[3], borderWidth: 1, borderRadius: radius.md, lineHeight: 21 },
  closingNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing[3], paddingHorizontal: spacing[5] },
  closingText: { marginLeft: 6, fontStyle: 'italic' },
});
