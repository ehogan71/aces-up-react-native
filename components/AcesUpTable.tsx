import React, { useEffect, useRef, useState } from 'react';
import {
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CardStack from './CardStack';
import SettingsModal from './SettingsModal';
import StatsSummaryCard from './StatsSummaryCard';
import {
  getGameStats,
  type GameStats,
  incrementGamesFinished,
  incrementGamesStarted,
  incrementGamesWon,
  resetGameStats,
} from '../utils/gameStats';
import {
  DEFAULT_APP_SETTINGS,
  getAppSettings,
  saveAppSettings,
  type AppSettings,
} from '../utils/appSettings';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Main table container for gameplay state, persistence wiring, and overlays.
type Suit = 'C' | 'D' | 'H' | 'S';
type BackStyle = 'Red' | 'Blue';

type StackCard = {
  suit: Suit;
  rank: number;
  faceUp?: boolean;
  backStyle?: BackStyle;
};

type AcesUpTableProps = {
  initialTopStacks?: StackCard[][];
  initialDeckStack?: StackCard[];
  initialDiscardStack?: StackCard[];
};

const APP_VERSION = (require('../app.json') as { version?: string }).version;
const EMPTY_STATS: GameStats = {
  gamesStarted: 0,
  gamesFinished: 0,
  gamesWon: 0,
};

const AcesUpTable: React.FC<AcesUpTableProps> = ({
  initialTopStacks,
  initialDeckStack,
  initialDiscardStack,
}) => {
  const insets = useSafeAreaInsets();

  // Add top offset to avoid notches/cutouts. Use insets.top plus a small padding.
  const topOffset = Math.max(12, (insets?.top || 0) + 12);
  const bottomOffset = Math.max(12, (insets?.bottom || 0) + 12);

  const suits: Suit[] = ['C', 'D', 'H', 'S'];

  const createShuffledDeck = (): StackCard[] => {
    const deck: StackCard[] = [];
    for (const s of suits) {
      for (let r = 1; r <= 13; r++) {
        deck.push({ suit: s, rank: r, faceUp: false });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    return deck;
  };

  type GameSnapshot = {
    topStacks: StackCard[][];
    deckStack: StackCard[];
    discardStack: StackCard[];
  };

  const [topStacks, setTopStacks] = useState<StackCard[][]>(
    initialTopStacks ?? [[], [], [], []],
  );
  const [deckStack, setDeckStack] = useState<StackCard[]>(
    initialDeckStack ?? createShuffledDeck(),
  );
  const [discardStack, setDiscardStack] = useState<StackCard[]>(
    initialDiscardStack ?? [],
  );
  const [undoStack, setUndoStack] = useState<GameSnapshot[]>([]);
  const [gameOverResult, setGameOverResult] = useState<'win' | 'lose' | null>(
    null,
  );
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [gameOverStats, setGameOverStats] = useState<GameStats | null>(null);
  const [appSettings, setAppSettings] =
    useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [settingsStats, setSettingsStats] = useState<GameStats | null>(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [hasLoadedAppSettings, setHasLoadedAppSettings] = useState(false);
  const hasRecordedGameEndRef = useRef(false);
  const isMountedRef = useRef(true);

  const cloneStack = (stack: StackCard[]) => stack.map(card => ({ ...card }));
  const cloneStacks = (stacks: StackCard[][]) => stacks.map(cloneStack);
  const captureSnapshot = (): GameSnapshot => ({
    topStacks: cloneStacks(topStacks),
    deckStack: cloneStack(deckStack),
    discardStack: cloneStack(discardStack),
  });

  const syncStats = (stats: GameStats | null) => {
    setSettingsStats(stats);
    setGameOverStats(stats);
  };

  const rankValue = (rank: number) => (rank === 1 ? 14 : rank);
  const isHigherRank = (candidate: StackCard, target: StackCard) =>
    rankValue(candidate.rank) > rankValue(target.rank);
  const getTopCardPlayableAction = (
    stackIndex: number,
  ): 'discard' | 'relocate' | null => {
    const stack = topStacks[stackIndex];
    if (!stack.length) return null;

    const topCard = stack[0];
    const hasHigherMatchingSuit = topStacks.some((otherStack, otherIndex) => {
      if (otherIndex === stackIndex) return false;
      if (!otherStack.length) return false;
      return (
        otherStack[0].suit === topCard.suit &&
        isHigherRank(otherStack[0], topCard)
      );
    });

    if (hasHigherMatchingSuit) return 'discard';

    const hasEmptyStack = topStacks.some(
      (otherStack, otherIndex) =>
        otherIndex !== stackIndex && otherStack.length === 0,
    );

    if (stack.length === 1 && hasEmptyStack) return null;

    return hasEmptyStack ? 'relocate' : null;
  };

  const isTopCardPlayable = (stackIndex: number) =>
    getTopCardPlayableAction(stackIndex) !== null;

  const hasMovableTopCards = topStacks.some(
    (_, index) => getTopCardPlayableAction(index) !== null,
  );
  const isDeckEmpty = deckStack.length === 0;
  const isGameEnded = isDeckEmpty && !hasMovableTopCards;
  const isReadyToDealAgain = isGameEnded && gameOverDismissed;
  const hasExactlyOneCardPerTopStack = topStacks.every(
    stack => stack.length === 1,
  );
  const topCards = topStacks
    .map(stack => stack[0])
    .filter(Boolean) as StackCard[];
  const isWinningEndState =
    hasExactlyOneCardPerTopStack &&
    topCards.length === 4 &&
    topCards.every(card => card.rank === 1) &&
    new Set(topCards.map(card => card.suit)).size === 4;

  useEffect(() => {
    (async () => {
      const stats = await incrementGamesStarted();
      if (!isMountedRef.current) {
        return;
      }
      syncStats(stats);
    })();
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const storedSettings = await getAppSettings();
      if (!isMountedRef.current) {
        return;
      }
      setAppSettings(storedSettings);
      setHasLoadedAppSettings(true);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const stats = await getGameStats();
      if (!isMountedRef.current) {
        return;
      }
      syncStats(stats);
    })();
  }, []);

  useEffect(() => {
    if (!hasLoadedAppSettings) {
      return;
    }

    saveAppSettings(appSettings);
  }, [appSettings, hasLoadedAppSettings]);

  useEffect(() => {
    if (!isGameEnded) {
      if (gameOverDismissed) setGameOverDismissed(false);
      return;
    }

    if (!hasRecordedGameEndRef.current) {
      hasRecordedGameEndRef.current = true;
      (async () => {
        // Record completion once per game-over state and mirror values in both modals.
        let stats = await incrementGamesFinished();

        if (isWinningEndState) {
          stats = await incrementGamesWon();
        }

        if (!isMountedRef.current) {
          return;
        }

        syncStats(stats);
      })();
    }

    if (!gameOverResult && !gameOverDismissed) {
      setGameOverResult(isWinningEndState ? 'win' : 'lose');
    }
  }, [isGameEnded, isWinningEndState, gameOverDismissed, gameOverResult]);

  useEffect(() => {
    if (!gameOverResult) {
      return;
    }

    setGameOverStats(settingsStats);
  }, [gameOverResult, settingsStats]);

  const startDeal = () => {
    if (deckStack.length < 4) return;

    setUndoStack(prev => [...prev, captureSnapshot()]);

    const cardsToDeal = deckStack
      .slice(0, 4)
      .map(c => ({ ...c, faceUp: true }));
    setDeckStack(prev => prev.slice(4));

    setTopStacks(prev => {
      const next = [...prev];
      for (let i = 0; i < 4; i++) {
        next[i] = [cardsToDeal[i], ...next[i]];
      }
      return next;
    });
  };

  const handleTopCardPress = (stackIndex: number) => {
    const action = getTopCardPlayableAction(stackIndex);
    if (!action) return;

    const sourceStack = topStacks[stackIndex];
    if (!sourceStack.length) return;

    const playedCard = sourceStack[0];

    setUndoStack(prev => [...prev, captureSnapshot()]);

    setTopStacks(prev => {
      const nextStacks = [...prev];
      nextStacks[stackIndex] = nextStacks[stackIndex].slice(1);

      if (action === 'relocate') {
        const targetIndex = nextStacks.findIndex(
          (stack, index) => index !== stackIndex && stack.length === 0,
        );
        if (targetIndex !== -1) {
          nextStacks[targetIndex] = [playedCard, ...nextStacks[targetIndex]];
        }
      }

      return nextStacks;
    });

    if (action === 'discard') {
      setDiscardStack(prev => [{ ...playedCard, faceUp: false }, ...prev]);
    }
  };

  const handleUndo = () => {
    setUndoStack(prev => {
      if (!prev.length) return prev;

      const next = prev.slice(0, -1);
      const snapshot = prev[prev.length - 1];
      setTopStacks(cloneStacks(snapshot.topStacks));
      setDeckStack(cloneStack(snapshot.deckStack));
      setDiscardStack(cloneStack(snapshot.discardStack));
      return next;
    });
  };

  const handleDismissGameOver = () => {
    setGameOverResult(null);
    setGameOverDismissed(true);
  };

  const handleDealAgain = () => {
    hasRecordedGameEndRef.current = false;
    setTopStacks([[], [], [], []]);
    setDiscardStack([]);
    setDeckStack(createShuffledDeck());
    setUndoStack([]);
    setGameOverResult(null);
    setGameOverDismissed(false);
    setGameOverStats(null);
    (async () => {
      const stats = await incrementGamesStarted();
      if (!isMountedRef.current) {
        return;
      }
      syncStats(stats);
    })();
  };

  const handleOpenSettings = () => {
    setIsSettingsVisible(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsVisible(false);
  };

  const handleClearStatistics = async () => {
    setIsSettingsVisible(false);

    // Clearing stats should also restart the board and begin a fresh tracked game.
    await resetGameStats();
    if (!isMountedRef.current) {
      return;
    }

    hasRecordedGameEndRef.current = false;
    setTopStacks([[], [], [], []]);
    setDiscardStack([]);
    setDeckStack(createShuffledDeck());
    setUndoStack([]);
    setGameOverResult(null);
    setGameOverDismissed(false);

    const startedStats = await incrementGamesStarted();
    if (!isMountedRef.current) {
      return;
    }

    syncStats(startedStats);
  };

  const handleTogglePlayableIndicators = (value: boolean) => {
    setAppSettings(prev => ({
      ...prev,
      showPlayableIndicators: value,
    }));
  };

  const handleToggleStackCounts = (value: boolean) => {
    setAppSettings(prev => ({
      ...prev,
      showStackCounts: value,
    }));
  };

  const handleSelectCardBackStyle = (value: AppSettings['cardBackStyle']) => {
    setAppSettings(prev => ({
      ...prev,
      cardBackStyle: value,
    }));
  };

  const handlePrimaryButtonPress = () => {
    if (isReadyToDealAgain) {
      handleDealAgain();
      return;
    }

    startDeal();
  };

  const isDealButtonDisabled = !isReadyToDealAgain && deckStack.length < 4;
  const isUndoButtonDisabled = undoStack.length === 0 || isReadyToDealAgain;

  return (
    <ImageBackground
      testID="acesup-background"
      source={require('../assets/table-background.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View testID="acesup-container" style={styles.container}>
        <View
          testID="header-row"
          style={[styles.headerRow, { marginTop: topOffset }]}
        >
          <Pressable
            testID="settings-button"
            style={styles.settingsButton}
            onPress={handleOpenSettings}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" style={styles.settingsIcon} />
          </Pressable>
        </View>
        <View testID="toprow" style={styles.topRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <CardStack
              key={i}
              testID={`top-stack-${i}`}
              index={i}
              feathered
              showCount={false}
              playableTopCard={isTopCardPlayable(i)}
              showPlayableIndicator={appSettings.showPlayableIndicators}
              onPress={
                isTopCardPlayable(i) ? () => handleTopCardPress(i) : undefined
              }
              stack={topStacks[i]}
            />
          ))}
        </View>
        <View
          testID="bottomrow"
          style={[styles.bottomRow, { marginBottom: bottomOffset }]}
        >
          <CardStack
            testID="deck-stack"
            index={0}
            containerStyle={styles.bottomStack}
            stack={deckStack}
            onStackPress={startDeal}
            showCount={appSettings.showStackCounts}
            defaultBackStyle={appSettings.cardBackStyle}
          />
          <View style={styles.actionColumn}>
            <Pressable
              testID="deal-button"
              style={styles.dealButton}
              onPress={handlePrimaryButtonPress}
              disabled={isDealButtonDisabled}
              accessibilityState={{ disabled: isDealButtonDisabled }}
            >
              <Text style={styles.dealButtonText}>
                {isReadyToDealAgain ? 'New Game' : 'Deal'}
              </Text>
            </Pressable>
            <Pressable
              testID="undo-button"
              style={[
                styles.dealButton,
                styles.undoButton,
                isUndoButtonDisabled && styles.disabledButton,
              ]}
              onPress={handleUndo}
              disabled={isUndoButtonDisabled}
              accessibilityState={{ disabled: isUndoButtonDisabled }}
            >
              <Text
                style={[
                  styles.dealButtonText,
                  isUndoButtonDisabled && styles.disabledButtonText,
                ]}
              >
                Undo
              </Text>
            </Pressable>
          </View>
          <CardStack
            testID="discard-stack"
            index={1}
            containerStyle={styles.bottomStack}
            stack={discardStack}
            showCount={appSettings.showStackCounts}
            defaultBackStyle={appSettings.cardBackStyle}
          />
        </View>
        <SettingsModal
          visible={isSettingsVisible}
          settings={appSettings}
          stats={settingsStats}
          appVersion={APP_VERSION ?? '1.0.0'}
          onClose={handleCloseSettings}
          onClearStatistics={handleClearStatistics}
          onTogglePlayableIndicators={handleTogglePlayableIndicators}
          onToggleStackCounts={handleToggleStackCounts}
          onSelectCardBackStyle={handleSelectCardBackStyle}
        />
        <Modal
          testID="game-over-modal"
          transparent
          animationType="fade"
          visible={gameOverResult !== null}
          onRequestClose={handleDismissGameOver}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Game Over</Text>
              <Text style={styles.modalMessage}>
                {gameOverResult === 'win'
                  ? 'Congratulations! You won'
                  : 'Sorry, try again'}
              </Text>
              <View style={styles.modalStatsWrapper}>
                <StatsSummaryCard
                  testID="game-over-stats"
                  stats={gameOverStats ?? settingsStats}
                  fallbackStats={EMPTY_STATS}
                />
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  testID="deal-again-button"
                  style={[styles.modalButton, styles.modalPrimaryButton]}
                  onPress={handleDealAgain}
                >
                  <Text
                    style={[styles.modalButtonText, styles.modalPrimaryText]}
                  >
                    New Game
                  </Text>
                </Pressable>
                <Pressable
                  testID="dismiss-game-over-button"
                  style={styles.modalButton}
                  onPress={handleDismissGameOver}
                >
                  <Text style={styles.modalButtonText}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  bottomRow: {
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  bottomStack: {
    flex: 0,
    width: '26%',
    maxWidth: 120,
    minWidth: 72,
  },
  dealButton: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#2E8B57',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionColumn: {
    flex: 0,
    width: '34%',
    minWidth: 110,
    maxWidth: 160,
    marginHorizontal: 8,
    marginBottom: 8,
    alignItems: 'stretch',
  },
  undoButton: {
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#7AA58E',
  },
  dealButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  disabledButtonText: {
    color: '#E6EFEA',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 24, 15, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    backgroundColor: '#173A2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingTop: 18,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: 'hidden',
  },
  modalTitle: {
    color: '#F6F1E6',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 18,
  },
  modalMessage: {
    marginTop: 8,
    color: '#D7E4DB',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  modalStatsWrapper: {
    marginHorizontal: 18,
    marginBottom: 18,
  },
  modalActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  modalButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4ECE0',
  },
  modalPrimaryButton: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(97, 74, 45, 0.14)',
  },
  modalButtonText: {
    fontSize: 17,
    color: '#274537',
    fontWeight: '600',
  },
  modalPrimaryText: {
    fontWeight: '700',
  },
  settingsButton: {
    padding: 6,
  },
  settingsIcon: {
    fontSize: 26,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 30,
  },
  animatedCard: {
    position: 'absolute',
    width: 60,
    height: 84,
    zIndex: 1000,
  },
  bottomCard: {
    width: '18%',
    aspectRatio: 0.714,
  },
});

export default AcesUpTable;
