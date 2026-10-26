import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors, radius } from '@/core/theme';
import { Typography } from '@/components/ui';
import { useI18n } from '@/core/i18n';

export function CreateTypeTabs({ active }: { active: 'trip' | 'agenda' }) {
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useI18n();
  const options = [
    { key: 'trip' as const, label: t.planning.trip, path: '/trip/new' },
    { key: 'agenda' as const, label: t.planning.agenda, path: '/agenda/new' },
  ];
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface.muted }]}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === option.key }}
          onPress={() => { if (active !== option.key) router.replace(option.path as any); }}
          style={[styles.tab, active === option.key && { backgroundColor: colors.brand.navy }]}
        >
          <Typography variant="label" color={active === option.key ? '#FFFFFF' : colors.text.secondary}>
            {option.label}
          </Typography>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 3, borderRadius: radius.full, marginBottom: 18 },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
});
