import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radius } from '@/core/theme';
import { Typography } from './Typography';

export interface ProgressBarProps {
  progress: number; // 0 to 1 or 0 to 100
  variant?: 'primary' | 'accent' | 'info' | 'success' | 'warning';
  height?: number;
  showLabel?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  variant = 'accent',
  height = 8,
  showLabel = false,
  label,
  style,
}) => {
  // Normalize progress to 0-100%
  const normalizedProgress = Math.min(
    100,
    Math.max(0, progress <= 1 ? Math.round(progress * 100) : Math.round(progress))
  );

  const getColor = (): string => {
    switch (variant) {
      case 'primary':
        return colors.brand.navy;
      case 'accent':
        return colors.brand.coral;
      case 'info':
        return colors.brand.blue;
      case 'success':
        return colors.status.success;
      case 'warning':
        return colors.status.warning;
      default:
        return colors.brand.coral;
    }
  };

  return (
    <View style={[styles.container, style]}>
      {showLabel ? (
        <View style={styles.labelRow}>
          <Typography variant="caption" color={colors.text.secondary}>
            {label || 'Progress'}
          </Typography>
          <Typography variant="label" color={getColor()}>
            {normalizedProgress}%
          </Typography>
        </View>
      ) : null}
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${normalizedProgress}%`,
              backgroundColor: getColor(),
              height,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  track: {
    width: '100%',
    backgroundColor: colors.surface.muted,
    overflow: 'hidden',
  },
  fill: {
    minWidth: 4,
  },
});
