import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

type Suit = 'C' | 'D' | 'H' | 'S';
type BackStyle = 'Red' | 'Blue';

type Props = {
  suit: Suit;
  rank: number; // 1-13 (Ace through King)
  faceUp: boolean;
  backStyle?: BackStyle;
  testID?: string;
  showPlayable?: boolean;
};

const faceUpImages = {
  C: {
    1: require('../assets/cards/C-1.png'),
    2: require('../assets/cards/C-2.png'),
    3: require('../assets/cards/C-3.png'),
    4: require('../assets/cards/C-4.png'),
    5: require('../assets/cards/C-5.png'),
    6: require('../assets/cards/C-6.png'),
    7: require('../assets/cards/C-7.png'),
    8: require('../assets/cards/C-8.png'),
    9: require('../assets/cards/C-9.png'),
    10: require('../assets/cards/C-10.png'),
    11: require('../assets/cards/C-11.png'),
    12: require('../assets/cards/C-12.png'),
    13: require('../assets/cards/C-13.png'),
  },
  D: {
    1: require('../assets/cards/D-1.png'),
    2: require('../assets/cards/D-2.png'),
    3: require('../assets/cards/D-3.png'),
    4: require('../assets/cards/D-4.png'),
    5: require('../assets/cards/D-5.png'),
    6: require('../assets/cards/D-6.png'),
    7: require('../assets/cards/D-7.png'),
    8: require('../assets/cards/D-8.png'),
    9: require('../assets/cards/D-9.png'),
    10: require('../assets/cards/D-10.png'),
    11: require('../assets/cards/D-11.png'),
    12: require('../assets/cards/D-12.png'),
    13: require('../assets/cards/D-13.png'),
  },
  H: {
    1: require('../assets/cards/H-1.png'),
    2: require('../assets/cards/H-2.png'),
    3: require('../assets/cards/H-3.png'),
    4: require('../assets/cards/H-4.png'),
    5: require('../assets/cards/H-5.png'),
    6: require('../assets/cards/H-6.png'),
    7: require('../assets/cards/H-7.png'),
    8: require('../assets/cards/H-8.png'),
    9: require('../assets/cards/H-9.png'),
    10: require('../assets/cards/H-10.png'),
    11: require('../assets/cards/H-11.png'),
    12: require('../assets/cards/H-12.png'),
    13: require('../assets/cards/H-13.png'),
  },
  S: {
    1: require('../assets/cards/S-1.png'),
    2: require('../assets/cards/S-2.png'),
    3: require('../assets/cards/S-3.png'),
    4: require('../assets/cards/S-4.png'),
    5: require('../assets/cards/S-5.png'),
    6: require('../assets/cards/S-6.png'),
    7: require('../assets/cards/S-7.png'),
    8: require('../assets/cards/S-8.png'),
    9: require('../assets/cards/S-9.png'),
    10: require('../assets/cards/S-10.png'),
    11: require('../assets/cards/S-11.png'),
    12: require('../assets/cards/S-12.png'),
    13: require('../assets/cards/S-13.png'),
  },
} as const;

type FaceUpImageMap = Record<Suit, Record<number, unknown>>;

const backImages = {
  Red: require('../assets/cards/Back-R.png'),
  Blue: require('../assets/cards/Back-B.png'),
} as const;

const Card: React.FC<Props> = ({
  suit,
  rank,
  faceUp,
  backStyle = 'Red',
  testID,
  showPlayable = false,
}) => {
  const getImageSource = () => {
    if (faceUp) {
      return (faceUpImages as FaceUpImageMap)[suit][rank];
    }

    return backImages[backStyle];
  };

  return (
    <View testID={testID} style={styles.container}>
      <Image
        testID={testID ? `${testID}-image` : undefined}
        accessibilityLabel={faceUp ? undefined : `card-back-${backStyle}`}
        source={getImageSource()}
        style={styles.cardImage}
        resizeMode="contain"
      />
      {faceUp && (
        <View
          testID={testID ? `${testID}-faceup-tint` : undefined}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.faceUpTint]}
        />
      )}
      {showPlayable && (
        <View
          testID={testID ? `${testID}-playable-dot` : undefined}
          style={styles.highlightDot}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
  },
  cardImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  faceUpTint: {
    backgroundColor: 'rgba(230, 213, 184, 0.25)',
  },
  highlightDot: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 7,
    backgroundColor: '#4A90E2',
    left: 5,
    bottom: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default Card;
