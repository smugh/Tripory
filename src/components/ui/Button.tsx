import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { colors, radius, spacing } from '@/core/theme';
import { Typography } from './Typography';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  style,
  accessibilityLabel,
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    let backgroundColor: string = colors.brand.navy;
    let borderColor: string = 'transparent';
    let borderWidth = 0;

    switch (variant) {
      case 'primary':
        backgroundColor = pressed ? colors.brand.deep : colors.brand.navy;
        break;
      case 'accent':
        backgroundColor = pressed ? '#E0584D' : colors.brand.coral;
        break;
      case 'secondary':
        backgroundColor = pressed ? colors.surface.muted : colors.surface.card;
        borderColor = colors.border.default;
        borderWidth = 1;
        break;
      case 'ghost':
        backgroundColor = pressed ? colors.surface.muted : 'transparent';
        break;
      case 'destructive':
        backgroundColor = pressed ? '#DC2626' : colors.status.error;
        break;
    }

    if (disabled) {
      backgroundColor = colors.border.default;
      borderColor = 'transparent';
    }

    const minHeight = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;

    return {
      backgroundColor,
      borderColor: isFocused ? colors.brand.blue : borderColor,
      borderWidth: isFocused ? 2 : borderWidth,
      minHeight,
      minWidth: 44, // Target sentuh minimal 44px
      borderRadius: radius.md,
      paddingHorizontal: size === 'sm' ? spacing[3] : spacing[4],
      paddingVertical: spacing[2],
      opacity: disabled ? 0.6 : 1,
      transform: pressed && !disabled ? [{ scale: 0.98 }] : [{ scale: 1 }],
    };
  };

  const getTextColor = (): string => {
    if (disabled) return colors.text.muted;
    switch (variant) {
      case 'primary':
      case 'accent':
      case 'destructive':
        return colors.text.inverse;
      case 'secondary':
      case 'ghost':
        return colors.brand.navy;
      default:
        return colors.text.inverse;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: disabled || isLoading, busy: isLoading }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={({ pressed }) => [
        styles.base,
        getContainerStyle(pressed),
        style,
      ]}
      testID={testID}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Typography
          variant={size === 'sm' ? 'label' : 'body'}
          color={getTextColor()}
          style={styles.label}
        >
          {label}
        </Typography>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      } as ViewStyle,
    }),
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
