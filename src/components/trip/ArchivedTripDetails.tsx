import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, ScreenContainer, Typography } from '@/components/ui';
import { useThemeColors, spacing } from '@/core/theme';
import { useI18n } from '@/core/i18n';
import { archiveRepository, TripArchive } from '@/db/repositories/archive.repository';
import { tripRepository } from '@/db/repositories/trip.repository';
import { formatDateRange, formatTripDurationLabel } from '@/core/utils';
import { getDestinationDate, formatDestinationDate } from '@/core/utils/destination-schedule';

export function ArchivedTripDetails({ tripId }: { tripId: string }) {
  const colors = useThemeColors();
  const { language } = useI18n();
  const router = useRouter();
  const [archive, setArchive] = useState<TripArchive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const text = (en: string, id: string) => language === 'en' ? en : id;
  useEffect(() => {
    let mounted = true;
    archiveRepository.getCompleted(tripId).then((value) => { if (mounted) setArchive(value); })
      .catch(() => { if (mounted) setError(true); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [tripId]);
  const section = (label: string) => <Typography variant="h3" color={colors.brand.navy} style={styles.heading}>{label}</Typography>;
  const copy = (value: string) => <Typography variant="body" color={colors.text.secondary} style={styles.copy}>{value}</Typography>;
  if (loading) return <ScreenContainer><ActivityIndicator color={colors.brand.blue} /></ScreenContainer>;
  if (error || !archive) return <ScreenContainer>{copy(text('Could not load this trip archive.', 'Arsip perjalanan belum bisa dibuka.'))}<Button label={text('Back', 'Kembali')} onPress={() => router.back()} /></ScreenContainer>;
  const { trip, destinations, items, usages, moments } = archive;
  const itemState = (state: string) => ({
    planned: text('Not packed', 'Belum dipacking'), packed: text('Packed', 'Dalam tas'),
    available: text('Available', 'Tersedia'), used: text('Used', 'Terpakai'),
    returned: text('Returned', 'Dibawa pulang'), missing: text('Not returned', 'Belum kembali'),
  }[state] ?? state);
  const priority = (value: string) => ({ must_have: text('Essential', 'Wajib dibawa'), conditional: text('As needed', 'Sesuai kebutuhan'), optional: text('Optional item', 'Barang opsional') }[value] ?? value);
  const dateTime = (value: string) => new Date(value).toLocaleString(language === 'en' ? 'en-GB' : 'id-ID');
  const deleteTrip = () => Alert.alert(text('Delete trip and album?', 'Hapus perjalanan dan album?'), text('This removes the entire trip, its plans, items and memories.', 'Seluruh perjalanan, rencana, barang, dan kenangannya akan dihapus.'), [
    { text: text('Cancel', 'Batal'), style: 'cancel' },
    { text: text('Delete', 'Hapus'), style: 'destructive', onPress: async () => {
      try { await tripRepository.delete(tripId); router.replace('/(tabs)'); }
      catch { Alert.alert(text('Error', 'Gagal'), text('Could not delete this trip.', 'Perjalanan belum bisa dihapus.')); }
    } },
  ]);
  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <View style={styles.row}><Ionicons name="lock-closed-outline" size={17} color={colors.text.muted} /><Badge label={text('Completed · Read only', 'Selesai · Hanya baca')} variant="neutral" size="sm" /></View>
          <Typography variant="h2" color={colors.brand.navy} style={styles.heading}>{trip.name}</Typography>
          {copy(trip.destination)}
          {copy(formatDateRange(trip.startDate, trip.endDate, language))}
          {copy(formatTripDurationLabel(trip.startDate, trip.endDate, language))}
          {copy(text(`Closed: ${dateTime(archive.closedAt)}`, `Ditutup: ${dateTime(archive.closedAt)}`))}
          {copy(text('Your original trip plans and recorded activities are preserved here.', 'Rencana perjalanan dan aktivitas yang tercatat tersimpan di sini.'))}
          <Button label={text('View memory album', 'Lihat album kenangan')} variant="secondary" onPress={() => router.push(`/memories/${tripId}`)} style={styles.button} />
        </Card>
        {section(text('Trip notes', 'Catatan perjalanan'))}
        <Card style={styles.card}>{copy(trip.notes || text('No trip notes were saved.', 'Tidak ada catatan perjalanan yang disimpan.'))}</Card>
        {section(text(`Itinerary & activities (${destinations.length})`, `Rencana & aktivitas (${destinations.length})`))}
        {destinations.length === 0 && copy(text('No stops were recorded.', 'Tidak ada destinasi yang dicatat.'))}
        {[...destinations].sort((a, b) => a.orderIndex - b.orderIndex).map((stop, index) => {
          let todos: { id?: string; text: string; completed: boolean }[] = [];
          try { const parsed = JSON.parse(stop.todos || '[]'); if (Array.isArray(parsed)) todos = parsed.filter((entry) => typeof entry?.text === 'string'); } catch { /* Legacy invalid notes do not hide the rest of the archive. */ }
          const plannedItems = items.filter((item) => item.plannedDestinationId === stop.id);
          const actualUsages = usages.filter((usage) => usage.destinationId === stop.id);
          return <Card key={stop.id} style={styles.card}>
            <View style={styles.row}><Badge label={`#${index + 1}${stop.plannedTime ? ` · ${stop.plannedTime}` : ''}`} variant="primary" size="sm" /><Badge label={stop.isVisited ? text('Visited', 'Dikunjungi') : text('Planned', 'Direncanakan')} variant={stop.isVisited ? 'success' : 'neutral'} size="sm" /></View>
            <Typography variant="caption" color={colors.text.secondary}>{formatDestinationDate(getDestinationDate(stop, trip.startDate), language, true)}</Typography>
            <Typography variant="h3" color={colors.brand.navy} style={styles.heading}>{stop.name}</Typography>
            {stop.imageUri && <Image source={{ uri: stop.imageUri }} style={styles.photo} />}
            {stop.activity && copy(`${text('Planned activity', 'Rencana aktivitas')}: ${stop.activity}`)}
            {stop.locationLabel && copy(`${text('Location', 'Lokasi')}: ${stop.locationLabel}`)}
            {stop.latitude != null && stop.longitude != null && copy(`${stop.latitude}, ${stop.longitude}`)}
            {stop.notes && copy(`${text('Notes', 'Catatan')}: ${stop.notes}`)}
            {todos.map((todo, index) => <View key={todo.id ?? index} style={styles.row}><Ionicons name={todo.completed ? 'checkmark-circle-outline' : 'ellipse-outline'} size={16} color={todo.completed ? colors.status.success : colors.text.muted} /><View style={{ flex: 1 }}>{copy(`${todo.text} · ${todo.completed ? text('Done', 'Selesai') : text('Not recorded as done', 'Belum tercatat selesai')}`)}</View></View>)}
            {plannedItems.length > 0 && copy(`${text('Planned items', 'Rencana barang')}: ${plannedItems.map((item) => `${item.customName} ×${item.quantity}`).join(', ')}`)}
            {actualUsages.length > 0 && <View style={styles.inset}>{copy(text('Recorded item use:', 'Pemakaian barang yang tercatat:'))}{actualUsages.map((usage) => <View key={usage.id}>{copy(`${items.find((item) => item.id === usage.tripItemId)?.customName ?? text('Item', 'Barang')} · ${dateTime(usage.usedAt)}${usage.notes ? ` · ${usage.notes}` : ''}`)}</View>)}</View>}
          </Card>;
        })}
        {section(text(`Packing list (${items.length})`, `Barang bawaan (${items.length})`))}
        {copy(text('Includes all items, with or without a destination link.', 'Termasuk semua barang, dengan atau tanpa hubungan destinasi.'))}
        {items.length === 0 && copy(text('No items were recorded.', 'Tidak ada barang yang dicatat.'))}
        {items.map((item) => <Card key={item.id} style={styles.card}>
          <View style={styles.row}>
            {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />}
            <View style={{ flex: 1 }}><Typography variant="label" color={colors.brand.navy}>{item.customName} ×{item.quantity}</Typography>{copy(`${item.category} · ${priority(item.priority)}`)}</View>
            <Badge label={itemState(item.state)} variant={item.state === 'missing' ? 'warning' : 'neutral'} size="sm" />
          </View>
          {copy(`${text('Planned for', 'Rencana pemakaian')}: ${destinations.find((stop) => stop.id === item.plannedDestinationId)?.name ?? text('General trip use', 'Bawaan umum perjalanan')}`)}
          {item.notes && copy(item.notes)}
          {(archive.events ?? []).filter((event) => event.tripItemId === item.id).map((event) => <View key={event.id} style={styles.inset}>{copy(`${dateTime(event.occurredAt)} · ${itemState(event.state)}${event.destinationId ? ` · ${destinations.find((stop) => stop.id === event.destinationId)?.name ?? ''}` : ''}`)}</View>)}
        </Card>)}
        {section(text('Lost & missing items', 'Barang hilang & belum kembali'))}
        {items.filter((item) => item.state === 'missing' || archive.events?.some((event) => event.tripItemId === item.id && event.state === 'missing')).map((item) => <Card key={item.id} style={styles.card}>{copy(`${item.customName} ×${item.quantity} · ${item.state === 'missing' ? text('Not returned', 'Belum kembali') : text('Found again', 'Ditemukan kembali')}`)}</Card>)}
        {!items.some((item) => item.state === 'missing' || archive.events?.some((event) => event.tripItemId === item.id && event.state === 'missing')) && copy(text('No losses were recorded.', 'Tidak ada kehilangan yang dicatat.'))}
        {section(text('Return check', 'Pengecekan barang pulang'))}
        <Card style={styles.card}>{copy(text(`${items.filter((item) => item.state === 'returned').length} returned · ${items.filter((item) => item.state === 'missing').length} not returned`, `${items.filter((item) => item.state === 'returned').length} dibawa pulang · ${items.filter((item) => item.state === 'missing').length} belum kembali`))}</Card>
        {items.some((item) => item.state !== 'returned' && item.state !== 'missing') && copy(text('Final return checks were not recorded for some items in this older trip.', 'Pengecekan akhir beberapa barang belum tercatat pada trip lama ini.'))}
        {section(text(`Moments & photos (${moments.length})`, `Momen & foto (${moments.length})`))}
        {moments.length === 0 && copy(text('No moments were recorded.', 'Tidak ada momen yang dicatat.'))}
        {moments.map((moment) => <Card key={moment.id} style={styles.card}>
          {moment.photoPath && !moment.photoPath.startsWith('local://') && <Image source={{ uri: moment.photoPath }} style={styles.photo} />}
          {moment.caption && copy(moment.caption)}
          {copy(dateTime(moment.capturedAt))}
          {moment.locationName && copy(moment.locationName)}
          {moment.latitude != null && moment.longitude != null && copy(`${moment.latitude}, ${moment.longitude}`)}
          {moment.destinationId && copy(destinations.find((stop) => stop.id === moment.destinationId)?.name ?? '')}
        </Card>)}
        <Button label={text('Delete trip and album', 'Hapus perjalanan dan album')} variant="destructive" onPress={deleteTrip} style={styles.button} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing[3], paddingBottom: spacing[6] },
  card: { marginBottom: spacing[3], padding: spacing[3] },
  heading: { marginTop: spacing[2], marginBottom: spacing[2] },
  copy: { fontSize: 13, lineHeight: 19, marginBottom: 5 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  photo: { width: '100%', height: 180, resizeMode: 'cover', borderRadius: 12, marginBottom: 8 },
  thumbnail: { width: 44, height: 44, borderRadius: 9 },
  button: { marginTop: spacing[2] },
  inset: { marginTop: 6, paddingLeft: 8 },
});
