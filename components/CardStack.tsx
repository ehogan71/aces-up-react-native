import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  ViewStyle,
  Text,
  Pressable,
} from 'react-native';
import Card from './Card';

type Suit = 'C' | 'D' | 'H' | 'S';
type BackStyle = 'Red' | 'Blue';

type StackCard = {
  suit: Suit;
  rank: number;
  faceUp?: boolean;
  backStyle?: BackStyle;
};

export type CardStackHandle = {
  push: (c: StackCard) => void;
  pop: () => StackCard | undefined;
  size: () => number;
};

type Props = {
  testID?: string;
  index?: number;
  faceUp?: boolean;
  backStyle?: BackStyle;
  defaultBackStyle?: BackStyle;
  containerStyle?: ViewStyle;
  onLayout?: (e: LayoutChangeEvent) => void;
  initialStack?: StackCard[];
  stack?: StackCard[];
  feathered?: boolean;
  playableTopCard?: boolean;
  showPlayableIndicator?: boolean;
  showCount?: boolean;
  onPress?: () => void;
  onStackPress?: () => void;
};

const CardStack = forwardRef<CardStackHandle, Props>(
  (
    {
      testID = 'cardstack',
      index,
      faceUp = true,
      backStyle = 'Red',
      defaultBackStyle = 'Red',
      containerStyle,
      onLayout,
      initialStack,
      stack: controlledStack,
      feathered = false,
      playableTopCard = false,
      showPlayableIndicator = true,
      showCount = true,
      onPress,
      onStackPress,
    },
    ref,
  ) => {
    const [internalStack, setInternalStack] = useState<StackCard[]>(() => {
      if (initialStack && initialStack.length) return [...initialStack];
      return [];
    });
    const stack =
      controlledStack !== undefined ? controlledStack : internalStack;
    const stackRef = useRef<StackCard[]>(stack);

    useEffect(() => {
      if (initialStack) setInternalStack([...initialStack]);
    }, [initialStack]);

    useEffect(() => {
      stackRef.current = stack;
    }, [stack]);

    useImperativeHandle(
      ref,
      () => ({
        push: (c: StackCard) => {
          const next = [c, ...stackRef.current];
          stackRef.current = next;
          setInternalStack(next);
        },
        pop: () => {
          const [popped, ...rest] = stackRef.current;
          stackRef.current = rest;
          setInternalStack(rest);
          return popped;
        },
        size: () => stackRef.current.length,
      }),
      [],
    );

    const renderStack = () => {
      // feathered: show all cards with a larger offset so the top card sits lower
      // non-feathered: show all cards with no offset (stacked directly)
      const items = feathered ? stack : stack.slice(0);
      const offset = feathered ? 20 : 0;
      return (
        <View style={styles.stackInner}>
          {items.map((c, idx) => {
            const isTop = idx === 0;
            const shouldHighlight =
              isTop && playableTopCard && showPlayableIndicator;
            const cardTestID = testID
              ? `${testID}-card${idx === 0 ? '' : `-${idx}`}`
              : undefined;
            const card = (
              <Card
                suit={c.suit}
                rank={c.rank}
                faceUp={c.faceUp ?? true}
                backStyle={c.backStyle ?? defaultBackStyle}
                testID={cardTestID}
                showPlayable={shouldHighlight}
              />
            );

            return (
              <View
                key={`${c.suit}-${c.rank}-${idx}`}
                style={[
                  styles.featherItem,
                  {
                    top: (items.length - 1 - idx) * offset,
                    zIndex: items.length - idx,
                  },
                ]}
              >
                {isTop && onPress ? (
                  <Pressable
                    testID={cardTestID ? `${cardTestID}-pressable` : undefined}
                    onPress={onPress}
                    style={styles.pressable}
                  >
                    {card}
                  </Pressable>
                ) : (
                  card
                )}
              </View>
            );
          })}
          {showCount && stack.length > 0 && (
            <View style={styles.countBadge} testID={`${testID}-count`}>
              <Text style={styles.countText}>{stack.length}</Text>
            </View>
          )}
        </View>
      );
    };

    const StackContainer = onStackPress ? Pressable : View;

    return (
      <StackContainer
        testID={testID}
        accessibilityLabel={
          index !== undefined ? `cardstack-${index}` : 'cardstack'
        }
        onLayout={onLayout}
        onPress={onStackPress}
        style={[
          styles.card,
          stack.length > 0 && styles.cardNoOutline,
          containerStyle,
        ]}
      >
        {(stack.length > 0 || showCount) && renderStack()}
      </StackContainer>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 0.714, // playing card width/height ratio (approx 2.5/3.5)
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    backgroundColor: 'transparent',
    marginHorizontal: 2,
    overflow: 'visible',
  },
  cardNoOutline: {
    borderWidth: 0,
  },
  stackInner: {
    position: 'relative',
    minHeight: '100%',
  },
  featherItem: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  pressable: {
    flex: 1,
  },
  countBadge: {
    position: 'absolute',
    right: 6,
    top: 6,
    minWidth: 28,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    zIndex: 999,
    elevation: 9,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default CardStack;
