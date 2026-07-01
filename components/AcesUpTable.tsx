import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  LayoutChangeEvent,
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
import Card from './Card';
import {
  DEAL_ANIMATION_DURATION_MS,
  DEAL_START_OPACITY,
  DEAL_START_SCALE,
  DEAL_STAGGER_MS,
  DEFAULT_ENABLE_CARD_ANIMATIONS,
  MOVE_ANIMATION_DURATION_MS,
  TOP_STACK_FEATHER_OFFSET,
} from '../utils/cardAnimations';

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
  enableCardAnimations?: boolean;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FlightCard = {
  id: string;
  card: StackCard;
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  width: number;
  height: number;
  targetX: number;
  targetY: number;
  durationMs: number;
  delayMs: number;
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
  enableCardAnimations,
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
  const [flightCards, setFlightCards] = useState<FlightCard[]>([]);
  const [isAnimationActive, setIsAnimationActive] = useState(false);
  const hasRecordedGameEndRef = useRef(false);
  const isMountedRef = useRef(true);
  const topRowRectRef = useRef<Rect | null>(null);
  const bottomRowRectRef = useRef<Rect | null>(null);
  const topStackLocalRectsRef = useRef<Array<Rect | null>>([
    null,
    null,
    null,
    null,
  ]);
  const deckLocalRectRef = useRef<Rect | null>(null);
  const discardLocalRectRef = useRef<Rect | null>(null);
  const animationBatchIdRef = useRef(0);
  const runningAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const testAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const shouldAnimateCards =
    enableCardAnimations ?? DEFAULT_ENABLE_CARD_ANIMATIONS;
  const useNativeAnimationDriver = enableCardAnimations === undefined;

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

  const toRect = (event: LayoutChangeEvent): Rect => ({
    x: event.nativeEvent.layout.x,
    y: event.nativeEvent.layout.y,
    width: event.nativeEvent.layout.width,
    height: event.nativeEvent.layout.height,
  });

  const getTopStackRect = (stackIndex: number): Rect | null => {
    const row = topRowRectRef.current;
    const local = topStackLocalRectsRef.current[stackIndex];
    if (!row || !local) {
      return null;
    }

    return {
      x: row.x + local.x,
      y: row.y + local.y,
      width: local.width,
      height: local.height,
    };
  };

  const getDeckRect = (): Rect | null => {
    const row = bottomRowRectRef.current;
    const local = deckLocalRectRef.current;
    if (!row || !local) {
      return null;
    }

    return {
      x: row.x + local.x,
      y: row.y + local.y,
      width: local.width,
      height: local.height,
    };
  };

  const getDiscardRect = (): Rect | null => {
    const row = bottomRowRectRef.current;
    const local = discardLocalRectRef.current;
    if (!row || !local) {
      return null;
    }

    return {
      x: row.x + local.x,
      y: row.y + local.y,
      width: local.width,
      height: local.height,
    };
  };

  const cancelAnimationBatch = () => {
    animationBatchIdRef.current += 1;
    runningAnimationRef.current?.stop();
    runningAnimationRef.current = null;
    if (testAnimationTimeoutRef.current) {
      clearTimeout(testAnimationTimeoutRef.current);
      testAnimationTimeoutRef.current = null;
    }
    setFlightCards([]);
    setIsAnimationActive(false);
  };

  const runFlightAnimation = (
    items: Array<{
      card: StackCard;
      from: Rect;
      to: Rect;
      durationMs: number;
      delayMs: number;
    }>,
    onComplete: () => void,
  ) => {
    if (!items.length) {
      onComplete();
      return;
    }

    const batchId = animationBatchIdRef.current + 1;
    animationBatchIdRef.current = batchId;

    const cards: FlightCard[] = items.map((item, index) => ({
      id: `${batchId}-${item.card.suit}-${item.card.rank}-${index}`,
      card: item.card,
      x: new Animated.Value(item.from.x),
      y: new Animated.Value(item.from.y),
      scale: new Animated.Value(DEAL_START_SCALE),
      opacity: new Animated.Value(DEAL_START_OPACITY),
      width: item.from.width,
      height: item.from.height,
      targetX: item.to.x,
      targetY: item.to.y,
      durationMs: item.durationMs,
      delayMs: item.delayMs,
    }));

    setFlightCards(cards);
    setIsAnimationActive(true);

    const finishAnimationBatch = (batchIdForFinish: number) => {
      onComplete();

      if (!useNativeAnimationDriver) {
        if (
          !isMountedRef.current ||
          animationBatchIdRef.current !== batchIdForFinish
        ) {
          return;
        }
        setFlightCards([]);
        setIsAnimationActive(false);
        return;
      }

      // Fade the overlay out after commit so the final handoff is not a hard visual cut.
      requestAnimationFrame(() => {
        if (
          !isMountedRef.current ||
          animationBatchIdRef.current !== batchIdForFinish
        ) {
          return;
        }

        const handoffFade = Animated.parallel(
          cards.map(card =>
            Animated.timing(card.opacity, {
              toValue: 0,
              duration: 80,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ),
        );

        runningAnimationRef.current = handoffFade;
        handoffFade.start(({ finished }) => {
          runningAnimationRef.current = null;
          if (!finished) {
            return;
          }

          if (
            !isMountedRef.current ||
            animationBatchIdRef.current !== batchIdForFinish
          ) {
            return;
          }

          setFlightCards([]);
          setIsAnimationActive(false);
        });
      });
    };

    if (!useNativeAnimationDriver) {
      const totalDuration = cards.reduce(
        (max, card) => Math.max(max, card.delayMs + card.durationMs),
        0,
      );

      const batchIdForTimeout = batchId;
      testAnimationTimeoutRef.current = setTimeout(() => {
        testAnimationTimeoutRef.current = null;
        if (
          !isMountedRef.current ||
          animationBatchIdRef.current !== batchIdForTimeout
        ) {
          return;
        }

        finishAnimationBatch(batchIdForTimeout);
      }, totalDuration);
      return;
    }

    const composite = Animated.parallel(
      cards.map(card =>
        Animated.sequence([
          Animated.delay(card.delayMs),
          Animated.parallel([
            Animated.timing(card.x, {
              toValue: card.targetX,
              duration: card.durationMs,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: useNativeAnimationDriver,
            }),
            Animated.timing(card.y, {
              toValue: card.targetY,
              duration: card.durationMs,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: useNativeAnimationDriver,
            }),
            Animated.timing(card.scale, {
              toValue: 1,
              duration: card.durationMs,
              easing: Easing.out(Easing.quad),
              useNativeDriver: useNativeAnimationDriver,
            }),
            Animated.timing(card.opacity, {
              toValue: 1,
              duration: card.durationMs,
              easing: Easing.linear,
              useNativeDriver: useNativeAnimationDriver,
            }),
          ]),
        ]),
      ),
    );

    runningAnimationRef.current = composite;
    composite.start(({ finished }) => {
      runningAnimationRef.current = null;
      if (!finished) {
        return;
      }

      if (!isMountedRef.current || animationBatchIdRef.current !== batchId) {
        return;
      }

      finishAnimationBatch(batchId);
    });
  };

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
      cancelAnimationBatch();
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
    if (isAnimationActive) {
      return;
    }

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
  }, [
    isAnimationActive,
    isGameEnded,
    isWinningEndState,
    gameOverDismissed,
    gameOverResult,
  ]);

  useEffect(() => {
    if (!gameOverResult) {
      return;
    }

    setGameOverStats(settingsStats);
  }, [gameOverResult, settingsStats]);

  const startDeal = () => {
    if (deckStack.length < 4 || isAnimationActive) return;

    setUndoStack(prev => [...prev, captureSnapshot()]);

    const cardsToDeal = deckStack
      .slice(0, 4)
      .map(c => ({ ...c, faceUp: true }));

    const sourceRect = getDeckRect();
    const targetRects = Array.from({ length: 4 }).map((_, stackIndex) => {
      const stackRect = getTopStackRect(stackIndex);
      if (!stackRect) {
        return null;
      }

      return {
        ...stackRect,
        y:
          stackRect.y + topStacks[stackIndex].length * TOP_STACK_FEATHER_OFFSET,
      };
    });

    const canAnimateDeal =
      shouldAnimateCards && sourceRect && targetRects.every(Boolean);

    setDeckStack(prev => prev.slice(4));

    if (!canAnimateDeal) {
      setTopStacks(prev => {
        const next = [...prev];
        for (let i = 0; i < 4; i++) {
          next[i] = [cardsToDeal[i], ...next[i]];
        }
        return next;
      });
      return;
    }

    runFlightAnimation(
      cardsToDeal.map((card, index) => ({
        card,
        from: sourceRect,
        to: targetRects[index] as Rect,
        durationMs: DEAL_ANIMATION_DURATION_MS,
        delayMs: index * DEAL_STAGGER_MS,
      })),
      () => {
        setTopStacks(prev => {
          const next = [...prev];
          for (let i = 0; i < 4; i++) {
            next[i] = [cardsToDeal[i], ...next[i]];
          }
          return next;
        });
      },
    );
  };

  const handleTopCardPress = (stackIndex: number) => {
    if (isAnimationActive) {
      return;
    }

    const action = getTopCardPlayableAction(stackIndex);
    if (!action) return;

    const sourceStack = topStacks[stackIndex];
    if (!sourceStack.length) return;

    const playedCard = sourceStack[0];
    const sourceRect = getTopStackRect(stackIndex);
    const sourceTopCardRect = sourceRect
      ? {
          ...sourceRect,
          y: sourceRect.y + (sourceStack.length - 1) * TOP_STACK_FEATHER_OFFSET,
        }
      : null;

    let relocateTargetIndex = -1;
    let targetRect: Rect | null = null;
    if (action === 'relocate') {
      relocateTargetIndex = topStacks.findIndex(
        (stack, index) => index !== stackIndex && stack.length === 0,
      );
      if (relocateTargetIndex !== -1) {
        const relocateTargetRect = getTopStackRect(relocateTargetIndex);
        if (relocateTargetRect) {
          targetRect = {
            ...relocateTargetRect,
            y:
              relocateTargetRect.y +
              topStacks[relocateTargetIndex].length * TOP_STACK_FEATHER_OFFSET,
          };
        }
      }
    }

    if (action === 'discard') {
      targetRect = getDiscardRect();
    }

    setUndoStack(prev => [...prev, captureSnapshot()]);

    setTopStacks(prev => {
      const nextStacks = [...prev];
      nextStacks[stackIndex] = nextStacks[stackIndex].slice(1);

      return nextStacks;
    });

    const canAnimateMove =
      shouldAnimateCards && sourceTopCardRect && targetRect !== null;

    if (!canAnimateMove) {
      if (action === 'relocate' && relocateTargetIndex !== -1) {
        setTopStacks(prev => {
          const nextStacks = [...prev];
          nextStacks[relocateTargetIndex] = [
            playedCard,
            ...nextStacks[relocateTargetIndex],
          ];
          return nextStacks;
        });
      }

      if (action === 'discard') {
        setDiscardStack(prev => [{ ...playedCard, faceUp: false }, ...prev]);
      }
      return;
    }

    const moveTargetRect = targetRect;
    if (!moveTargetRect) {
      return;
    }

    runFlightAnimation(
      [
        {
          card: { ...playedCard, faceUp: true },
          from: sourceTopCardRect,
          to: moveTargetRect,
          durationMs: MOVE_ANIMATION_DURATION_MS,
          delayMs: 0,
        },
      ],
      () => {
        if (action === 'relocate' && relocateTargetIndex !== -1) {
          setTopStacks(prev => {
            const nextStacks = [...prev];
            nextStacks[relocateTargetIndex] = [
              playedCard,
              ...nextStacks[relocateTargetIndex],
            ];
            return nextStacks;
          });
          return;
        }

        if (action === 'discard') {
          setDiscardStack(prev => [{ ...playedCard, faceUp: false }, ...prev]);
        }
      },
    );
  };

  const handleUndo = () => {
    if (isAnimationActive) {
      return;
    }

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
    cancelAnimationBatch();
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
    cancelAnimationBatch();

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
    if (isAnimationActive) {
      return;
    }

    if (isReadyToDealAgain) {
      handleDealAgain();
      return;
    }

    startDeal();
  };

  const isDealButtonDisabled =
    isAnimationActive || (!isReadyToDealAgain && deckStack.length < 4);
  const isUndoButtonDisabled =
    isAnimationActive || undoStack.length === 0 || isReadyToDealAgain;

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
        <View
          testID="toprow"
          style={styles.topRow}
          onLayout={event => {
            topRowRectRef.current = toRect(event);
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <CardStack
              key={i}
              testID={`top-stack-${i}`}
              index={i}
              onLayout={event => {
                topStackLocalRectsRef.current[i] = toRect(event);
              }}
              feathered
              showCount={false}
              playableTopCard={isTopCardPlayable(i)}
              playableCardAction={getTopCardPlayableAction(i) ?? undefined}
              showPlayableIndicator={appSettings.showPlayableIndicators}
              onPress={
                !isAnimationActive && isTopCardPlayable(i)
                  ? () => handleTopCardPress(i)
                  : undefined
              }
              stack={topStacks[i]}
            />
          ))}
        </View>
        <View
          testID="bottomrow"
          style={[styles.bottomRow, { marginBottom: bottomOffset }]}
          onLayout={event => {
            bottomRowRectRef.current = toRect(event);
          }}
        >
          <CardStack
            testID="deck-stack"
            index={0}
            onLayout={event => {
              deckLocalRectRef.current = toRect(event);
            }}
            containerStyle={styles.bottomStack}
            stack={deckStack}
            onStackPress={isAnimationActive ? undefined : startDeal}
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
            onLayout={event => {
              discardLocalRectRef.current = toRect(event);
            }}
            containerStyle={styles.bottomStack}
            stack={discardStack}
            showCount={appSettings.showStackCounts}
            defaultBackStyle={appSettings.cardBackStyle}
          />
        </View>
        <View pointerEvents="none" style={styles.animationLayer}>
          {flightCards.map(flightCard => (
            <Animated.View
              key={flightCard.id}
              testID="animated-flight-card"
              style={[
                styles.animatedCard,
                {
                  width: flightCard.width,
                  height: flightCard.height,
                  opacity: flightCard.opacity,
                  transform: [
                    { translateX: flightCard.x },
                    { translateY: flightCard.y },
                    { scale: flightCard.scale },
                  ],
                },
              ]}
            >
              <Card
                suit={flightCard.card.suit}
                rank={flightCard.card.rank}
                faceUp={flightCard.card.faceUp ?? true}
                backStyle={
                  flightCard.card.backStyle ?? appSettings.cardBackStyle
                }
              />
            </Animated.View>
          ))}
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
  animationLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 1500,
  },
  animatedCard: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1501,
  },
  bottomCard: {
    width: '18%',
    aspectRatio: 0.714,
  },
});

export default AcesUpTable;
