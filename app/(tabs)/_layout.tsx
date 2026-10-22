import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/core/theme';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

export default function TabLayout() {
  const router = useRouter();
  const colors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand.coral,
        tabBarInactiveTintColor: isDarkMode ? '#64748B' : colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.surface.card,
          borderTopColor: colors.border.default,
          height: 68,
          paddingBottom: 10,
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

      {/* Tombol Tengah: Buat Trip Baru */}
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: () => (
            <View style={styles.centerButtonOuter}>
              <Pressable
                onPress={() => router.push('/trip/new')}
                style={({ pressed }) => [
                  styles.centerButton,
                  {
                    backgroundColor: colors.brand.coral,
                    borderColor: colors.surface.card,
                  },
                  pressed && styles.centerButtonPressed,
                ]}
                accessibilityLabel="Buat Trip Baru"
                accessibilityRole="button"
              >
                <Ionicons name="add" size={30} color="#FFFFFF" />
              </Pressable>
            </View>
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bag-handle' : 'bag-handle-outline'}
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
  centerButtonOuter: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F56B5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
  },
  centerButtonPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
});
