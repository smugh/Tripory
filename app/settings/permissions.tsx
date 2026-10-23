import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MailComposer from 'expo-mail-composer';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, ScreenContainer } from '@/components/ui';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

export default function PermissionsScreen() {
  const themeColors = useThemeColors();
  const { t, language } = useI18n();
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  // Device Permissions State
  const [cameraPerm, setCameraPerm] = useState<string>('checking');
  const [photosPerm, setPhotosPerm] = useState<string>('checking');
  const [locationPerm, setLocationPerm] = useState<string>('checking');
  const [emailPerm, setEmailPerm] = useState<boolean>(true);

  const checkAllPermissions = useCallback(async () => {
    try {
      const cam = await ImagePicker.getCameraPermissionsAsync();
      setCameraPerm(cam.granted ? 'granted' : 'not_granted');

      const photo = await ImagePicker.getMediaLibraryPermissionsAsync();
      setPhotosPerm(photo.granted ? 'granted' : 'not_granted');

      const loc = await Location.getForegroundPermissionsAsync();
      setLocationPerm(loc.granted ? 'granted' : 'not_granted');

      const mail = await MailComposer.isAvailableAsync();
      setEmailPerm(mail);
    } catch {
      // silent catch
    }
  }, []);

  useEffect(() => {
    checkAllPermissions();
  }, [checkAllPermissions]);

  const requestCameraPermission = async () => {
    try {
      const res = await ImagePicker.requestCameraPermissionsAsync();
      setCameraPerm(res.granted ? 'granted' : 'not_granted');
      if (res.granted) {
        Alert.alert(language === 'en' ? 'Success' : 'Sukses', language === 'en' ? 'Camera access granted.' : 'Akses kamera diizinkan.');
      }
    } catch {
      // ignore
    }
  };

  const requestPhotosPermission = async () => {
    try {
      const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setPhotosPerm(res.granted ? 'granted' : 'not_granted');
      if (res.granted) {
        Alert.alert(language === 'en' ? 'Success' : 'Sukses', language === 'en' ? 'Photo library access granted.' : 'Akses galeri foto diizinkan.');
      }
    } catch {
      // ignore
    }
  };

  const requestLocationPermission = async () => {
    try {
      const res = await Location.requestForegroundPermissionsAsync();
      setLocationPerm(res.granted ? 'granted' : 'not_granted');
      if (res.granted) {
        Alert.alert(language === 'en' ? 'Success' : 'Sukses', language === 'en' ? 'Location & GPS access granted.' : 'Akses lokasi dan GPS diizinkan.');
      }
    } catch {
      // ignore
    }
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Explanatory Card */}
        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF' }]}>
              <Ionicons name="shield-checkmark" size={24} color={themeColors.brand.blue} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.permissionsSection}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted} style={{ marginTop: 2 }}>
                {t.settings.permissionsDesc}
              </Typography>
            </View>
          </View>
        </Card>

        {/* Permissions List */}
        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          {/* Camera Permission */}
          <View style={[styles.permRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={[styles.permIconWrap, { backgroundColor: 'rgba(245, 107, 95, 0.12)' }]}>
              <Ionicons name="camera" size={20} color={themeColors.brand.coral} />
            </View>
            <View style={{ flex: 1, marginLeft: 12, paddingRight: 8 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.permCamera}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted}>
                {t.settings.permCameraDesc}
              </Typography>
            </View>
            {cameraPerm === 'granted' ? (
              <Badge label={t.settings.permGranted} variant="success" size="sm" dot />
            ) : (
              <Pressable
                style={[styles.permActionBtn, { backgroundColor: themeColors.brand.blue }]}
                onPress={requestCameraPermission}
              >
                <Typography variant="caption" color="#FFFFFF" style={{ fontWeight: '700' }}>
                  {t.settings.permRequest}
                </Typography>
              </Pressable>
            )}
          </View>

          {/* Photos & Local Files Permission */}
          <View style={[styles.permRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={[styles.permIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
              <Ionicons name="images" size={20} color={themeColors.brand.blue} />
            </View>
            <View style={{ flex: 1, marginLeft: 12, paddingRight: 8 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.permPhotos}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted}>
                {t.settings.permPhotosDesc}
              </Typography>
            </View>
            {photosPerm === 'granted' ? (
              <Badge label={t.settings.permGranted} variant="success" size="sm" dot />
            ) : (
              <Pressable
                style={[styles.permActionBtn, { backgroundColor: themeColors.brand.blue }]}
                onPress={requestPhotosPermission}
              >
                <Typography variant="caption" color="#FFFFFF" style={{ fontWeight: '700' }}>
                  {t.settings.permRequest}
                </Typography>
              </Pressable>
            )}
          </View>

          {/* Location & GPS Permission */}
          <View style={[styles.permRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={[styles.permIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="location" size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12, paddingRight: 8 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.permLocation}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted}>
                {t.settings.permLocationDesc}
              </Typography>
            </View>
            {locationPerm === 'granted' ? (
              <Badge label={t.settings.permGranted} variant="success" size="sm" dot />
            ) : (
              <Pressable
                style={[styles.permActionBtn, { backgroundColor: themeColors.brand.blue }]}
                onPress={requestLocationPermission}
              >
                <Typography variant="caption" color="#FFFFFF" style={{ fontWeight: '700' }}>
                  {t.settings.permRequest}
                </Typography>
              </Pressable>
            )}
          </View>

          {/* Email (Gmail) Status */}
          <View style={[styles.permRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={[styles.permIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="mail" size={20} color="#EA4335" />
            </View>
            <View style={{ flex: 1, marginLeft: 12, paddingRight: 8 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.permEmail}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted}>
                {t.settings.permEmailDesc}
              </Typography>
            </View>
            <Badge
              label={emailPerm ? t.settings.permActive : t.settings.permCheck}
              variant={emailPerm ? 'success' : 'neutral'}
              size="sm"
              dot={emailPerm}
            />
          </View>

          {/* Date & System Time */}
          <View style={styles.permRowLast}>
            <View style={[styles.permIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Ionicons name="time" size={20} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 12, paddingRight: 8 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.permDateTime}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted}>
                {t.settings.permDateTimeDesc}
              </Typography>
            </View>
            <Badge label={t.settings.permActive} variant="info" size="sm" dot />
          </View>
        </Card>

        {/* Refresh Status Button */}
        <Pressable
          style={[styles.refreshBtn, { backgroundColor: isDarkMode ? themeColors.surface.card : '#F1F5F9', borderColor: themeColors.border.default }]}
          onPress={checkAllPermissions}
        >
          <Ionicons name="refresh-outline" size={18} color={themeColors.brand.blue} />
          <Typography variant="caption" color={themeColors.brand.blue} style={{ fontWeight: '700', marginLeft: 6 }}>
            {language === 'en' ? 'Re-check Permissions' : 'Periksa Ulang Izin'}
          </Typography>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: spacing[3],
    paddingBottom: spacing[8],
  },
  card: {
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  permRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  permIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permActionBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
