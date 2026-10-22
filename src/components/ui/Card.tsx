import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle, StyleProp } from 'react-native';
import { radius, spacing, elevation, useThemeColors } from '@/core/theme';
import { useUIStore } from '@/stores/ui-store';

export interface CardProps extends ViewProps {
  elevated?: boolean;
  variant?: 'default' | 'elevated' | 'navy' | 'accent' | 'muted';
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  variant = 'default',
  style,
  ...props
}) => {
  const colors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'navy':
        return {
          backgroundColor: isDarkMode ? '#0A1C40' : '#0E234D',
          borderColor: isDarkMode ? '#1A3568' : '#1A3772',
        };
      case 'accent':
        return {
          backgroundColor: isDarkMode ? '#271418' : '#FFF7F6',
          borderColor: isDarkMode ? '#481E24' : '#FCDAD7',
        };
      case 'muted':
        return {
          backgroundColor: colors.surface.muted,
          borderColor: colors.border.muted,
        };
      case 'elevated':
        return {
          backgroundColor: colors.surface.card,
          borderColor: colors.border.default,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.surface.card,
          borderColor: colors.border.default,
        };
    }
  };

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.surface.card,
          borderColor: colors.border.default,
        },
        getVariantStyle(),
        (elevated || variant === 'elevated' || variant === 'navy') ? elevation[2] : elevation[1],
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing[4],
  },
});
