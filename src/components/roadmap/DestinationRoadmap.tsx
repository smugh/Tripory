import React from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radius, spacing, useThemeColors } from '@/core/theme';
import { Typography } from '../ui/Typography';
import { Badge } from '../ui/Badge';
import { DestinationRecord } from '@/db/schema/destinations';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';
import { getDestinationDate, formatDestinationDate } from '@/core/utils/destination-schedule';

export interface DestinationRoadmapProps {
  destinations: DestinationRecord[];
  tripStartDate?: string;
  activeStopIndex?: number;
  onToggleVisited?: (dest: DestinationRecord, index: number) => void;
  onAddStopPress?: () => void;
  onEditDestination?: (destination: DestinationRecord) => void;
  onDeleteDestination?: (destination: DestinationRecord) => void;
  onMoveDestination?: (destination: DestinationRecord, direction: -1 | 1) => void;
  visitedIds?: string[];
}

export const DestinationRoadmap: React.FC<DestinationRoadmapProps> = ({
  destinations,
  tripStartDate,
  activeStopIndex = 0,
  onToggleVisited,
  onAddStopPress,
  onEditDestination,
  onDeleteDestination,
  onMoveDestination,
  visitedIds = [],
}) => {
  const router = useRouter();
  const colors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t, format, language } = useI18n();

  if (destinations.length === 0) {
    return (
      <View style={[styles.emptyRoadmap, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="map" size={32} color={colors.brand.coral} />
        </View>
        <Typography variant="h3" color={colors.brand.navy} style={styles.emptyTitle}>
          {t.trip.emptyRoadmapTitle}
        </Typography>
        <Typography variant="body" color={colors.text.secondary} style={styles.emptyDesc}>
          {t.trip.emptyRoadmapDesc}
        </Typography>
        {onAddStopPress ? (
          <Pressable style={styles.addCtaButton} onPress={onAddStopPress}>
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Typography variant="label" color="#FFFFFF" style={styles.addCtaText}>
              {t.trip.addFirstStopBtn}
            </Typography>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const visitedCount = visitedIds.length;
  const progressPercent = Math.round((visitedCount / destinations.length) * 100);

  return (
    <View style={styles.container}>
      {/* Roadmap Progress Summary */}
      <View style={[styles.summaryBar, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
        <View style={styles.summaryLeft}>
          <Typography variant="caption" color={colors.text.secondary}>
            {t.trip.destProgressTitle}
          </Typography>
          <Typography variant="h3" color={colors.brand.navy}>
            {format(t.trip.destProgressSubtitle, { visited: visitedCount, total: destinations.length })}
          </Typography>
        </View>
        <Badge
          label={format(t.trip.visitedPercent, { percent: progressPercent })}
          variant={progressPercent === 100 ? 'success' : 'accent'}
          dot
        />
      </View>

      {/* Vertical Roadmap Trail */}
      <View style={styles.trailContainer}>
        {destinations.map((dest, idx) => {
          const isVisited = visitedIds.includes(dest.id);
          const isCurrent = !isVisited && idx === activeStopIndex;
          const isLast = idx === destinations.length - 1;

          return (
            <View key={dest.id} style={styles.stopRow}>
              {/* Left Column: Milestone Node & Connecting Line */}
              <View style={styles.nodeColumn}>
                {/* Node Icon Circle */}
                <Pressable
                  onPress={() => onToggleVisited && onToggleVisited(dest, idx)}
                  style={[
                    styles.nodeCircle,
                    { backgroundColor: colors.surface.card, borderColor: colors.border.strong },
                    isVisited && styles.nodeCircleVisited,
                    isCurrent && [
                      styles.nodeCircleCurrent,
                      { borderColor: isDarkMode ? '#FFFFFF' : colors.brand.navy },
                    ],
                  ]}
                >
                  {isVisited ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : isCurrent ? (
                    <Ionicons name="navigate" size={14} color="#FFFFFF" />
                  ) : (
                    <Typography variant="caption" color={colors.text.secondary} style={styles.nodeIndex}>
                      {idx + 1}
                    </Typography>
                  )}
                </Pressable>

                {/* Connecting Vertical Track Line */}
                {!isLast ? (
                  <View
                    style={[
                      styles.verticalLine,
                      isVisited ? styles.verticalLineVisited : styles.verticalLinePending,
                    ]}
                  />
                ) : null}
              </View>

              {/* Right Column: Destination Card */}
              <View style={styles.cardColumn}>
                <Pressable
                  onPress={() => router.push(`/destination/${dest.id}` as any)}
                  style={({ pressed }) => [
                    styles.destinationCard,
                    {
                      backgroundColor: colors.surface.card,
                      borderColor: colors.border.default,
                    },
                    isCurrent && [
                      styles.destinationCardCurrent,
                      {
                        backgroundColor: isDarkMode ? 'rgba(229, 99, 83, 0.12)' : '#FFF9F8',
                        borderColor: colors.brand.coral,
                      },
                    ],
                    isVisited && [
                      styles.destinationCardVisited,
                      {
                        backgroundColor: isDarkMode ? 'rgba(22, 163, 74, 0.1)' : '#F6FBF7',
                        borderColor: isDarkMode ? '#1E3A52' : '#E2E8F0',
                      },
                    ],
                    pressed && { opacity: 0.95 },
                  ]}
                >
                  {/* Optional Destination Image Thumbnail */}
                  {dest.imageUri && (
                    <View style={styles.cardThumbWrap}>
                      <Image source={{ uri: dest.imageUri }} style={styles.cardThumbImage} />
                    </View>
                  )}

                  {/* Meta Bar */}
                  <View style={styles.metaRow}>
                    <View style={styles.dayBadge}>
                      <Typography variant="caption" color={colors.brand.navy} style={styles.dayBadgeText}>
                        {`#${idx + 1}`}
                      </Typography>
                    </View>

                    {getDestinationDate(dest, tripStartDate) || dest.plannedTime ? (
                      <View style={styles.timeWrap}>
                        <Ionicons name="time-outline" size={12} color={colors.text.muted} />
                        <Typography variant="caption" color={colors.text.muted} style={styles.timeText}>
                          {[formatDestinationDate(getDestinationDate(dest, tripStartDate), language), dest.plannedTime].filter(Boolean).join(' · ')}
                        </Typography>
                      </View>
                    ) : null}

                    {isVisited ? (
                      <Badge label={t.trip.statusVisited} variant="success" size="sm" />
                    ) : isCurrent ? (
                      <Badge label={t.trip.activeStopBadge} variant="accent" size="sm" dot />
                    ) : (
                      <Badge label={t.trip.statusPlanned} variant="neutral" size="sm" />
                    )}
                  </View>

                  {/* Destination Title & Activity */}
                  <View style={styles.titleRow}>
                  <Typography
                    variant="h3"
                    color={isVisited ? colors.text.muted : colors.brand.navy}
                    style={[styles.destTitle, isVisited && styles.strikeTitle]}
                  >
                    {dest.name}
                  </Typography>
                  <Ionicons name="chevron-forward" size={15} color={colors.text.muted} />
                  </View>

                  {dest.activity ? (
                    <View style={styles.activityRow}>
                      <Ionicons
                        name="flag-outline"
                        size={14}
                        color={isVisited ? colors.text.muted : colors.brand.blue}
                      />
                      <Typography
                        variant="caption"
                        color={isVisited ? colors.text.muted : colors.text.secondary}
                        style={styles.activityText}
                      >
                        {dest.activity}
                      </Typography>
                    </View>
                  ) : null}

                  {/* Action Bar (Check-in button & Detail link) */}
                  <View style={styles.cardActions}>
                    {onToggleVisited ? (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onToggleVisited(dest, idx);
                        }}
                        style={[
                          styles.actionPill,
                          isVisited ? styles.actionPillVisited : styles.actionPillActive,
                        ]}
                      >
                        <Ionicons
                          name={isVisited ? 'checkmark-circle' : 'radio-button-off-outline'}
                          size={14}
                          color={isVisited ? colors.status.success : colors.brand.coral}
                        />
                        <Typography
                          variant="caption"
                          color={isVisited ? colors.status.success : colors.brand.coral}
                          style={styles.actionPillText}
                        >
                          {isVisited ? t.trip.visitedBtn : t.trip.markVisitedBtn}
                        </Typography>
                      </Pressable>
                    ) : <View />}

                  {(onEditDestination || onDeleteDestination || onMoveDestination) && (
                    <View style={styles.manageActions}>
                      {onMoveDestination && (
                        <>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={language === 'en' ? 'Move destination earlier' : 'Pindahkan destinasi lebih awal'}
                            disabled={idx === 0}
                            onPress={(e) => { e.stopPropagation(); onMoveDestination(dest, -1); }}
                            style={[styles.manageAction, idx === 0 && styles.disabledManageAction]}
                          >
                            <Ionicons name="arrow-up" size={16} color={idx === 0 ? colors.text.muted : colors.brand.blue} />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={language === 'en' ? 'Move destination later' : 'Pindahkan destinasi lebih akhir'}
                            disabled={idx === destinations.length - 1}
                            onPress={(e) => { e.stopPropagation(); onMoveDestination(dest, 1); }}
                            style={[styles.manageAction, idx === destinations.length - 1 && styles.disabledManageAction]}
                          >
                            <Ionicons name="arrow-down" size={16} color={idx === destinations.length - 1 ? colors.text.muted : colors.brand.blue} />
                          </Pressable>
                        </>
                      )}
                      {onEditDestination && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={language === 'en' ? 'Edit destination' : 'Edit destinasi'}
                          onPress={(e) => { e.stopPropagation(); onEditDestination(dest); }}
                          style={styles.manageAction}
                        >
                          <Ionicons name="pencil" size={15} color={colors.brand.blue} />
                        </Pressable>
                      )}
                      {onDeleteDestination && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={language === 'en' ? 'Delete destination' : 'Hapus destinasi'}
                          onPress={(e) => { e.stopPropagation(); onDeleteDestination(dest); }}
                          style={styles.manageAction}
                        >
                          <Ionicons name="trash-outline" size={15} color={colors.status.error} />
                        </Pressable>
                      )}
                    </View>
                  )}
                  </View>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    padding: spacing[3],
    borderRadius: radius.lg,
    marginBottom: spacing[4],
  },
  summaryLeft: {
    flex: 1,
  },
  trailContainer: {
    paddingLeft: spacing[1],
  },
  stopRow: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  nodeColumn: {
    width: 36,
    alignItems: 'center',
  },
  nodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface.card,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeCircleVisited: {
    backgroundColor: colors.status.success,
    borderColor: colors.status.success,
  },
  nodeCircleCurrent: {
    backgroundColor: colors.brand.coral,
    borderColor: colors.brand.navy,
    transform: [{ scale: 1.15 }],
  },
  nodeIndex: {
    fontWeight: '700',
    fontSize: 11,
  },
  verticalLine: {
    width: 3,
    flex: 1,
    marginVertical: 2,
    zIndex: 1,
  },
  verticalLineVisited: {
    backgroundColor: colors.status.success,
  },
  verticalLinePending: {
    backgroundColor: colors.border.default,
  },
  cardColumn: {
    flex: 1,
    paddingLeft: spacing[2],
    paddingBottom: spacing[2],
  },
  destinationCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  destinationCardCurrent: {
    borderColor: colors.brand.coral,
    backgroundColor: '#FFFAF9',
  },
  destinationCardVisited: {
    backgroundColor: '#FAFCFA',
    borderColor: '#E2E8F0',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayBadge: {
    backgroundColor: colors.surface.muted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 4,
    fontSize: 11,
  },
  destTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  strikeTitle: {
    textDecorationLine: 'line-through',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  activityText: {
    marginLeft: 4,
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  cardActions: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  manageAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface.page,
  },
  disabledManageAction: {
    opacity: 0.4,
  },
  cardThumbWrap: {
    height: 110,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  cardThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  actionPillActive: {
    borderColor: colors.brand.coral,
    backgroundColor: '#FFF0EE',
  },
  actionPillVisited: {
    borderColor: colors.status.success,
    backgroundColor: colors.status.successLight,
  },
  actionPillText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyRoadmap: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE4E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  emptyTitle: {
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  emptyDesc: {
    textAlign: 'center',
    marginBottom: spacing[4],
    lineHeight: 20,
  },
  addCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.navy,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
  },
  addCtaText: {
    marginLeft: 6,
    fontWeight: '700',
  },
});
