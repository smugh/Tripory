import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/core/theme';
import { Typography } from '../ui/Typography';
import { Badge } from '../ui/Badge';
import { DestinationRecord } from '@/db/schema/destinations';

export interface DestinationRoadmapProps {
  destinations: DestinationRecord[];
  activeStopIndex?: number;
  onToggleVisited?: (dest: DestinationRecord, index: number) => void;
  onAddStopPress?: () => void;
  visitedIds?: string[];
}

export const DestinationRoadmap: React.FC<DestinationRoadmapProps> = ({
  destinations,
  activeStopIndex = 0,
  onToggleVisited,
  onAddStopPress,
  visitedIds = [],
}) => {
  if (destinations.length === 0) {
    return (
      <View style={styles.emptyRoadmap}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="map" size={32} color={colors.brand.coral} />
        </View>
        <Typography variant="h3" color={colors.brand.navy} style={styles.emptyTitle}>
          Roadmap Destinasi Masih Kosong
        </Typography>
        <Typography variant="body" color={colors.text.secondary} style={styles.emptyDesc}>
          Tambahkan titik persinggahan untuk melihat jalur timeline dan progres perjalanan Anda.
        </Typography>
        {onAddStopPress ? (
          <Pressable style={styles.addCtaButton} onPress={onAddStopPress}>
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Typography variant="label" color="#FFFFFF" style={styles.addCtaText}>
              Tambah Titik Pertama
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
      <View style={styles.summaryBar}>
        <View style={styles.summaryLeft}>
          <Typography variant="caption" color={colors.text.secondary}>
            Progres Kunjungan Destinasi
          </Typography>
          <Typography variant="h3" color={colors.brand.navy}>
            {visitedCount} dari {destinations.length} Titik Selesai
          </Typography>
        </View>
        <Badge
          label={`${progressPercent}% Tercapai`}
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
                    isVisited && styles.nodeCircleVisited,
                    isCurrent && styles.nodeCircleCurrent,
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
                <View
                  style={[
                    styles.destinationCard,
                    isCurrent && styles.destinationCardCurrent,
                    isVisited && styles.destinationCardVisited,
                  ]}
                >
                  {/* Meta Bar */}
                  <View style={styles.metaRow}>
                    <View style={styles.dayBadge}>
                      <Typography variant="caption" color={colors.brand.navy} style={styles.dayBadgeText}>
                        HARI {dest.dayNumber || idx + 1}
                      </Typography>
                    </View>

                    {dest.plannedTime ? (
                      <View style={styles.timeWrap}>
                        <Ionicons name="time-outline" size={12} color={colors.text.muted} />
                        <Typography variant="caption" color={colors.text.muted} style={styles.timeText}>
                          {dest.plannedTime} WIB
                        </Typography>
                      </View>
                    ) : null}

                    {isVisited ? (
                      <Badge label="Tercapai" variant="success" size="sm" />
                    ) : isCurrent ? (
                      <Badge label="Titik Aktif" variant="accent" size="sm" dot />
                    ) : (
                      <Badge label="Rencana" variant="neutral" size="sm" />
                    )}
                  </View>

                  {/* Destination Title & Activity */}
                  <Typography
                    variant="h3"
                    color={isVisited ? colors.text.muted : colors.brand.navy}
                    style={[styles.destTitle, isVisited && styles.strikeTitle]}
                  >
                    {dest.name}
                  </Typography>

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

                  {/* Action Bar (Check-in button) */}
                  {onToggleVisited ? (
                    <View style={styles.cardActions}>
                      <Pressable
                        onPress={() => onToggleVisited(dest, idx)}
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
                          {isVisited ? 'Selesai Dikunjungi' : 'Tandai Dikunjungi'}
                        </Typography>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
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
    paddingLeft: spacing[3],
    paddingBottom: spacing[4],
  },
  destinationCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    padding: spacing[3],
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
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
    marginBottom: 4,
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
    marginLeft: 6,
    flex: 1,
  },
  cardActions: {
    marginTop: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
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
