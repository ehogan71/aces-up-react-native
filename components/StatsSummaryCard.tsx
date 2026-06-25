import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type GameStats } from '../utils/gameStats';

// Shared compact statistics UI used by both Settings and Game Over modals.
type Props = {
  stats: GameStats | null;
  testID?: string;
  fallbackStats?: GameStats;
  showClearStatisticsAction?: boolean;
  onClearStatistics?: () => void;
};

const StatsSummaryCard: React.FC<Props> = ({
  stats,
  testID,
  fallbackStats,
  showClearStatisticsAction = false,
  onClearStatistics,
}) => {
  // Use live stats when available, otherwise fall back to caller-provided defaults.
  const displayStats = stats ?? fallbackStats ?? null;

  if (!displayStats) {
    return (
      <View testID={testID} style={styles.card}>
        <Text style={styles.statText}>Loading current stats...</Text>
      </View>
    );
  }

  const winningPercentage = Math.round(
    (displayStats.gamesWon / Math.max(1, displayStats.gamesFinished)) * 100,
  );

  return (
    <View testID={testID} style={styles.card}>
      <Text style={styles.statText}>
        Games started: {displayStats.gamesStarted}
      </Text>
      <Text style={styles.statText}>
        Games won/completed: {displayStats.gamesWon}/
        {displayStats.gamesFinished} ({winningPercentage}% won)
      </Text>

      {showClearStatisticsAction ? (
        <>
          <Pressable
            testID="clear-statistics-button"
            onPress={onClearStatistics}
            style={styles.clearStatsButton}
            accessibilityRole="button"
            accessibilityLabel="Clear statistics"
          >
            <Text style={styles.clearStatsButtonText}>
              Clear Statistics
              <Text style={styles.superscriptMarker}>*</Text>
            </Text>
          </Pressable>
          <Text style={styles.clearStatsNote}>
            <Text style={styles.superscriptMarker}>*</Text> This action will
            start a new game.
          </Text>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F4ECE0',
    borderWidth: 1,
    borderColor: 'rgba(97, 74, 45, 0.14)',
  },
  statText: {
    color: '#20382E',
    fontSize: 13,
    lineHeight: 18,
  },
  clearStatsButton: {
    marginTop: 10,
    minHeight: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A4B3C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  clearStatsButtonText: {
    color: '#F6F1E6',
    fontSize: 14,
    fontWeight: '700',
  },
  superscriptMarker: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '700',
    transform: [{ translateY: -4 }],
  },
  clearStatsNote: {
    marginTop: 6,
    color: '#4D5F56',
    fontSize: 11,
    lineHeight: 14,
  },
});

export default StatsSummaryCard;
