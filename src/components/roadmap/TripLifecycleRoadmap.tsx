import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/core/theme';
import { Typography } from '../ui/Typography';
import { ProgressBar } from '../ui/ProgressBar';

export type TripStage = 'draft' | 'preparing' | 'ready' | 'ongoing' | 'completed';

export interface TripLifecycleRoadmapProps {
  status: TripStage;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  theme?: 'light' | 'dark';
}

interface StepMeta {
  key: string;
  label: string;
  shortLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const LIFECYCLE_STEPS: StepMeta[] = [
  {
    key: 'plan',
    label: 'Rencana',
    shortLabel: 'Plan',
    icon: 'calendar-outline',
    description: 'Atur jadwal & destinasi',
  },
  {
    key: 'pack',
    label: 'Kemas',
    shortLabel: 'Pack',
    icon: 'bag-handle-outline',
    description: 'Siapkan barang & blocker',
  },
  {
    key: 'explore',
    label: 'Jelajah',
    shortLabel: 'Explore',
    icon: 'navigate-outline',
    description: 'Nikmati perjalanan aktif',
  },
  {
    key: 'return',
    label: 'Cek Balik',
    shortLabel: 'Return',
    icon: 'repeat-outline',
    description: 'Rekonsiliasi kepulangan',
  },
  {
    key: 'closed',
    label: 'Selesai',
    shortLabel: 'Memory',
    icon: 'checkmark-done-circle-outline',
    description: 'Arsip & kenangan tersimpan',
  },
];

export const TripLifecycleRoadmap: React.FC<TripLifecycleRoadmapProps> = ({
  status,
  style,
  compact = false,
  theme = 'light',
}) => {
  // Tentukan step index aktif berdasarkan status trip
  const getActiveStepIndex = (): number => {
    switch (status) {
      case 'draft':
        return 0; // Plan
      case 'preparing':
        return 1; // Pack
      case 'ready':
        return 1; // Pack (Siap)
      case 'ongoing':
        return 2; // Jelajah
      case 'completed':
        return 4; // Selesai
      default:
        return 0;
    }
  };

  const activeIndex = getActiveStepIndex();
  const progressPercent = Math.round(((activeIndex + 1) / LIFECYCLE_STEPS.length) * 100);

  const isDark = theme === 'dark';
  const textColor = isDark ? '#FFFFFF' : colors.brand.navy;
  const subtextColor = isDark ? '#CBD5E1' : colors.text.secondary;
  const trackBg = isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border.default;

  return (
    <View style={[styles.container, style]}>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Ionicons
            name="map-outline"
            size={18}
            color={colors.brand.coral}
            style={styles.headerIcon}
          />
          <Typography variant="label" color={textColor} style={styles.headerTitle}>
            Roadmap Perjalanan
          </Typography>
        </View>

        <View style={[styles.progressPill, isDark && styles.progressPillDark]}>
          <Typography variant="label" color={colors.brand.coral}>
            Tahap {activeIndex + 1} dari 5 • {progressPercent}%
          </Typography>
        </View>
      </View>

      {/* Stepper Roadmap Line & Nodes */}
      <View style={styles.stepperContainer}>
        {LIFECYCLE_STEPS.map((step, idx) => {
          const isCompleted = idx < activeIndex || status === 'completed';
          const isCurrent = idx === activeIndex && status !== 'completed';
          const isUpcoming = idx > activeIndex;

          const nodeBg = isCompleted
            ? colors.status.success
            : isCurrent
            ? colors.brand.coral
            : isDark
            ? 'rgba(255, 255, 255, 0.2)'
            : colors.surface.muted;

          const nodeBorder = isCurrent
            ? isDark
              ? '#FFFFFF'
              : colors.brand.navy
            : 'transparent';

          return (
            <React.Fragment key={step.key}>
              {/* Milestone Node */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.nodeCircle,
                    { backgroundColor: nodeBg, borderColor: nodeBorder },
                    isCurrent && styles.nodeCircleActive,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name={step.icon}
                      size={14}
                      color={isCurrent ? '#FFFFFF' : isDark ? '#CBD5E1' : colors.text.muted}
                    />
                  )}
                </View>

                {/* Step Label */}
                <Typography
                  variant="caption"
                  color={isCurrent ? colors.brand.coral : isCompleted ? textColor : subtextColor}
                  style={[
                    styles.stepLabel,
                    isCurrent && styles.stepLabelCurrent,
                  ]}
                  numberOfLines={1}
                >
                  {compact ? step.shortLabel : step.label}
                </Typography>
              </View>

              {/* Connecting line between steps */}
              {idx < LIFECYCLE_STEPS.length - 1 ? (
                <View
                  style={[
                    styles.connectingLine,
                    {
                      backgroundColor:
                        idx < activeIndex ? colors.status.success : trackBg,
                    },
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      {/* Active Stage Callout (Full mode only) */}
      {!compact ? (
        <View style={[styles.activeStageCard, isDark && styles.activeStageCardDark]}>
          <View style={styles.activeStageRow}>
            <View style={styles.pulseDot} />
            <Typography variant="label" color={textColor}>
              Tahap Aktif: {LIFECYCLE_STEPS[activeIndex].label}
            </Typography>
          </View>
          <Typography variant="caption" color={subtextColor}>
            {LIFECYCLE_STEPS[activeIndex].description}
          </Typography>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 6,
  },
  headerTitle: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  progressPill: {
    backgroundColor: '#FFE4E1',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  progressPillDark: {
    backgroundColor: 'rgba(245, 107, 95, 0.2)',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  stepItem: {
    alignItems: 'center',
    zIndex: 2,
    minWidth: 44,
  },
  nodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  nodeCircleActive: {
    transform: [{ scale: 1.15 }],
    shadowColor: colors.brand.coral,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  connectingLine: {
    flex: 1,
    height: 3,
    marginHorizontal: -4,
    zIndex: 1,
  },
  stepLabel: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLabelCurrent: {
    fontWeight: '800',
  },
  activeStageCard: {
    marginTop: spacing[3],
    backgroundColor: colors.surface.muted,
    padding: spacing[3],
    borderRadius: radius.md,
  },
  activeStageCardDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.coral,
    marginRight: 8,
  },
});
