import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TextInput, Pressable, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useActiveInputStore } from '@/stores/active-input-store';
import { useThemeColors } from '@/core/theme';
import { useUIStore } from '@/stores/ui-store';

export function KeyboardMirrorBar() {
  const activeInput = useActiveInputStore((s) => s.activeInput);
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates.height;
      setKeyboardHeight(h);
      useActiveInputStore.getState().setKeyboardHeight(h);
      // Auto-scroll input into comfortable reading view above virtual keyboard
      useActiveInputStore.getState().scrollInputIntoView();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      useActiveInputStore.getState().setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (!activeInput || keyboardHeight <= 0) {
    return null;
  }

  // On Android edge-to-edge, add offset for system navigation bar & IME accessory header
  const androidBottom = keyboardHeight + Math.max(insets.bottom, 24) + 12;

  return (
    <View
      style={[
        styles.container,
        {
          bottom: Platform.OS === 'android' ? androidBottom : 0,
          backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
          borderColor: isDarkMode ? '#38BDF8' : '#1E6FB3',
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Ionicons name="pencil" size={13} color={colors.brand.blue} />
          <Text style={[styles.labelText, { color: colors.brand.blue }]} numberOfLines={1}>
            {activeInput.label ? `Input: ${activeInput.label}` : 'Sedang mengisi teks'}
          </Text>
        </View>
        <Pressable
          style={[styles.doneButton, { backgroundColor: colors.brand.blue }]}
          onPress={() => Keyboard.dismiss()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          <Text style={styles.doneText}>Selesai</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.mirrorInputBox,
          {
            backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
            borderColor: colors.border.default,
          },
        ]}
      >
        <TextInput
          value={activeInput.value}
          onChangeText={(text) => {
            activeInput.onChangeText?.(text);
          }}
          placeholder={activeInput.placeholder || 'Ketik di sini...'}
          placeholderTextColor={colors.text.muted}
          style={[styles.mirrorInput, { color: colors.text.primary }]}
          autoFocus={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    right: 8,
    zIndex: 99999,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    elevation: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 3,
  },
  mirrorInputBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 38,
    justifyContent: 'center',
  },
  mirrorInput: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
});
