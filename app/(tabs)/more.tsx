import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
  Switch,
  Alert,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, ScreenContainer, Button } from '@/components/ui';
import { APP_CONFIG } from '@/core/constants';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';
import { backupService } from '@/services/backup.service';
import * as FileSystem from 'expo-file-system/legacy';

export default function SettingsScreen() {
  const themeColors = useThemeColors();
  const { t, language, format } = useI18n();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const setLanguage = useUIStore((s) => s.setLanguage);

  // Gmail Backup State
  const gmailAccount = useUIStore((s) => s.gmailAccount);
  const lastBackupTime = useUIStore((s) => s.lastBackupTime);
  const setGmailAccount = useUIStore((s) => s.setGmailAccount);
  const setLastBackupTime = useUIStore((s) => s.setLastBackupTime);

  const [isEditingGmail, setIsEditingGmail] = useState(false);
  const [gmailInput, setGmailInput] = useState(gmailAccount);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Accessibility States
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [storageUsage, setStorageUsage] = useState<string>('...');

  useEffect(() => {
    async function calculateStorage() {
      try {
        if (!FileSystem.documentDirectory) {
          setStorageUsage('0 KB');
          return;
        }
        const mediaDir = `${FileSystem.documentDirectory}${APP_CONFIG.storageMediaDir}`;
        const dirInfo = await FileSystem.getInfoAsync(mediaDir);
        if (dirInfo.exists && 'size' in dirInfo && typeof dirInfo.size === 'number') {
          const mb = (dirInfo.size / (1024 * 1024)).toFixed(2);
          setStorageUsage(`${mb} MB`);
        } else {
          setStorageUsage('< 1 MB');
        }
      } catch {
        setStorageUsage(t.settings.offlineOnly);
      }
    }
    calculateStorage();
  }, [t.settings.offlineOnly]);

  // Handle Save Gmail
  const handleSaveGmail = () => {
    const trimmed = gmailInput.trim();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert(
        language === 'en' ? 'Invalid Email' : 'Email Tidak Valid',
        language === 'en' ? 'Please enter a valid Gmail address.' : 'Masukkan alamat email Gmail yang valid.'
      );
      return;
    }
    setGmailAccount(trimmed);
    setIsEditingGmail(false);
  };

  // Handle Manual Backup to Gmail
  const handleManualBackup = async () => {
    if (!gmailAccount.trim()) {
      setIsEditingGmail(true);
      Alert.alert(
        language === 'en' ? 'Setup Gmail' : 'Atur Gmail',
        language === 'en' ? 'Please set your destination Gmail account first.' : 'Silakan atur alamat Gmail tujuan pencadangan terlebih dahulu.'
      );
      return;
    }

    try {
      setIsBackingUp(true);
      const res = await backupService.backupAndSendToGmail(gmailAccount);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
      setLastBackupTime(nowStr);

      Alert.alert(
        t.settings.backupSuccessTitle,
        format(t.settings.backupSuccessMsg, { email: gmailAccount }),
        [{ text: t.settings.ok }]
      );
    } catch (err) {
      Alert.alert(
        language === 'en' ? 'Backup Failed' : 'Pencadangan Gagal',
        String(err)
      );
    } finally {
      setIsBackingUp(false);
    }
  };

  // Handle Restore Data Process
  const handlePerformRestore = async (sourceType: 'email' | 'local') => {
    setIsRestoreModalVisible(false);
    setIsRestoring(true);

    try {
      const fileUri = await backupService.pickBackupFile();
      if (!fileUri) {
        setIsRestoring(false);
        return;
      }

      const payload = await backupService.parseBackupFile(fileUri);
      const res = await backupService.restoreData(payload);

      if (res.success && res.stats) {
        Alert.alert(
          t.settings.restoreSuccessTitle,
          format(t.settings.restoreSuccessMsg, {
            trips: res.stats.tripsCount,
            destinations: res.stats.destinationsCount,
            items: res.stats.itemsCount,
          }),
          [{ text: t.settings.ok }]
        );
      }
    } catch {
      Alert.alert(
        t.settings.restoreFailTitle,
        t.settings.restoreFailMsg,
        [{ text: t.settings.ok }]
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleBackupInfo = () => {
    Alert.alert(
      t.settings.backupAlertTitle,
      t.settings.backupAlertDesc,
      [{ text: t.settings.understood }]
    );
  };

  const handleExportSummary = () => {
    Alert.alert(
      t.settings.exportAlertTitle,
      t.settings.exportAlertDesc,
      [{ text: t.settings.ok }]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <Card variant="navy" style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.profileInfo}>
              <Typography variant="h3" color="#FFFFFF" style={styles.profileName}>
                {t.settings.profileName}
              </Typography>
              <Typography variant="caption" color={themeColors.brand.coral} style={styles.profileRole}>
                {t.settings.profileRole}
              </Typography>
            </View>
            <Badge label={t.settings.localBadge} variant="accent" size="sm" />
          </View>
          <Typography variant="caption" color="#CBD5E1" style={styles.profileDesc}>
            {t.settings.profileDesc}
          </Typography>
        </Card>

        {/* Section 1: Gmail Backup & Restore (Destinasi Pencadangan Gmail) */}
        <Typography variant="label" color={themeColors.text.primary} style={styles.sectionHeader}>
          {t.settings.gmailSection}
        </Typography>

        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          {/* Gmail Destination Header */}
          <View style={styles.gmailHeaderRow}>
            <View style={styles.gmailIconBadge}>
              <Ionicons name="mail" size={20} color="#EA4335" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.gmailAccountLabel}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted}>
                {lastBackupTime
                  ? format(t.settings.lastBackup, { time: lastBackupTime })
                  : t.settings.neverBackedUp}
              </Typography>
            </View>
            <Badge
              label={gmailAccount ? t.settings.gmailConnected : t.settings.gmailNotSet}
              variant={gmailAccount ? 'success' : 'neutral'}
              size="sm"
              dot={!!gmailAccount}
            />
          </View>

          {/* Email Display / Input Row */}
          {isEditingGmail ? (
            <View style={styles.emailEditContainer}>
              <TextInput
                style={[
                  styles.emailInput,
                  {
                    color: themeColors.text.primary,
                    borderColor: themeColors.border.focus,
                    backgroundColor: isDarkMode ? themeColors.surface.muted : '#F8FAFC',
                  },
                ]}
                placeholder={t.settings.gmailPlaceholder}
                placeholderTextColor={themeColors.text.muted}
                value={gmailInput}
                onChangeText={setGmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Pressable
                style={[styles.saveEmailBtn, { backgroundColor: themeColors.brand.blue }]}
                onPress={handleSaveGmail}
              >
                <Typography variant="label" color="#FFFFFF">
                  {t.settings.saveEmail}
                </Typography>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.emailDisplayRow, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.08)' : '#F1F5F9' }]}>
              <Typography variant="body" color={themeColors.text.primary} style={styles.emailText}>
                {gmailAccount || t.settings.gmailNotSet}
              </Typography>
              <Pressable onPress={() => { setGmailInput(gmailAccount); setIsEditingGmail(true); }}>
                <Typography variant="caption" color={themeColors.brand.blue} style={{ fontWeight: '700' }}>
                  {t.settings.editEmail}
                </Typography>
              </Pressable>
            </View>
          )}

          {/* Backup & Restore Action Buttons */}
          <View style={styles.backupActionsRow}>
            {/* Tombol Cadangkan ke Gmail */}
            <Pressable
              style={[
                styles.actionBtnPrimary,
                { backgroundColor: themeColors.brand.coral },
                isBackingUp && { opacity: 0.7 },
              ]}
              onPress={handleManualBackup}
              disabled={isBackingUp}
            >
              {isBackingUp ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Typography variant="label" color="#FFFFFF" style={{ fontWeight: '700' }}>
                    {t.settings.btnBackupNow}
                  </Typography>
                </>
              )}
            </Pressable>

            {/* Tombol Unduh / Pulihkan Data */}
            <Pressable
              style={[
                styles.actionBtnSecondary,
                { borderColor: themeColors.brand.blue },
                isRestoring && { opacity: 0.7 },
              ]}
              onPress={() => setIsRestoreModalVisible(true)}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={themeColors.brand.blue} />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={17} color={themeColors.brand.blue} style={{ marginRight: 6 }} />
                  <Typography variant="label" color={themeColors.brand.blue} style={{ fontWeight: '700' }}>
                    {t.settings.btnRestoreData}
                  </Typography>
                </>
              )}
            </Pressable>
          </View>
        </Card>

        {/* Section 2: Language Selection */}
        <Typography variant="label" color={themeColors.text.primary} style={styles.sectionHeader}>
          {t.settings.languageSection}
        </Typography>

        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <View style={styles.languageOptions}>
            {/* English (Default) */}
            <Pressable
              style={[
                styles.langOptionCard,
                { borderColor: language === 'en' ? themeColors.brand.blue : themeColors.border.default },
                language === 'en' && { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : '#EFF6FF' },
              ]}
              onPress={() => setLanguage('en')}
            >
              <View style={styles.langOptionLeft}>
                <View style={[styles.flagBadge, { backgroundColor: language === 'en' ? themeColors.brand.blue : themeColors.border.default }]}>
                  <Typography variant="caption" color="#FFFFFF" style={{ fontWeight: '800', fontSize: 11 }}>
                    EN
                  </Typography>
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: language === 'en' ? '700' : '500' }}>
                    {t.settings.languageEn}
                  </Typography>
                  <Typography variant="caption" color={themeColors.text.muted}>
                    Default • Global
                  </Typography>
                </View>
              </View>
              {language === 'en' ? (
                <Ionicons name="checkmark-circle" size={22} color={themeColors.brand.blue} />
              ) : (
                <Ionicons name="ellipse-outline" size={20} color={themeColors.text.muted} />
              )}
            </Pressable>

            {/* Bahasa Indonesia */}
            <Pressable
              style={[
                styles.langOptionCard,
                { borderColor: language === 'id' ? themeColors.brand.coral : themeColors.border.default },
                language === 'id' && { backgroundColor: isDarkMode ? 'rgba(245, 107, 95, 0.12)' : '#FFF1F2' },
              ]}
              onPress={() => setLanguage('id')}
            >
              <View style={styles.langOptionLeft}>
                <View style={[styles.flagBadge, { backgroundColor: language === 'id' ? themeColors.brand.coral : themeColors.border.default }]}>
                  <Typography variant="caption" color="#FFFFFF" style={{ fontWeight: '800', fontSize: 11 }}>
                    ID
                  </Typography>
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: language === 'id' ? '700' : '500' }}>
                    {t.settings.languageId}
                  </Typography>
                  <Typography variant="caption" color={themeColors.text.muted}>
                    Bahasa Indonesia
                  </Typography>
                </View>
              </View>
              {language === 'id' ? (
                <Ionicons name="checkmark-circle" size={22} color={themeColors.brand.coral} />
              ) : (
                <Ionicons name="ellipse-outline" size={20} color={themeColors.text.muted} />
              )}
            </Pressable>
          </View>
        </Card>

        {/* Section 3: Appearance & Accessibility */}
        <Typography variant="label" color={themeColors.text.primary} style={styles.sectionHeader}>
          {t.settings.appearanceSection}
        </Typography>

        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          {/* Dark Mode Toggle */}
          <View style={[styles.infoRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={styles.infoLeft}>
              <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.2)' : '#EFF6FF' }]}>
                <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={18} color={isDarkMode ? '#38BDF8' : themeColors.brand.blue} />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '600' }}>
                  {t.settings.darkMode}
                </Typography>
                <Typography variant="caption" color={themeColors.text.muted}>
                  {t.settings.darkModeDesc}
                </Typography>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              thumbColor="#FFFFFF"
              trackColor={{ false: themeColors.border.default, true: themeColors.brand.blue }}
            />
          </View>

          {/* Haptic Feedback */}
          <View style={[styles.infoRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={styles.infoLeft}>
              <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(245, 107, 95, 0.2)' : '#FFF1F2' }]}>
                <Ionicons name="finger-print-outline" size={18} color={themeColors.brand.coral} />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '600' }}>
                  {t.settings.haptics}
                </Typography>
                <Typography variant="caption" color={themeColors.text.muted}>
                  {t.settings.hapticsDesc}
                </Typography>
              </View>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              thumbColor="#FFFFFF"
              trackColor={{ false: themeColors.border.default, true: themeColors.brand.coral }}
            />
          </View>

          {/* High Contrast */}
          <View style={styles.infoRowLast}>
            <View style={styles.infoLeft}>
              <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(147, 197, 253, 0.15)' : '#F1F5F9' }]}>
                <Ionicons name="contrast-outline" size={18} color={themeColors.brand.navy} />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '600' }}>
                  {t.settings.contrast}
                </Typography>
                <Typography variant="caption" color={themeColors.text.muted}>
                  {t.settings.contrastDesc}
                </Typography>
              </View>
            </View>
            <Switch
              value={highContrast}
              onValueChange={setHighContrast}
              thumbColor="#FFFFFF"
              trackColor={{ false: themeColors.border.default, true: themeColors.brand.blue }}
            />
          </View>
        </Card>

        {/* Section 4: Device & System Info */}
        <Typography variant="label" color={themeColors.text.primary} style={styles.sectionHeader}>
          {t.settings.deviceSection}
        </Typography>

        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <View style={[styles.infoRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={styles.infoLeft}>
              <Ionicons name="phone-portrait-outline" size={17} color={themeColors.brand.blue} />
              <Typography variant="body" color={themeColors.text.secondary} style={styles.infoLabel}>
                {t.settings.os}
              </Typography>
            </View>
            <Badge label={`${Platform.OS.toUpperCase()} (API ${Platform.Version})`} variant="info" size="sm" />
          </View>

          <View style={[styles.infoRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={styles.infoLeft}>
              <Ionicons name="server-outline" size={17} color={themeColors.status.success} />
              <Typography variant="body" color={themeColors.text.secondary} style={styles.infoLabel}>
                {t.settings.database}
              </Typography>
            </View>
            <Badge label={t.settings.databaseVal} variant="success" size="sm" dot />
          </View>

          <View style={[styles.infoRow, { borderBottomColor: themeColors.border.muted }]}>
            <View style={styles.infoLeft}>
              <Ionicons name="images-outline" size={17} color={themeColors.brand.coral} />
              <Typography variant="body" color={themeColors.text.secondary} style={styles.infoLabel}>
                {t.settings.mediaStorage}
              </Typography>
            </View>
            <Typography variant="label" color={themeColors.text.primary}>
              {storageUsage}
            </Typography>
          </View>

          <View style={styles.infoRowLast}>
            <View style={styles.infoLeft}>
              <Ionicons name="cloud-offline-outline" size={17} color={themeColors.text.muted} />
              <Typography variant="body" color={themeColors.text.secondary} style={styles.infoLabel}>
                {t.settings.operationMode}
              </Typography>
            </View>
            <Badge label={t.settings.offlineOnly} variant="neutral" size="sm" />
          </View>
        </Card>

        {/* Section 5: Data & Privacy */}
        <Typography variant="label" color={themeColors.text.primary} style={styles.sectionHeader}>
          {t.settings.dataSection}
        </Typography>

        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <Pressable style={[styles.actionRow, { borderBottomColor: themeColors.border.muted }]} onPress={handleBackupInfo}>
            <View style={styles.infoLeft}>
              <Ionicons name="shield-checkmark-outline" size={17} color={themeColors.status.success} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '600' }}>
                  {t.settings.securityBackup}
                </Typography>
                <Typography variant="caption" color={themeColors.text.muted}>
                  {t.settings.securityBackupDesc}
                </Typography>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color={themeColors.text.muted} />
          </Pressable>

          <Pressable style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={handleExportSummary}>
            <View style={styles.infoLeft}>
              <Ionicons name="share-outline" size={17} color={themeColors.brand.blue} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '600' }}>
                  {t.settings.exportSummary}
                </Typography>
                <Typography variant="caption" color={themeColors.text.muted}>
                  {t.settings.exportSummaryDesc}
                </Typography>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color={themeColors.text.muted} />
          </Pressable>
        </Card>

        {/* Section 6: About Tripory */}
        <Typography variant="label" color={themeColors.text.primary} style={styles.sectionHeader}>
          {t.settings.aboutSection}
        </Typography>

        <Card
          style={[
            styles.aboutCard,
            {
              backgroundColor: isDarkMode ? themeColors.surface.card : '#F8FAFC',
              borderColor: themeColors.border.default,
            },
          ]}
        >
          <View style={styles.aboutRow}>
            <Image
              source={require('@/../assets/images/logo-icon.png')}
              style={styles.aboutLogo}
              resizeMode="contain"
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="h3" color={themeColors.brand.navy}>
                Tripory Mobile
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted}>
                {format(t.settings.aboutSubtitle, { version: APP_CONFIG.version })}
              </Typography>
            </View>
          </View>
          <Typography variant="caption" color={themeColors.text.secondary} style={styles.aboutText}>
            {t.settings.aboutText}
          </Typography>
        </Card>
      </ScrollView>

      {/* Restore Data Selection Modal */}
      <Modal
        visible={isRestoreModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRestoreModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsRestoreModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: themeColors.surface.card,
                borderColor: themeColors.border.default,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.2)' : '#EFF6FF' }]}>
                <Ionicons name="cloud-download" size={24} color={themeColors.brand.blue} />
              </View>
              <Typography variant="h3" color={themeColors.text.primary} style={styles.modalTitle}>
                {t.settings.restoreModalTitle}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted} style={styles.modalSubtitle}>
                {t.settings.restoreModalSubtitle}
              </Typography>
            </View>

            {/* Option 1: Ambil dari Email (Gmail) */}
            <Pressable
              style={[styles.restoreOptionCard, { borderColor: themeColors.border.default }]}
              onPress={() => handlePerformRestore('email')}
            >
              <View style={[styles.optionIconBadge, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="mail" size={20} color="#EA4335" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                  {t.settings.restoreFromEmail}
                </Typography>
                <Typography variant="caption" color={themeColors.text.muted} style={{ marginTop: 2 }}>
                  {t.settings.restoreFromEmailDesc}
                </Typography>
              </View>
              <Ionicons name="chevron-forward" size={18} color={themeColors.text.muted} />
            </Pressable>

            {/* Option 2: Dari Penyimpanan Lokal */}
            <Pressable
              style={[styles.restoreOptionCard, { borderColor: themeColors.border.default }]}
              onPress={() => handlePerformRestore('local')}
            >
              <View style={[styles.optionIconBadge, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="folder-open" size={20} color={themeColors.brand.blue} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                  {t.settings.restoreFromLocal}
                </Typography>
                <Typography variant="caption" color={themeColors.text.muted} style={{ marginTop: 2 }}>
                  {t.settings.restoreFromLocalDesc}
                </Typography>
              </View>
              <Ionicons name="chevron-forward" size={18} color={themeColors.text.muted} />
            </Pressable>

            {/* Cancel Button */}
            <Pressable
              style={[styles.cancelBtn, { backgroundColor: isDarkMode ? themeColors.surface.muted : '#F1F5F9' }]}
              onPress={() => setIsRestoreModalVisible(false)}
            >
              <Typography variant="label" color={themeColors.text.primary}>
                {t.settings.cancel}
              </Typography>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: spacing[3],
    paddingBottom: spacing[8],
  },
  profileCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontWeight: '800',
  },
  profileRole: {
    fontWeight: '600',
    marginTop: 2,
  },
  profileDesc: {
    lineHeight: 18,
  },
  sectionHeader: {
    marginBottom: spacing[2],
    marginLeft: 4,
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
  },
  // Gmail Section Styles
  gmailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  gmailIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    marginBottom: spacing[3],
  },
  emailText: {
    fontWeight: '600',
    fontSize: 13,
  },
  emailEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  emailInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    fontSize: 13,
  },
  saveEmailBtn: {
    height: 42,
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupActionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Language Options
  languageOptions: {
    gap: spacing[2],
  },
  langOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  langOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  infoRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    marginLeft: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  aboutCard: {
    padding: spacing[4],
    marginBottom: spacing[6],
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  aboutLogo: {
    width: 38,
    height: 38,
  },
  aboutText: {
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  modalTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    textAlign: 'center',
    marginTop: 4,
  },
  restoreOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing[3],
  },
  optionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[1],
  },
});
