import React, { useState, forwardRef, useId, useEffect, useRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { radius, spacing, useThemeColors } from '@/core/theme';
import { Typography } from './Typography';
import { useActiveInputStore } from '@/stores/active-input-store';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<React.ComponentRef<typeof TextInput>, InputProps>(({
  label,
  error,
  containerStyle,
  style,
  onFocus,
  onBlur,
  onChangeText,
  value,
  placeholder,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const colors = useThemeColors();
  const inputId = useId();
  const internalInputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  useImperativeHandle(ref, () => internalInputRef.current as any);

  const setActiveInput = useActiveInputStore((s) => s.setActiveInput);
  const updateActiveInputValue = useActiveInputStore((s) => s.updateActiveInputValue);
  const clearActiveInput = useActiveInputStore((s) => s.clearActiveInput);
  const scrollInputIntoView = useActiveInputStore((s) => s.scrollInputIntoView);

  useEffect(() => {
    if (isFocused && typeof value === 'string') {
      updateActiveInputValue(inputId, value);
    }
  }, [value, isFocused, inputId, updateActiveInputValue]);

  useEffect(() => {
    return () => {
      clearActiveInput(inputId);
    };
  }, [inputId, clearActiveInput]);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Typography variant="label" color={colors.text.secondary} style={styles.label}>
          {label}
        </Typography>
      ) : null}

      <TextInput
        ref={internalInputRef}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        onChangeText={(text) => {
          updateActiveInputValue(inputId, text);
          onChangeText?.(text);
        }}
        onFocus={(e) => {
          setIsFocused(true);
          setActiveInput({
            id: inputId,
            label,
            placeholder,
            value: typeof value === 'string' ? value : '',
            onChangeText,
            nativeRef: internalInputRef,
          });
          scrollInputIntoView(internalInputRef);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          clearActiveInput(inputId);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface.card,
            color: colors.text.primary,
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
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[3],
  },
  label: {
    marginBottom: spacing[1],
  },
  input: {
    minHeight: 44, // Target sentuh minimal 44px
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    fontSize: 14,
  },
  errorText: {
    marginTop: spacing[1],
  },
});
