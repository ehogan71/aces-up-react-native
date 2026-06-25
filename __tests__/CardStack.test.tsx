import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import CardStack from '../components/CardStack';
import type { CardStackHandle } from '../components/CardStack';

describe('CardStack', () => {
  it('renders with the expected outline and aspect ratio', async () => {
    const { getByTestId } = await render(<CardStack testID="cardstack-test" />);
    const card = getByTestId('cardstack-test');
    expect(card).toBeTruthy();

    const style = StyleSheet.flatten(card.props.style);
    expect(style).toMatchObject({
      flex: 1,
      aspectRatio: 0.714, // playing card width/height ratio (approx 2.5/3.5)
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.95)',
      borderRadius: 8,
      backgroundColor: 'transparent',
      marginHorizontal: 2,
    });
  });

  it('does not render a Card component when suit/rank are not provided', async () => {
    const { queryByTestId } = await render(
      <CardStack testID="cardstack-empty" />,
    );

    const cardElement = queryByTestId('cardstack-empty-card');
    expect(cardElement).toBeNull();
  });

  it('renders an initial stack with count and no outline when cards exist', async () => {
    const initialStack = [
      { suit: 'H' as const, rank: 7, faceUp: true },
      {
        suit: 'S' as const,
        rank: 3,
        faceUp: false,
        backStyle: 'Blue' as const,
      },
    ];

    const { getByTestId } = await render(
      <CardStack
        testID="stack-with-initial-cards"
        initialStack={initialStack}
      />,
    );

    expect(getByTestId('stack-with-initial-cards-card')).toBeTruthy();
    expect(getByTestId('stack-with-initial-cards-card-1')).toBeTruthy();
    expect(
      getByTestId('stack-with-initial-cards-count').props.children.props
        .children,
    ).toBe(2);

    const style = StyleSheet.flatten(
      getByTestId('stack-with-initial-cards').props.style,
    );
    expect(style.borderWidth).toBe(0);
  });

  it('does not show a count badge for an empty stack even when showCount is true', async () => {
    const { queryByTestId } = await render(
      <CardStack testID="empty-with-count" showCount />,
    );

    expect(queryByTestId('empty-with-count-count')).toBeNull();
  });

  it('wraps the top card in a pressable and highlights it when playable', async () => {
    const onPress = jest.fn();
    const stack = [
      { suit: 'D' as const, rank: 10, faceUp: true },
      { suit: 'C' as const, rank: 4, faceUp: true },
    ];

    const { getByTestId, queryByTestId } = await render(
      <CardStack
        testID="playable-stack"
        stack={stack}
        onPress={onPress}
        playableTopCard
        showPlayableIndicator
      />,
    );

    fireEvent.press(getByTestId('playable-stack-card-pressable'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(getByTestId('playable-stack-card-playable-dot')).toBeTruthy();
    expect(queryByTestId('playable-stack-card-1-playable-dot')).toBeNull();
  });

  it('makes the whole stack pressable when onStackPress is provided', async () => {
    const onStackPress = jest.fn();

    const { getByTestId } = await render(
      <CardStack
        testID="stack-pressable"
        stack={[{ suit: 'C', rank: 9, faceUp: true }]}
        onStackPress={onStackPress}
      />,
    );

    fireEvent.press(getByTestId('stack-pressable'));
    expect(onStackPress).toHaveBeenCalledTimes(1);
  });

  it('supports imperative push, pop, and size operations for uncontrolled stacks', async () => {
    const ref = React.createRef<CardStackHandle>();

    render(<CardStack ref={ref} testID="imperative-stack" />);

    await waitFor(() => {
      expect(ref.current).toBeTruthy();
      expect(ref.current?.size()).toBe(0);
    });

    await act(async () => {
      ref.current?.push({ suit: 'S', rank: 12, faceUp: true });
      ref.current?.push({
        suit: 'H',
        rank: 6,
        faceUp: false,
        backStyle: 'Blue',
      });
    });

    await waitFor(() => {
      expect(ref.current?.size()).toBe(2);
    });

    let popped;
    await act(async () => {
      popped = ref.current?.pop();
    });

    expect(popped).toEqual({
      suit: 'H',
      rank: 6,
      faceUp: false,
      backStyle: 'Blue',
    });

    await waitFor(() => {
      expect(ref.current?.size()).toBe(1);
    });
  });
});
