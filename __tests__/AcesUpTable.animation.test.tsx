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

const seedAnimationLayouts = async (rendered: ReturnType<typeof render>) => {
  await rendered.findByTestId('toprow');
  await rendered.findByTestId('bottomrow');
  await rendered.findByTestId('top-stack-0');
  await rendered.findByTestId('top-stack-1');
  await rendered.findByTestId('top-stack-2');
  await rendered.findByTestId('top-stack-3');
  await rendered.findByTestId('deck-stack');
  await rendered.findByTestId('discard-stack');

  emitLayout(rendered, 'toprow', 0, 90, 360, 120);
  emitLayout(rendered, 'bottomrow', 0, 470, 360, 120);

  emitLayout(rendered, 'top-stack-0', 10, 0, 70, 98);
  emitLayout(rendered, 'top-stack-1', 100, 0, 70, 98);
  emitLayout(rendered, 'top-stack-2', 190, 0, 70, 98);
  emitLayout(rendered, 'top-stack-3', 280, 0, 70, 98);

  emitLayout(rendered, 'deck-stack', 0, 0, 82, 116);
  emitLayout(rendered, 'discard-stack', 278, 0, 82, 116);
};

describe('AcesUpTable animations', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders transient deal overlay cards before committing to top stacks', async () => {
    const initialDeckStack = [
      createCard('C', 1),
      createCard('D', 2),
      createCard('H', 3),
      createCard('S', 4),
      createCard('C', 5),
      createCard('D', 6),
    ];

    const rendered = await render(
      <AcesUpTable
        enableCardAnimations
        initialDeckStack={initialDeckStack}
        initialTopStacks={[[], [], [], []]}
      />,
    );

    await seedAnimationLayouts(rendered);

    fireEvent.press(rendered.getByTestId('deal-button'));

    await waitFor(() => {
      expect(rendered.queryAllByTestId('animated-flight-card')).toHaveLength(4);
      expect(rendered.queryByTestId('top-stack-0-card')).toBeNull();
      expect(
        rendered.getByTestId('deck-stack-count').props.children.props.children,
      ).toBe(2);
    });

    await waitFor(
      () => {
        expect(rendered.queryAllByTestId('animated-flight-card')).toHaveLength(
          0,
        );
        expect(rendered.getByTestId('top-stack-0-card')).toBeTruthy();
        expect(rendered.getByTestId('top-stack-1-card')).toBeTruthy();
        expect(rendered.getByTestId('top-stack-2-card')).toBeTruthy();
        expect(rendered.getByTestId('top-stack-3-card')).toBeTruthy();
      },
      { timeout: 1600 },
    );

    rendered.unmount();
  });
});
