import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/core/theme';
import { useI18n } from '@/core/i18n';

export type VisitItemState = 'used' | 'packed' | 'missing';
export type FinalItemState = 'returned' | 'missing';

export function ItemStatusPicker({ value, finalCheck = false, disabled, itemName, onSelect }: {
  value: string | null;
  finalCheck?: boolean;
  disabled?: boolean;
  itemName: string;
  onSelect: (state: VisitItemState | FinalItemState) => void;
}) {
  const colors = useThemeColors();
  const { language } = useI18n();
  const choices: { state: VisitItemState | FinalItemState; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }[] = finalCheck ? [
    { state: 'returned', label: language === 'en' ? 'Returned' : 'Dibawa pulang', icon: 'home-outline', color: colors.status.success },
    { state: 'missing', label: language === 'en' ? 'Missing' : 'Hilang', icon: 'alert-circle-outline', color: colors.status.error },
  ] : [
    { state: 'used', label: language === 'en' ? 'Used' : 'Digunakan', icon: 'hand-left-outline', color: colors.status.success },
    { state: 'packed', label: language === 'en' ? 'In bag' : 'Dalam tas', icon: 'bag-handle-outline', color: colors.brand.blue },
    { state: 'missing', label: language === 'en' ? 'Missing' : 'Hilang', icon: 'alert-circle-outline', color: colors.status.error },
  ];
  return <View style={styles.choices}>
    {choices.map((choice) => <Pressable key={choice.state} accessibilityRole="radio" accessibilityState={{ selected: value === choice.state, disabled }} accessibilityLabel={`${itemName}: ${choice.label}`} disabled={disabled} onPress={() => onSelect(choice.state)} style={[styles.choice, { borderColor: value === choice.state ? choice.color : colors.border.default, backgroundColor: value === choice.state ? `${choice.color}12` : colors.surface.card, opacity: disabled ? 0.5 : 1 }]}>
      <Ionicons name={choice.icon} size={15} color={value === choice.state ? choice.color : colors.text.muted} />
      <Typography variant="caption" color={value === choice.state ? choice.color : colors.text.secondary} style={styles.label}>{choice.label}</Typography>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', gap: 6, marginTop: 7 },
  choice: { flex: 1, minHeight: 40, paddingHorizontal: 4, borderWidth: 1, borderRadius: 10, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, lineHeight: 14, fontWeight: '600', flexShrink: 1 },
});
