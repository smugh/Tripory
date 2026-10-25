import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, useThemeColors } from '@/core/theme';
import { KeyboardMirrorBar } from './KeyboardMirrorBar';

export interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  withPadding?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  withPadding = true,
  edges = ['top', 'left', 'right'],
  keyboardAvoiding = true,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 0 : 0,
}) => {
  const colors = useThemeColors();
  const [androidKeyboardPad, setAndroidKeyboardPad] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setAndroidKeyboardPad(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardPad(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const content = (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface.page },
        Platform.OS === 'android' && keyboardAvoiding && { paddingBottom: androidKeyboardPad },
        withPadding && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface.page }]}
      edges={edges}
    >
      {keyboardAvoiding ? (
        Platform.OS === 'ios' ? (
          <KeyboardAvoidingView
            style={styles.keyboardAvoid}
            behavior="padding"
            keyboardVerticalOffset={keyboardVerticalOffset}
          >
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )
      ) : (
        content
      )}
      <KeyboardMirrorBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 768,
  },
  padded: {
    paddingHorizontal: spacing[4],
  },
});
