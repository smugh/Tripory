import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { typography, fontFamily, useThemeColors } from '@/core/theme';

export interface ThemedTextProps extends TextProps {
  variant?: 'display' | 'h1' | 'h2' | 'h3' | 'bodyLarge' | 'body' | 'caption' | 'label';
  color?: string;
}

export const Typography: React.FC<ThemedTextProps> = ({
  variant = 'body',
  color,
  style,
  children,
  ...props
}) => {
  const themeColors = useThemeColors();
  const textColor = color || themeColors.text.primary;

  const variantStyle = typography[variant] || typography.body;
  const weight = variantStyle.fontWeight;
  const chosenFont =
    weight === '700'
      ? fontFamily.bold
      : weight === '600'
      ? fontFamily.semiBold
      : weight === '500'
      ? fontFamily.medium
      : fontFamily.regular;

  return (
    <RNText
      style={[
        styles.base,
        variantStyle,
        { color: textColor, fontFamily: chosenFont },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
