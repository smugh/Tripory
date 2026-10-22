import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, radius, spacing } from '@/core/theme';
import { Typography } from './Typography';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Typography variant="label" color={colors.text.secondary} style={styles.label}>
          {label}
        </Typography>
      ) : null}

      <TextInput
        placeholderTextColor={colors.text.muted}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          {
            borderColor: error
              ? colors.status.error
              : isFocused
              ? colors.brand.blue
              : colors.border.default,
            borderWidth: isFocused ? 1.5 : 1,
          },
          style,
        ]}
        {...props}
      />

      {error ? (
        <Typography variant="caption" color={colors.status.error} style={styles.errorText}>
          {error}
        </Typography>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[3],
  },
  label: {
    marginBottom: spacing[1],
  },
  input: {
    minHeight: 44, // Target sentuh minimal 44px
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    fontSize: 14,
    color: colors.text.primary,
  },
  errorText: {
    marginTop: spacing[1],
  },
});
