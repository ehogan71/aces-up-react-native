import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { type AppSettings, type BackStyle } from '../utils/appSettings';
import { type GameStats } from '../utils/gameStats';
import StatsSummaryCard from './StatsSummaryCard';

// Settings modal groups gameplay toggles, appearance, statistics, and app metadata.
type Props = {
  visible: boolean;
  settings: AppSettings;
  stats: GameStats | null;
  appVersion: string;
  onClose: () => void;
  onClearStatistics: () => void;
  onTogglePlayableIndicators: (value: boolean) => void;
  onToggleStackCounts: (value: boolean) => void;
  onSelectCardBackStyle: (value: BackStyle) => void;
};

const cardBackOptions: BackStyle[] = ['Red', 'Blue'];

const cardBackToneStyles: Record<
  BackStyle,
  {
    textStyle: { color: string };
    selectedTextStyle: { color: string };
    borderColor: string;
    backgroundColor: string;
    selectedBackgroundColor: string;
    selectedBorderColor: string;
  }
> = {
  Red: {
    textStyle: { color: '#A45F58' },
    selectedTextStyle: { color: '#F6F1E6' },
    borderColor: '#D6B7AD',
    backgroundColor: '#FFF6F1',
    selectedBackgroundColor: '#9C5B53',
    selectedBorderColor: '#6F3E39',
  },
  Blue: {
    textStyle: { color: '#5D78A8' },
    selectedTextStyle: { color: '#F6F1E6' },
    borderColor: '#B6C6E1',
    backgroundColor: '#F4F8FF',
    selectedBackgroundColor: '#5C769F',
    selectedBorderColor: '#344A71',
  },
};

const SettingsModal: React.FC<Props> = ({
  visible,
  settings,
  stats,
  appVersion,
  onClose,
  onClearStatistics,
  onTogglePlayableIndicators,
  onToggleStackCounts,
  onSelectCardBackStyle,
}) => {
  return (
    <Modal
      testID="settings-modal"
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Pressable
              testID="close-settings-button"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close settings"
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gameplay</Text>

              <View style={styles.row}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowTitle}>Playable indicators</Text>
                  <Text style={styles.rowDescription}>
                    Show the dot on cards that can be played.
                  </Text>
                </View>
                <Switch
                  testID="show-playable-switch"
                  value={settings.showPlayableIndicators}
                  onValueChange={onTogglePlayableIndicators}
                  trackColor={{ false: '#CBBCA4', true: '#2E8B57' }}
                  thumbColor={
                    settings.showPlayableIndicators ? '#F6F1E6' : '#FFFFFF'
                  }
                  ios_backgroundColor="#CBBCA4"
                />
              </View>

              <View style={styles.row}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowTitle}>Card counts</Text>
                  <Text style={styles.rowDescription}>
                    Show the card counts on the deck and discard stacks.
                  </Text>
                </View>
                <Switch
                  testID="show-counts-switch"
                  value={settings.showStackCounts}
                  onValueChange={onToggleStackCounts}
                  trackColor={{ false: '#CBBCA4', true: '#2E8B57' }}
                  thumbColor={settings.showStackCounts ? '#F6F1E6' : '#FFFFFF'}
                  ios_backgroundColor="#CBBCA4"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Card backs</Text>
              <View style={styles.backOptionRow}>
                {cardBackOptions.map(option => {
                  const selected = settings.cardBackStyle === option;
                  const tone = cardBackToneStyles[option];

                  return (
                    <Pressable
                      key={option}
                      testID={`card-back-${option.toLowerCase()}-button`}
                      style={[
                        styles.backOption,
                        selected
                          ? {
                              backgroundColor: tone.selectedBackgroundColor,
                              borderColor: tone.selectedBorderColor,
                            }
                          : {
                              backgroundColor: tone.backgroundColor,
                              borderColor: tone.borderColor,
                            },
                      ]}
                      onPress={() => onSelectCardBackStyle(option)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.backOptionText,
                          selected ? tone.selectedTextStyle : tone.textStyle,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Statistics</Text>
              <StatsSummaryCard
                testID="settings-stats"
                stats={stats}
                showClearStatisticsAction
                onClearStatistics={onClearStatistics}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>App Info</Text>
              <View testID="settings-app-info" style={styles.infoCard}>
                <Text style={styles.infoTitle}>AcesUp Solitaire Game</Text>
                <Text style={styles.infoText}>Developed by Ed Hogan</Text>
                <Text style={styles.infoText}>Powered by React Native</Text>
                <Text style={styles.infoText}>Version {appVersion}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 24, 15, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    borderRadius: 18,
    backgroundColor: '#173A2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  title: {
    color: '#F6F1E6',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  closeButtonText: {
    color: '#E9D6A8',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#D7E4DB',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F4ECE0',
    borderWidth: 1,
    borderColor: 'rgba(97, 74, 45, 0.14)',
  },
  rowTextBlock: {
    flex: 1,
  },
  rowTitle: {
    color: '#193126',
    fontSize: 15,
    fontWeight: '600',
  },
  rowDescription: {
    marginTop: 4,
    color: '#5D6F66',
    fontSize: 12,
    lineHeight: 16,
  },
  backOptionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backOption: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4ECE0',
    borderWidth: 1,
    borderColor: 'rgba(97, 74, 45, 0.14)',
  },
  backOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F4ECE0',
    borderWidth: 1,
    borderColor: 'rgba(97, 74, 45, 0.14)',
    gap: 4,
  },
  infoTitle: {
    color: '#20382E',
    fontSize: 15,
    fontWeight: '700',
  },
  infoText: {
    color: '#20382E',
    fontSize: 12,
    lineHeight: 16,
  },
});

export default SettingsModal;
