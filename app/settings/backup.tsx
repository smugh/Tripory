import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, ScreenContainer } from '@/components/ui';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';
import { backupService } from '@/services/backup.service';

export default function BackupScreen() {
  const themeColors = useThemeColors();
  const { t, language, format } = useI18n();
  const isDarkMode = useUIStore((s) => s.isDarkMode);

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
      await backupService.backupAndSendToGmail(gmailAccount);
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

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="cloud-upload" size={24} color="#EA4335" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.gmailSection}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted} style={{ marginTop: 2 }}>
                {language === 'en'
                  ? 'Safely export and dispatch your entire offline travel records and itinerary to your personal Gmail inbox.'
                  : 'Ekspor dan kirim seluruh rekaman perjalanan dan jadwal offline Anda ke kotak masuk Gmail pribadi secara aman.'}
              </Typography>
            </View>
          </View>
        </Card>

        {/* Gmail Setup Card */}
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
