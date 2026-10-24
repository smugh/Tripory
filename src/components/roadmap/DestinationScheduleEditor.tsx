import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, DatePickerModal, Typography } from '@/components/ui';
import { useThemeColors } from '@/core/theme';
import { formatDestinationDate, isValidDestinationTime } from '@/core/utils/destination-schedule';

interface Props {
  visible: boolean;
  date: string;
  time: string;
  language: 'en' | 'id';
  onSave: (date: string, time: string) => Promise<void>;
  onClose: () => void;
}

export function DestinationScheduleEditor({ visible, date, time, language, onSave, onClose }: Props) {
  const colors = useThemeColors();
  const [draftDate, setDraftDate] = useState(date);
  const [draftTime, setDraftTime] = useState(time);
  const [pickingDate, setPickingDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const text = (en: string, id: string) => language === 'en' ? en : id;
  useEffect(() => {
    if (visible) { setDraftDate(date); setDraftTime(time || '09:00'); setPickingDate(false); }
  }, [visible, date, time]);
  const save = async () => {
    if (!draftDate || !isValidDestinationTime(draftTime.trim())) {
      Alert.alert(text('Check schedule', 'Periksa jadwal'), text('Choose a date and enter a time from 00:00 to 23:59.', 'Pilih tanggal dan isi jam antara 00:00 hingga 23:59.'));
      return;
    }
    setSaving(true);
    try { await onSave(draftDate, draftTime.trim()); onClose(); }
    catch { Alert.alert(text('Could not save schedule', 'Jadwal gagal disimpan'), text('Please try again.', 'Silakan coba lagi.')); }
    finally { setSaving(false); }
  };
  return <>
    <Modal visible={visible && !pickingDate} transparent animationType="fade" onRequestClose={() => { if (!saving) onClose(); }}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface.card }]}>
          <Typography variant="h3">{text('Destination schedule', 'Jadwal destinasi')}</Typography>
          <Typography variant="label" style={styles.label}>{text('Date', 'Tanggal')}</Typography>
          <Pressable accessibilityRole="button" accessibilityLabel={text('Change destination date', 'Ubah tanggal destinasi')} onPress={() => setPickingDate(true)} disabled={saving} style={[styles.field, styles.dateField, { borderColor: colors.border.default }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.brand.blue} />
            <Typography>{formatDestinationDate(draftDate, language, true) || text('Choose date', 'Pilih tanggal')}</Typography>
            <Ionicons name="chevron-down" size={16} color={colors.text.muted} />
          </Pressable>
          <Typography variant="label" style={styles.label}>{text('Time (24-hour)', 'Jam (24 jam)')}</Typography>
          <TextInput accessibilityLabel={text('Destination time', 'Jam destinasi')} value={draftTime} onChangeText={setDraftTime} placeholder="HH:mm" maxLength={5} keyboardType="numbers-and-punctuation" editable={!saving} style={[styles.field, { color: colors.text.primary, borderColor: colors.border.default }]} />
          <Button label={saving ? text('Saving…', 'Menyimpan…') : text('Save schedule', 'Simpan jadwal')} onPress={save} disabled={saving} style={styles.save} />
          <Button label={text('Cancel', 'Batal')} variant="secondary" onPress={onClose} disabled={saving} />
        </View>
      </View>
    </Modal>
    <DatePickerModal visible={visible && pickingDate} value={draftDate} title={text('Destination date', 'Tanggal destinasi')} language={language} onClose={() => setPickingDate(false)} onConfirm={(value) => { setDraftDate(value); setPickingDate(false); }} />
  </>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 24 },
  card: { padding: 20, borderRadius: 20, width: '100%', maxWidth: 440, alignSelf: 'center' },
  label: { marginTop: 18, marginBottom: 8 },
  field: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 48, fontSize: 15 },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  save: { marginTop: 24, marginBottom: 10 },
});
