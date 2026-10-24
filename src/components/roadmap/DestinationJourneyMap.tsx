import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DestinationRecord } from '@/db/schema/destinations';
import { Typography } from '../ui/Typography';
import { Badge } from '../ui/Badge';
import { useI18n } from '@/core/i18n';

export interface DestinationJourneyMapProps {
  destinations: DestinationRecord[];
  visitedIds?: string[];
  onStopPress?: (dest: DestinationRecord) => void;
  onAddStopPress?: () => void;
}

export const DestinationJourneyMap: React.FC<DestinationJourneyMapProps> = ({
  destinations,
  visitedIds = [],
  onStopPress,
  onAddStopPress,
}) => {
  const [mapWidth, setMapWidth] = useState(280);
  const router = useRouter();
  const { t, format } = useI18n();

  const total = destinations.length;
  const visitedCount = visitedIds.length;
  const stopWidth = Math.max(96, mapWidth / Math.min(Math.max(total, 1), 3));
  const routeWidth = Math.max(mapWidth, total * stopWidth);
  const markerY = (index: number) => index % 2 === 0 ? 38 : 100;
  const progressPercent = total > 0 ? Math.round((visitedCount / total) * 100) : 0;

  // Identify the currently active stop (first unvisited stop)
  const currentStopIndex = destinations.findIndex((d) => !visitedIds.includes(d.id));

  const handlePressStop = (dest: DestinationRecord) => {
    if (onStopPress) {
      onStopPress(dest);
    } else {
      router.push(`/destination/${dest.id}` as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="trail-sign" size={14} color="#FF6B57" />
          </View>
          <Typography variant="label" color="#FFFFFF" style={styles.headerTitle}>
            {t.trip.journeyMapTitle}
          </Typography>
        </View>

        {total > 0 && (
          <Badge
            label={format(t.trip.journeyMapProgress, { visited: visitedCount, total })}
            variant={progressPercent === 100 ? 'success' : 'accent'}
            size="sm"
            dot
          />
        )}
      </View>

      {/* Content: Empty state or Map Trail */}
      {total === 0 ? (
        <Pressable
          style={styles.emptyBox}
          onPress={onAddStopPress}
        >
          <Ionicons name="map-outline" size={18} color="#94A3B8" />
          <Typography variant="caption" color="#CBD5E1" style={styles.emptyText}>
            {t.trip.journeyMapEmpty}
          </Typography>
        </Pressable>
      ) : (
        <View onLayout={(event) => setMapWidth(event.nativeEvent.layout.width)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ width: routeWidth, height: 166 }}>
              {/* A smooth winding road, drawn with native views to keep the map lightweight. */}
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {destinations.slice(0, -1).map((destination, index) => {
                  const fromY = markerY(index);
                  const toY = markerY(index + 1);
                  const completed = visitedIds.includes(destination.id) && visitedIds.includes(destinations[index + 1].id);
                  return Array.from({ length: 24 }, (_, segment) => {
                    const t1 = segment / 24;
                    const t2 = (segment + 1) / 24;
                    const x1 = stopWidth * (index + 0.5 + t1);
                    const x2 = stopWidth * (index + 0.5 + t2);
                    const y1 = fromY + (toY - fromY) * (1 - Math.cos(Math.PI * t1)) / 2;
                    const y2 = fromY + (toY - fromY) * (1 - Math.cos(Math.PI * t2)) / 2;
                    const length = Math.hypot(x2 - x1, y2 - y1) + 1;
                    const angle = `${Math.atan2(y2 - y1, x2 - x1)}rad`;
                    return (
                      <View key={`${destination.id}-${segment}`} style={{
                        position: 'absolute', left: (x1 + x2 - length) / 2,
                        top: (y1 + y2) / 2 - 4, width: length, height: 8,
                        borderRadius: 4, backgroundColor: completed ? '#22C55E' : '#516887',
                        transform: [{ rotate: angle }],
                      }}>
                        {segment % 4 < 2 && <View style={{
                          position: 'absolute', top: 3, left: 0, right: 0, height: 2,
                          backgroundColor: completed ? '#BBF7D0' : '#A9BAD0',
                        }} />}
                      </View>
                    );
                  });
                })}
              </View>
              {destinations.map((dest, idx) => {
                const isVisited = visitedIds.includes(dest.id);
                const isCurrent = idx === currentStopIndex;
                return (
                  <View key={dest.id} style={{
                    position: 'absolute', left: idx * stopWidth, top: markerY(idx) - 34,
                    width: stopWidth, alignItems: 'center',
                  }}>
                    <Typography variant="caption" color="#A9BAD0" style={styles.dayText}>
                      {`#${idx + 1}`}
                    </Typography>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={dest.name}
                      style={({ pressed }) => [
                        styles.markerCircle, { marginTop: 4 },
                        isVisited && styles.markerVisited,
                        isCurrent && styles.markerCurrent,
                        !isVisited && !isCurrent && styles.markerPending,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => handlePressStop(dest)}
                    >
                      {isVisited ? <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        : isCurrent ? <Ionicons name="location-sharp" size={15} color="#FF6B57" />
                        : <Typography variant="caption" color="#CBD5E1" style={styles.stopNumText}>{idx + 1}</Typography>}
                    </Pressable>
                    <Pressable onPress={() => handlePressStop(dest)} style={[styles.nameWrap, { maxWidth: stopWidth - 8 }]}>
                      <Typography variant="caption" numberOfLines={2}
                        color={isCurrent ? '#FFFFFF' : '#CBD5E1'}
                        style={[styles.destNameText, isCurrent && styles.destNameCurrent]}>
                        {dest.name}
                      </Typography>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 107, 87, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  emptyText: {
    marginLeft: 8,
    fontSize: 12,
  },
  trailScrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
  },
  nodeItem: {
    width: 90,
    alignItems: 'center',
  },
  topMetaWrap: {
    marginBottom: 4,
  },
  dayText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  markerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 2,
  },
  markerVisited: {
    backgroundColor: '#16A34A',
    borderColor: '#22C55E',
  },
  markerCurrent: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FF6B57',
    shadowColor: '#FF6B57',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  markerPending: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  stopNumText: {
    fontSize: 11,
    fontWeight: '700',
  },
  connectorLine: {
    position: 'absolute',
    height: 3,
    top: 13,
    zIndex: 1,
  },
  connectorLeft: {
    left: 0,
    right: '50%',
  },
  connectorRight: {
    left: '50%',
    right: 0,
  },
  connectorSpacer: {
    flex: 1,
  },
  connectorVisited: {
    backgroundColor: '#22C55E',
  },
  connectorPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  nameWrap: {
    marginTop: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
    maxWidth: 86,
  },
  destNameText: {
    fontSize: 11,
    textAlign: 'center',
  },
  destNameCurrent: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  destNameVisited: {
    textDecorationLine: 'line-through',
  },
});
