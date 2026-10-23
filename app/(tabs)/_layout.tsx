import React from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/core/theme';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';
import { Typography } from '@/components/ui';

export default function TabLayout() {
  const router = useRouter();
  const colors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, 10);
  const tabHeight = 62 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand.coral,
        tabBarInactiveTintColor: isDarkMode ? '#64748B' : colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.surface.card,
          borderTopColor: colors.border.default,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.06,
          shadowRadius: 8,
          elevation: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
        headerStyle: {
          backgroundColor: colors.surface.card,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDarkMode ? 0.3 : 0.05,
          shadowRadius: 3,
          elevation: 2,
        },
        headerTintColor: isDarkMode ? '#F8FAFC' : colors.brand.navy,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          letterSpacing: -0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home,
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={24}
              color={typeof color === 'string' ? color : colors.brand.coral}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="trips"
        options={{
          title: t.tabs.trips,
          headerTitle: t.tabs.tripsHeader,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'map' : 'map-outline'}
              size={24}
              color={typeof color === 'string' ? color : colors.brand.coral}
            />
          ),
        }}
      />

      {/* Tombol Tengah: Buat Trip Baru (100% Center & Space-Optimized) */}
      <Tabs.Screen
        name="create"
        options={{
          title: t.tabs.create,
          tabBarLabel: () => null,
          tabBarButton: ({ ref, style, ...restProps }) => (
            <Pressable
              {...restProps}
              style={[style, styles.centerTabPressable]}
              onPress={() => router.push('/trip/new')}
              accessibilityLabel={t.tabs.create}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.centerButton,
                  {
                    backgroundColor: colors.brand.coral,
                  },
                ]}
              >
                <Image
                  source={require('@/../assets/images/logo-white.png')}
                  style={styles.centerLogo}
                  resizeMode="contain"
                />
              </View>
              <Typography
                variant="caption"
                color={colors.brand.coral}
                style={styles.centerButtonLabel}
              >
                {t.tabs.create}
              </Typography>
            </Pressable>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/trip/new');
          },
        }}
      />

      <Tabs.Screen
        name="items"
        options={{
          title: t.tabs.inventory,
          headerTitle: t.tabs.inventoryHeader,
          tabBarIcon: ({ color }) => (
            <MaterialIcons
              name="backpack"
              size={24}
              color={typeof color === 'string' ? color : colors.brand.coral}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: t.tabs.settings,
          headerTitle: t.tabs.settingsHeader,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={24}
              color={typeof color === 'string' ? color : colors.brand.coral}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerTabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  centerButton: {
    width: 44,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 3,
    elevation: 3,
  },
  centerLogo: {
    width: 18,
    height: 18,
  },
  centerButtonLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
    letterSpacing: 0.2,
  },
});
