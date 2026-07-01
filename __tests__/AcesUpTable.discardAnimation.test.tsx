import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('../assets/table-background.png', () => 1);

import AcesUpTable from '../components/AcesUpTable';

type Suit = 'C' | 'D' | 'H' | 'S';

const createCard = (suit: Suit, rank: number) => ({
  suit,
  rank,
  faceUp: true as const,
});

const emitLayout = (
  rendered: ReturnType<typeof render>,
  testID: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  fireEvent(rendered.getByTestId(testID), 'layout', {
    nativeEvent: { layout: { x, y, width, height } },
  });
};

const seedAnimationLayouts = (rendered: ReturnType<typeof render>) => {
  emitLayout(rendered, 'toprow', 0, 90, 360, 120);
  emitLayout(rendered, 'bottomrow', 0, 470, 360, 120);

  emitLayout(rendered, 'top-stack-0', 10, 0, 70, 98);
  emitLayout(rendered, 'top-stack-1', 100, 0, 70, 98);
  emitLayout(rendered, 'top-stack-2', 190, 0, 70, 98);
  emitLayout(rendered, 'top-stack-3', 280, 0, 70, 98);

  emitLayout(rendered, 'deck-stack', 0, 0, 82, 116);
  emitLayout(rendered, 'discard-stack', 278, 0, 82, 116);
};

describe('AcesUpTable discard animation', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('animates discard with transient overlay before discard stack is committed', async () => {
    const initialTopStacks = [
      [createCard('C', 5)],
      [createCard('C', 8)],
      [],
      [],
    ];

    const rendered = await render(
      <AcesUpTable
        enableCardAnimations
        initialTopStacks={initialTopStacks}
        initialDeckStack={[]}
      />,
    );

    seedAnimationLayouts(rendered);

    fireEvent.press(rendered.getByTestId('top-stack-0-card-pressable'));

    await waitFor(() => {
      expect(rendered.queryAllByTestId('animated-flight-card')).toHaveLength(1);
      expect(rendered.queryByTestId('discard-stack-count')).toBeNull();
    });

    await waitFor(
      () => {
        expect(rendered.queryAllByTestId('animated-flight-card')).toHaveLength(
          0,
        );
        expect(
          rendered.getByTestId('discard-stack-count').props.children.props
            .children,
        ).toBe(1);
      },
      { timeout: 1200 },
    );
  });
});
