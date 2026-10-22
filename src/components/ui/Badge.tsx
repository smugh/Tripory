import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, spacing } from '@/core/theme';
import { Typography } from './Typography';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'accent';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  dot?: boolean;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  style,
  dot = false,
  size = 'md',
}) => {
  const getBadgeColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: colors.brand.navy, text: '#FFFFFF', dotColor: colors.brand.coral };
      case 'accent':
        return { bg: '#FFE4E1', text: colors.brand.coral, dotColor: colors.brand.coral };
      case 'success':
        return { bg: colors.status.successLight, text: '#15803D', dotColor: colors.status.success };
      case 'warning':
        return { bg: colors.status.warningLight, text: '#B45309', dotColor: colors.status.warning };
      case 'error':
        return { bg: colors.status.errorLight, text: '#B91C1C', dotColor: colors.status.error };
      case 'info':
        return { bg: colors.status.infoLight, text: colors.brand.blue, dotColor: colors.brand.blue };
      case 'neutral':
      default:
        return { bg: colors.surface.muted, text: colors.text.secondary, dotColor: colors.text.muted };
    }
  };

  const { bg, text, dotColor } = getBadgeColors();

  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sizeSm : styles.sizeMd,
        { backgroundColor: bg },
        style,
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <Typography
        variant="label"
        color={text}
        style={[styles.text, size === 'sm' && styles.textSm]}
      >
        {label}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeMd: {
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
  },
  sizeSm: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 10,
    lineHeight: 14,
  },
});
