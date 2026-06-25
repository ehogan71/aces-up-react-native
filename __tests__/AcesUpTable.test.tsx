import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  act,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

// Mock the static asset so Jest doesn't try to resolve the real file
jest.mock('../assets/table-background.png', () => 1);

import AcesUpTable from '../components/AcesUpTable';
import { getGameStats } from '../utils/gameStats';

// Integration tests covering gameplay flows, modal behavior, and persistence side effects.
describe('AcesUpTable', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders ImageBackground and uses the background image', async () => {
    const { getByTestId } = await render(<AcesUpTable />);

    const img = getByTestId('acesup-background');
    expect(img).toBeDefined();
    expect(img.props.source).toBeDefined();
    expect(img.props.source).toEqual(1); // The mocked value for the image
    expect(img.props.resizeMode).toBe('cover');
  });

  it('applies correct stylesheet values to background and container', async () => {
    const { getByTestId } = await render(<AcesUpTable />);
    const img = getByTestId('acesup-background');
    const bgStyle = StyleSheet.flatten(img.props.style);

    expect(bgStyle).toMatchObject({
      width: '100%',
      height: '100%',
    });

    const container = getByTestId('acesup-container');
    const containerStyle = StyleSheet.flatten(container.props.style);
    expect(containerStyle).toMatchObject({ flex: 1 });
  });

  it('renders four CardStack components near the top', async () => {
    const { getByTestId } = await render(<AcesUpTable />);

    for (let i = 0; i < 4; i++) {
      const stack = getByTestId(`top-stack-${i}`);
      expect(stack).toBeTruthy();
      const style = StyleSheet.flatten(stack.props.style);
      expect(style).toMatchObject({ borderWidth: 2, aspectRatio: 0.714 });
    }

    // Ensure the topRow exists and is a row layout
    const topRow = getByTestId('toprow');
    expect(topRow).toBeTruthy();
    // header row carries the safe-area margin; toprow no longer has marginTop
    const headerRow = getByTestId('header-row');
    const headerStyle = StyleSheet.flatten(headerRow.props.style);
    // With mocked safe area insets (top=0) the top offset should be Math.max(12, 0+12) === 12
    expect(headerStyle.marginTop).toBe(12);
  });

  it('applies face-up tint to all face-up top stacks', async () => {
    const initialTopStacks = [
      [{ suit: 'C', rank: 5, faceUp: true }],
      [{ suit: 'D', rank: 6, faceUp: true }],
      [{ suit: 'H', rank: 7, faceUp: true }],
      [{ suit: 'S', rank: 8, faceUp: true }],
    ];

    const { getByTestId } = await render(
      <AcesUpTable initialTopStacks={initialTopStacks} initialDeckStack={[]} />,
    );

    expect(getByTestId('top-stack-0-card-faceup-tint')).toBeTruthy();
    expect(getByTestId('top-stack-1-card-faceup-tint')).toBeTruthy();
    expect(getByTestId('top-stack-2-card-faceup-tint')).toBeTruthy();
    expect(getByTestId('top-stack-3-card-faceup-tint')).toBeTruthy();
  });

  it('respects non-zero safe area inset by increasing top offset', async () => {
    // Mock the safe area inset to simulate a device with a notch
    const safeArea = require('react-native-safe-area-context');
    const spy = jest
      .spyOn(safeArea, 'useSafeAreaInsets')
      .mockReturnValue({ top: 30, bottom: 0, left: 0, right: 0 });

    const AcesUpTableWithMockedInsets =
      require('../components/AcesUpTable').default;
    const { getByTestId } = await render(<AcesUpTableWithMockedInsets />);
    const headerRow = getByTestId('header-row');
    const headerStyle = StyleSheet.flatten(headerRow.props.style);

    // topOffset = Math.max(12, insets.top + 12) => Math.max(12, 30 + 12) = 42
    expect(headerStyle.marginTop).toBe(42);

    spy.mockRestore();
  });

  it('lets the deck stack deal cards when pressed', async () => {
    const { getByTestId } = await render(<AcesUpTable />);

    const deckStack = getByTestId('deck-stack');
    const beforeCount = getByTestId('deck-stack-count');
    expect(beforeCount.props.children.props.children).toBe(52);

    const undoButton = getByTestId('undo-button');
    expect(undoButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(deckStack);

    await waitFor(() => {
      const topCard = getByTestId('top-stack-0-card');
      expect(topCard).toBeTruthy();
      const afterCount = getByTestId('deck-stack-count');
      expect(afterCount.props.children.props.children).toBe(48);
      expect(getByTestId('undo-button').props.accessibilityState.disabled).toBe(
        false,
      );
    });
  });

  it('opens settings and shows current stats', async () => {
    const { getByTestId, getByText } = await render(<AcesUpTable />);

    await act(async () => {
      fireEvent.press(getByTestId('settings-button'));
    });

    await waitFor(() => {
      expect(getByTestId('settings-modal')).toBeTruthy();
      expect(getByText('Games started: 1')).toBeTruthy();
      expect(getByText('Games won/completed: 0/0 (0% won)')).toBeTruthy();
      expect(getByTestId('settings-app-info')).toBeTruthy();
      expect(getByText('AcesUp Solitaire Game')).toBeTruthy();
      expect(getByText('Developed by Ed Hogan')).toBeTruthy();
      expect(getByText('Powered by React Native')).toBeTruthy();
      expect(getByText('Version 1.0.0')).toBeTruthy();
    });
  });

  it('applies settings changes from the settings modal', async () => {
    const initialTopStacks = [
      [{ suit: 'C', rank: 5, faceUp: true }],
      [{ suit: 'C', rank: 8, faceUp: true }],
      [],
      [],
    ];

    const { getByTestId, getByText, queryByTestId } = await render(
      <AcesUpTable initialTopStacks={initialTopStacks} />,
    );

    expect(getByTestId('deck-stack-count')).toBeTruthy();
    expect(getByTestId('top-stack-0-card-playable-dot')).toBeTruthy();
    expect(getByTestId('deck-stack-card-image').props.accessibilityLabel).toBe(
      'card-back-Red',
    );

    await act(async () => {
      fireEvent.press(getByTestId('settings-button'));
    });

    await waitFor(() => {
      expect(getByTestId('settings-modal')).toBeTruthy();
      expect(getByTestId('settings-stats')).toBeTruthy();
      expect(getByText('Games started: 1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent(getByTestId('show-playable-switch'), 'valueChange', false);
      fireEvent(getByTestId('show-counts-switch'), 'valueChange', false);
      fireEvent.press(getByTestId('card-back-blue-button'));
    });

    await waitFor(() => {
      expect(queryByTestId('top-stack-0-card-playable-dot')).toBeNull();
      expect(queryByTestId('deck-stack-count')).toBeNull();
      expect(queryByTestId('discard-stack-count')).toBeNull();
      expect(
        getByTestId('deck-stack-card-image').props.accessibilityLabel,
      ).toBe('card-back-Blue');
    });
  });

  it('clears statistics from the settings modal', async () => {
    const losingTopStacks = [
      [{ suit: 'C' as const, rank: 2, faceUp: true }],
      [{ suit: 'D' as const, rank: 3, faceUp: true }],
      [{ suit: 'H' as const, rank: 4, faceUp: true }],
      [{ suit: 'S' as const, rank: 5, faceUp: true }],
    ];

    const { getByTestId, queryByTestId } = await render(
      <AcesUpTable initialTopStacks={losingTopStacks} initialDeckStack={[]} />,
    );

    await waitFor(() => {
      expect(getByTestId('game-over-modal')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('settings-button'));
    });

    await waitFor(() => {
      const settingsStats = getByTestId('settings-stats');
      expect(within(settingsStats).getByText('Games started: 1')).toBeTruthy();
      expect(
        within(settingsStats).getByText('Games won/completed: 0/1 (0% won)'),
      ).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('clear-statistics-button'));
    });

    await waitFor(() => {
      expect(queryByTestId('settings-modal')).toBeNull();
    });

    await waitFor(async () => {
      await expect(getGameStats()).resolves.toEqual({
        gamesStarted: 1,
        gamesFinished: 0,
        gamesWon: 0,
      });
    });

    await waitFor(() => {
      expect(queryByTestId('game-over-modal')).toBeNull();
      expect(
        getByTestId('deck-stack-count').props.children.props.children,
      ).toBe(52);
      expect(queryByTestId('top-stack-0-card')).toBeNull();
    });
  });

  it('records a started game in storage on initial render', async () => {
    await render(<AcesUpTable />);

    await waitFor(async () => {
      await expect(getGameStats()).resolves.toEqual({
        gamesStarted: 1,
        gamesFinished: 0,
        gamesWon: 0,
      });
    });
  });

  it('undoes the last deal action', async () => {
    const { getByTestId, queryByTestId } = await render(<AcesUpTable />);

    fireEvent.press(getByTestId('deal-button'));

    await waitFor(() => {
      expect(getByTestId('top-stack-0-card')).toBeTruthy();
    });

    fireEvent.press(getByTestId('undo-button'));

    await waitFor(() => {
      expect(queryByTestId('top-stack-0-card')).toBeNull();
      expect(
        getByTestId('deck-stack-count').props.children.props.children,
      ).toBe(52);
      expect(getByTestId('undo-button').props.accessibilityState.disabled).toBe(
        true,
      );
    });
  });

  it('moves a playable top card to discard when a higher matching suit exists', async () => {
    const initialTopStacks = [
      [{ suit: 'C', rank: 5, faceUp: true }],
      [{ suit: 'C', rank: 8, faceUp: true }],
      [],
      [],
    ];

    const { getByTestId, queryByTestId } = await render(
      <AcesUpTable initialTopStacks={initialTopStacks} />,
    );

    const pressable = getByTestId('top-stack-0-card-pressable');
    fireEvent.press(pressable);

    await waitFor(() => {
      const discardCount = getByTestId('discard-stack-count');
      expect(discardCount.props.children.props.children).toBe(1);
    });

    expect(queryByTestId('top-stack-0-card-pressable')).toBeNull();
  });

  it('relocates a playable top card to the leftmost empty stack when no higher matching suit exists', async () => {
    const initialTopStacks = [
      [
        { suit: 'D', rank: 6, faceUp: true },
        { suit: 'S', rank: 2, faceUp: true },
      ],
      [],
      [{ suit: 'H', rank: 2, faceUp: true }],
      [],
    ];

    const { getByTestId, queryByTestId } = await render(
      <AcesUpTable initialTopStacks={initialTopStacks} />,
    );

    const pressable = getByTestId('top-stack-0-card-pressable');
    fireEvent.press(pressable);

    await waitFor(() => {
      const relocatedStack = getByTestId('top-stack-1');
      expect(relocatedStack.props.children).toBeTruthy();
      expect(queryByTestId('top-stack-0-card-pressable')).toBeNull();
    });
  });

  it('does not mark a lone card as playable when another empty stack exists', async () => {
    const initialTopStacks = [
      [{ suit: 'S', rank: 9, faceUp: true }],
      [],
      [{ suit: 'H', rank: 3, faceUp: true }],
      [],
    ];

    const { queryByTestId } = await render(
      <AcesUpTable initialTopStacks={initialTopStacks} />,
    );

    expect(queryByTestId('top-stack-0-card-pressable')).toBeNull();
    expect(queryByTestId('top-stack-0-card-playable-dot')).toBeNull();
  });

  it('undoes the last play action', async () => {
    const initialTopStacks = [
      [{ suit: 'C', rank: 5, faceUp: true }],
      [{ suit: 'C', rank: 8, faceUp: true }],
      [],
      [],
    ];

    const { getByTestId, queryByTestId } = await render(
      <AcesUpTable initialTopStacks={initialTopStacks} />,
    );

    fireEvent.press(getByTestId('top-stack-0-card-pressable'));

    await waitFor(() => {
      expect(
        getByTestId('discard-stack-count').props.children.props.children,
      ).toBe(1);
    });

    fireEvent.press(getByTestId('undo-button'));

    await waitFor(() => {
      expect(queryByTestId('discard-stack-count')).toBeNull();
      expect(getByTestId('top-stack-0-card-pressable')).toBeTruthy();
    });
  });

  it('shows a losing game-over popup when deck is empty and no moves remain', async () => {
    const initialTopStacks = [
      [{ suit: 'C', rank: 2, faceUp: true }],
      [{ suit: 'D', rank: 3, faceUp: true }],
      [{ suit: 'H', rank: 4, faceUp: true }],
      [{ suit: 'S', rank: 5, faceUp: true }],
    ];

    const { getByText } = await render(
      <AcesUpTable initialTopStacks={initialTopStacks} initialDeckStack={[]} />,
    );

    await waitFor(() => {
      expect(getByText('Game Over')).toBeTruthy();
      expect(getByText('Sorry, try again')).toBeTruthy();
    });

    await waitFor(async () => {
      await expect(getGameStats()).resolves.toEqual({
        gamesStarted: 1,
        gamesFinished: 1,
        gamesWon: 0,
      });
    });
  });

  it('always shows stats in the game-over popup', async () => {
    const initialTopStacks = [
      [{ suit: 'C', rank: 2, faceUp: true }],
      [{ suit: 'D', rank: 3, faceUp: true }],
      [{ suit: 'H', rank: 4, faceUp: true }],
      [{ suit: 'S', rank: 5, faceUp: true }],
    ];

    const { getByTestId, getByText } = await render(
      <AcesUpTable initialTopStacks={initialTopStacks} initialDeckStack={[]} />,
    );

    await waitFor(() => {
      expect(getByText('Game Over')).toBeTruthy();
    });

    expect(getByTestId('game-over-stats')).toBeTruthy();

    await waitFor(() => {
      expect(getByTestId('game-over-stats')).toBeTruthy();
      expect(getByText('Games started: 1')).toBeTruthy();
      expect(getByText('Games won/completed: 0/1 (0% won)')).toBeTruthy();
    });
  });

  it('shows a winning game-over popup for one ace on each top stack', async () => {
    const initialTopStacks = [
      [{ suit: 'C', rank: 1, faceUp: true }],
      [{ suit: 'D', rank: 1, faceUp: true }],
      [{ suit: 'H', rank: 1, faceUp: true }],
      [{ suit: 'S', rank: 1, faceUp: true }],
    ];

    const { getByText } = await render(
      <AcesUpTable initialTopStacks={initialTopStacks} initialDeckStack={[]} />,
    );

    await waitFor(() => {
      expect(getByText('Game Over')).toBeTruthy();
      expect(getByText('Congratulations! You won')).toBeTruthy();
    });

    await waitFor(async () => {
      await expect(getGameStats()).resolves.toEqual({
        gamesStarted: 1,
        gamesFinished: 1,
        gamesWon: 1,
      });
    });
  });

  it('dismiss closes the game-over popup', async () => {
    const initialTopStacks = [
      [{ suit: 'C', rank: 2, faceUp: true }],
      [{ suit: 'D', rank: 3, faceUp: true }],
      [{ suit: 'H', rank: 4, faceUp: true }],
      [{ suit: 'S', rank: 5, faceUp: true }],
    ];

    const { getByText, getByTestId, queryByText } = await render(
      <AcesUpTable initialTopStacks={initialTopStacks} initialDeckStack={[]} />,
    );

    await waitFor(() => {
      expect(getByText('Game Over')).toBeTruthy();
    });

    fireEvent.press(getByTestId('dismiss-game-over-button'));
    await waitFor(() => {
      expect(queryByText('Game Over')).toBeNull();
      expect(getByText('New Game')).toBeTruthy();
      expect(getByTestId('undo-button').props.accessibilityState.disabled).toBe(
        true,
      );
      expect(getByTestId('deal-button').props.accessibilityState.disabled).toBe(
        false,
      );
    });
  });

  it('deal button starts a new game after dismissing game over', async () => {
    const initialTopStacks = [
      [{ suit: 'C', rank: 2, faceUp: true }],
      [{ suit: 'D', rank: 3, faceUp: true }],
      [{ suit: 'H', rank: 4, faceUp: true }],
      [{ suit: 'S', rank: 5, faceUp: true }],
    ];

    const { getByText, getByTestId, queryByText, queryByTestId } = await render(
      <AcesUpTable initialTopStacks={initialTopStacks} initialDeckStack={[]} />,
    );

    await waitFor(() => {
      expect(getByText('Game Over')).toBeTruthy();
    });

    fireEvent.press(getByTestId('dismiss-game-over-button'));

    await waitFor(() => {
      expect(getByText('New Game')).toBeTruthy();
    });

    fireEvent.press(getByTestId('deal-button'));

    await waitFor(() => {
      expect(queryByText('New Game')).toBeNull();
      expect(
        getByTestId('deck-stack-count').props.children.props.children,
      ).toBe(52);
      expect(queryByTestId('top-stack-0-card')).toBeNull();
      expect(getByText('Deal')).toBeTruthy();
    });
  });

  it('deal again resets to a fresh game from the game-over popup', async () => {
    const initialTopStacks = [
      [{ suit: 'C', rank: 2, faceUp: true }],
      [{ suit: 'D', rank: 3, faceUp: true }],
      [{ suit: 'H', rank: 4, faceUp: true }],
      [{ suit: 'S', rank: 5, faceUp: true }],
    ];

    const { getByText, getByTestId, queryByText, queryByTestId } = await render(
      <AcesUpTable initialTopStacks={initialTopStacks} initialDeckStack={[]} />,
    );

    await waitFor(() => {
      expect(getByText('Game Over')).toBeTruthy();
    });

    fireEvent.press(getByTestId('deal-again-button'));

    await waitFor(() => {
      expect(queryByText('Game Over')).toBeNull();
      expect(
        getByTestId('deck-stack-count').props.children.props.children,
      ).toBe(52);
      expect(queryByTestId('top-stack-0-card')).toBeNull();
    });

    await waitFor(async () => {
      await expect(getGameStats()).resolves.toEqual({
        gamesStarted: 2,
        gamesFinished: 1,
        gamesWon: 0,
      });
    });
  });

  it('closes settings from the done button', async () => {
    const { getByTestId, queryByTestId } = await render(<AcesUpTable />);

    await act(async () => {
      fireEvent.press(getByTestId('settings-button'));
    });

    await waitFor(() => {
      expect(getByTestId('settings-modal')).toBeTruthy();
    });

    fireEvent.press(getByTestId('close-settings-button'));

    await waitFor(() => {
      expect(queryByTestId('settings-modal')).toBeNull();
    });
  });
});
