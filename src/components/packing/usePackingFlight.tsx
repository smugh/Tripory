import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemBounds } from './PackingItemRow';

function measure(view: React.ComponentRef<typeof View> | null): Promise<ItemBounds | null> {
  return new Promise((resolve) => {
    if (!view) return resolve(null);
    const timeout = setTimeout(() => resolve(null), 160);
    view.measureInWindow((x, y, width, height) => {
      clearTimeout(timeout);
      resolve(width > 0 ? { x, y, width, height } : null);
    });
  });
}

export function usePackingFlight(revealBag: () => void) {
  const bagRef = useRef<React.ComponentRef<typeof View>>(null);
  const overlayRef = useRef<React.ComponentRef<typeof View>>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const bagScale = useRef(new Animated.Value(1)).current;
  const mounted = useRef(true);
  const [flight, setFlight] = useState<{ imageUri?: string | null; start: ItemBounds; end: ItemBounds; origin: ItemBounds } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; progress.stopAnimation(); bagScale.stopAnimation(); };
  }, [progress, bagScale]);

  async function flyToBag(start?: ItemBounds, imageUri?: string | null) {
    if (!start || await AccessibilityInfo.isReduceMotionEnabled()) return;
    const origin = await measure(overlayRef.current);
    let end = await measure(bagRef.current);
    if (!origin) return;
    if (!end || end.y < origin.y || end.y + end.height > origin.y + origin.height) {
      revealBag();
      await new Promise((resolve) => setTimeout(resolve, 420));
      end = await measure(bagRef.current);
    }
    if (!end || !mounted.current) return;
    progress.setValue(0);
    setFlight({ start, end, imageUri, origin });
    await new Promise<void>((resolve) => {
      Animated.timing(progress, { toValue: 1, duration: 680, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => resolve());
    });
    if (!mounted.current) return;
    setFlight(null);
    Animated.sequence([
      Animated.timing(bagScale, { toValue: 1.07, duration: 110, useNativeDriver: true }),
      Animated.spring(bagScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }

  const dx = flight ? flight.end.x + flight.end.width / 2 - flight.start.x - 24 : 0;
  const dy = flight ? flight.end.y + flight.end.height / 2 - flight.start.y - 24 : 0;
  const overlay = (
    <View ref={overlayRef} collapsable={false} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flight && <Animated.View style={[styles.flyingItem, {
        left: flight.start.x - flight.origin.x, top: flight.start.y - flight.origin.y,
        opacity: progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateX: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dx / 2 + 32, dx] }) },
          { translateY: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dy / 2 - 55, dy] }) },
          { scale: progress.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0.9, 0.15] }) },
          { rotate: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: ['0deg', '-12deg', '0deg'] }) },
        ],
      }]}>
        {flight.imageUri ? <Image source={{ uri: flight.imageUri }} style={styles.image} />
          : <Ionicons name="cube" size={28} color="#1769B0" />}
      </Animated.View>}
    </View>
  );
  return { bagRef, bagScale, flyToBag, overlay };
}

const styles = StyleSheet.create({
  flyingItem: { position: 'absolute', width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', elevation: 12, shadowColor: '#071B4D', shadowOpacity: 0.22, shadowRadius: 8 },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
});
