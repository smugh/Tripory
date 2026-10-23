import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, useThemeColors } from '@/core/theme';
import { Typography } from './Typography';
import { Button } from './Button';

export interface DatePickerModalProps {
  visible: boolean;
  value: string; // YYYY-MM-DD
  title: string;
  minDate?: string; // Optional YYYY-MM-DD
  language?: 'en' | 'id';
  onConfirm: (dateIso: string) => void;
  onClose: () => void;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAY_NAMES_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  value,
  title,
  minDate,
  language = 'en',
  onConfirm,
  onClose,
}) => {
  const themeColors = useThemeColors();

  // Helper formatting 2 digits
  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // Build current date ISO
  const buildDateIso = (year: number, month: number, day: number) => {
    return `${year}-${pad2(month + 1)}-${pad2(day)}`;
  };

  // Parse initial date
  const parseDateSafe = (val: string) => {
    const parts = val.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return { year: y, month: m, day: d };
      }
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  };

  const initial = parseDateSafe(value);
  const [currentYear, setCurrentYear] = useState(initial.year);
  const [currentMonth, setCurrentMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState(initial.day);
  const [manualText, setManualText] = useState(value);

  // Sync state when modal becomes visible
  useEffect(() => {
    if (visible) {
      const parsed = parseDateSafe(value);
      setCurrentYear(parsed.year);
      setCurrentMonth(parsed.month);
      setSelectedDay(parsed.day);
      setManualText(value);
    }
  }, [visible, value]);

  const monthNames = language === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ID;
  const dayNames = language === 'en' ? DAY_NAMES_EN : DAY_NAMES_ID;

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generate days in month & first day of week
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

  // Partition calendar days into explicit 7-day rows to strictly avoid layout overflow
  const weeks = useMemo(() => {
    const list: (number | null)[][] = [];
    let week: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      week.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        list.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      list.push(week);
    }
    return list;
  }, [firstDayOfWeek, daysInMonth]);

  // Handle day selection
  const handleDayPress = (day: number) => {
    setSelectedDay(day);
    const iso = buildDateIso(currentYear, currentMonth, day);
    setManualText(iso);
  };

  // Handle manual typing with live calendar sync
  const handleManualTextChange = (text: string) => {
    setManualText(text);
    const parts = text.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && y >= 1970 && y <= 2100) setCurrentYear(y);
      if (!isNaN(m) && m >= 0 && m <= 11) setCurrentMonth(m);
      if (!isNaN(d) && d >= 1 && d <= 31) setSelectedDay(d);
    }
  };

  const handleApply = () => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (regex.test(manualText.trim())) {
      onConfirm(manualText.trim());
      onClose();
      return;
    }

    const safeDay = Math.min(selectedDay, daysInMonth);
    const iso = buildDateIso(currentYear, currentMonth, safeDay);
    onConfirm(iso);
    onClose();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: themeColors.surface.card }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Typography variant="h3" color={themeColors.brand.navy} style={styles.modalTitle}>
                {title}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted}>
                {language === 'en' ? 'Backdate supported' : 'Mendukung tanggal lampau (backdate)'}
              </Typography>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={24} color={themeColors.text.muted} />
            </Pressable>
          </View>

          {/* Month & Year Selectors (Side-by-side, no -1 Yr buttons) */}
          <View style={styles.selectorsRow}>
            {/* Month Stepper */}
            <View style={[styles.selectorBox, { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default, flex: 1.3 }]}>
              <Pressable style={styles.arrowBtn} onPress={handlePrevMonth} hitSlop={8}>
                <Ionicons name="chevron-back" size={16} color={themeColors.brand.navy} />
              </Pressable>
              <Typography variant="label" color={themeColors.brand.navy} style={styles.selectorLabel} numberOfLines={1}>
                {monthNames[currentMonth]}
              </Typography>
              <Pressable style={styles.arrowBtn} onPress={handleNextMonth} hitSlop={8}>
                <Ionicons name="chevron-forward" size={16} color={themeColors.brand.navy} />
              </Pressable>
            </View>

            {/* Year Stepper */}
            <View style={[styles.selectorBox, { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default, flex: 1 }]}>
              <Pressable style={styles.arrowBtn} onPress={() => setCurrentYear((y) => y - 1)} hitSlop={8}>
                <Ionicons name="chevron-back" size={16} color={themeColors.brand.navy} />
              </Pressable>
              <TextInput
                style={[styles.yearInputText, { color: themeColors.brand.navy }]}
                value={String(currentYear)}
                keyboardType="number-pad"
                maxLength={4}
                onChangeText={(t) => {
                  const parsed = parseInt(t, 10);
                  if (!isNaN(parsed)) setCurrentYear(parsed);
                }}
              />
              <Pressable style={styles.arrowBtn} onPress={() => setCurrentYear((y) => y + 1)} hitSlop={8}>
                <Ionicons name="chevron-forward" size={16} color={themeColors.brand.navy} />
              </Pressable>
            </View>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {dayNames.map((d, idx) => (
              <View key={d + idx} style={styles.dayCol}>
                <Typography
                  variant="caption"
                  color={idx === 0 ? colors.status.error : themeColors.text.muted}
                  style={styles.weekdayText}
                >
                  {d}
                </Typography>
              </View>
            ))}
          </View>

          {/* Calendar Days Matrix (Row by Row) */}
          <View style={styles.calendarBody}>
            {weeks.map((week, wIdx) => (
              <View key={`week-${wIdx}`} style={styles.weekRow}>
                {week.map((day, dIdx) => {
                  if (day === null) {
                    return <View key={`blank-${wIdx}-${dIdx}`} style={styles.dayCol} />;
                  }

                  const isSelected = day === selectedDay;
                  const iso = buildDateIso(currentYear, currentMonth, day);
                  const isDisabled = minDate ? iso < minDate : false;

                  return (
                    <View key={`day-${day}`} style={styles.dayCol}>
                      <Pressable
                        disabled={isDisabled}
                        style={[
                          styles.dayButton,
                          isSelected && { backgroundColor: themeColors.brand.coral },
                          isDisabled && { opacity: 0.25 },
                        ]}
                        onPress={() => handleDayPress(day)}
                      >
                        <Typography
                          variant="caption"
                          color={isSelected ? '#FFFFFF' : isDisabled ? themeColors.text.muted : themeColors.text.primary}
                          style={{ fontWeight: isSelected ? '700' : '500', fontSize: 13 }}
                        >
                          {day}
                        </Typography>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Manual Input Fallback */}
          <View style={[styles.manualInputBox, { borderTopColor: themeColors.border.muted }]}>
            <Typography variant="caption" color={themeColors.text.muted} style={{ marginBottom: 4 }}>
              {language === 'en' ? 'Or edit date (YYYY-MM-DD):' : 'Atau ketik tanggal (YYYY-MM-DD):'}
            </Typography>
            <TextInput
              style={[
                styles.dateTextInput,
                {
                  color: themeColors.text.primary,
                  backgroundColor: themeColors.surface.muted,
                  borderColor: themeColors.border.default,
                },
              ]}
              value={manualText}
              onChangeText={handleManualTextChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={themeColors.text.muted}
            />
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <Button
              label={language === 'en' ? 'Cancel' : 'Batal'}
              variant="secondary"
              size="sm"
              onPress={onClose}
              style={{ flex: 1, marginRight: spacing[2] }}
            />
            <Button
              label={language === 'en' ? 'Apply Date' : 'Gunakan Tanggal'}
              variant="primary"
              size="sm"
              onPress={handleApply}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    padding: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  modalTitle: {
    fontWeight: '700',
  },
  closeBtn: {
    padding: 2,
  },
  selectorsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  selectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  arrowBtn: {
    padding: 4,
  },
  selectorLabel: {
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  yearInputText: {
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    padding: 0,
    minWidth: 44,
  },
  calendarBody: {
    marginBottom: spacing[2],
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  weekdayText: {
    fontWeight: '700',
    fontSize: 11,
  },
  dayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualInputBox: {
    paddingTop: spacing[2],
    marginTop: spacing[2],
    borderTopWidth: 1,
  },
  dateTextInput: {
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing[3],
  },
});
