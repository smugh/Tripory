import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
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
  language = 'id',
  onConfirm,
  onClose,
}) => {
  const themeColors = useThemeColors();

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

  // Quick year stepper
  const handleYearStep = (delta: number) => {
    setCurrentYear((y) => y + delta);
  };

  // Helper formatting 2 digits
  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // Build current date ISO
  const buildDateIso = (year: number, month: number, day: number) => {
    return `${year}-${pad2(month + 1)}-${pad2(day)}`;
  };

  // Generate days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

  // Handle day selection
  const handleDayPress = (day: number) => {
    setSelectedDay(day);
    const iso = buildDateIso(currentYear, currentMonth, day);
    setManualText(iso);
  };

  const handleApply = () => {
    // If manual input is a valid YYYY-MM-DD
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
                {language === 'en' ? 'Backdate selection supported' : 'Mendukung tanggal lampau (backdate)'}
              </Typography>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={24} color={themeColors.text.muted} />
            </Pressable>
          </View>

          {/* Year & Month Stepper */}
          <View style={[styles.stepperContainer, { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default }]}>
            {/* Month row */}
            <View style={styles.navRow}>
              <Pressable style={styles.navBtn} onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={20} color={themeColors.brand.navy} />
              </Pressable>
              <Typography variant="label" color={themeColors.brand.navy} style={styles.monthLabel}>
                {monthNames[currentMonth]} {currentYear}
              </Typography>
              <Pressable style={styles.navBtn} onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={20} color={themeColors.brand.navy} />
              </Pressable>
            </View>

            {/* Quick Year Jump */}
            <View style={styles.yearJumpRow}>
              <Pressable style={styles.yearPill} onPress={() => handleYearStep(-1)}>
                <Typography variant="caption" color={themeColors.text.secondary} style={styles.yearPillText}>
                  -1 {language === 'en' ? 'Yr' : 'Thn'}
                </Typography>
              </Pressable>
              <Pressable style={styles.yearPill} onPress={() => handleYearStep(1)}>
                <Typography variant="caption" color={themeColors.text.secondary} style={styles.yearPillText}>
                  +1 {language === 'en' ? 'Yr' : 'Thn'}
                </Typography>
              </Pressable>
            </View>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekdaysRow}>
            {dayNames.map((d, idx) => (
              <View key={d + idx} style={styles.dayCol}>
                <Typography variant="caption" color={idx === 0 ? colors.status.error : themeColors.text.muted} style={styles.weekdayText}>
                  {d}
                </Typography>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {/* Blank offset days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <View key={`blank-${i}`} style={styles.dayCol} />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
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
                      isDisabled && { opacity: 0.3 },
                    ]}
                    onPress={() => handleDayPress(day)}
                  >
                    <Typography
                      variant="caption"
                      color={isSelected ? '#FFFFFF' : isDisabled ? themeColors.text.muted : themeColors.text.primary}
                      style={{ fontWeight: isSelected ? '700' : '500' }}
                    >
                      {day}
                    </Typography>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Manual Input Fallback */}
          <View style={[styles.manualInputBox, { borderTopColor: themeColors.border.muted }]}>
            <Typography variant="caption" color={themeColors.text.muted} style={{ marginBottom: 4 }}>
              {language === 'en' ? 'Or edit date directly (YYYY-MM-DD):' : 'Atau ketik tanggal (YYYY-MM-DD):'}
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
              onChangeText={setManualText}
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
    maxWidth: 380,
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
  stepperContainer: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    marginBottom: spacing[3],
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    padding: spacing[1],
  },
  monthLabel: {
    fontWeight: '700',
    fontSize: 15,
  },
  yearJumpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  yearPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: radius.full,
  },
  yearPillText: {
    fontWeight: '600',
    fontSize: 11,
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: spacing[2],
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
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing[2],
  },
  dayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualInputBox: {
    paddingTop: spacing[3],
    marginTop: spacing[2],
    borderTopWidth: 1,
  },
  dateTextInput: {
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing[4],
  },
});
