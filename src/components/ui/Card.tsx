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
          backgroundColor: isDarkMode ? '#0A255C' : '#071B4D',
          borderColor: isDarkMode ? '#1E3A8A' : '#0A2B65',
        };
      case 'accent':
        return {
          backgroundColor: isDarkMode ? '#2D1418' : '#FFF5F4',
          borderColor: isDarkMode ? '#501D24' : '#FED7D4',
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
