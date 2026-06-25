import React from 'react';
import { render } from '@testing-library/react-native';
import Card from '../components/Card';

describe('Card', () => {
  it('renders face up card with correct suit and rank', async () => {
    const { getByTestId } = await render(
      <Card suit="C" rank={1} faceUp testID="card-test" />,
    );

    const card = getByTestId('card-test');
    expect(card).toBeTruthy();

    const cardImage = getByTestId('card-test-image');
    expect(cardImage).toBeTruthy();
    // Image source will be a number (mocked asset)
    expect(typeof cardImage.props.source).toBe('number');
  });

  it('renders face down card with red back', async () => {
    const { getByTestId } = await render(
      <Card
        suit="H"
        rank={5}
        faceUp={false}
        backStyle="Red"
        testID="card-down"
      />,
    );

    const cardImage = getByTestId('card-down-image');
    expect(cardImage).toBeTruthy();
    expect(typeof cardImage.props.source).toBe('number');
  });

  it('renders face down card with blue back', async () => {
    const { getByTestId } = await render(
      <Card
        suit="S"
        rank={13}
        faceUp={false}
        backStyle="Blue"
        testID="card-blue"
      />,
    );

    const cardImage = getByTestId('card-blue-image');
    expect(cardImage).toBeTruthy();
    expect(typeof cardImage.props.source).toBe('number');
  });

  it('shows a small blue playable dot when showPlayable is enabled', async () => {
    const { getByTestId } = await render(
      <Card suit="H" rank={12} faceUp showPlayable testID="playable-card" />,
    );

    const dot = getByTestId('playable-card-playable-dot');
    expect(dot).toBeTruthy();
    expect(dot.props.style).toEqual(
      expect.objectContaining({
        width: 15,
        height: 15,
        borderRadius: 7,
        backgroundColor: '#4A90E2',
        borderWidth: 2,
        borderColor: '#fff',
      }),
    );
  });

  it('renders different suits correctly when faceUp', async () => {
    const suits: Array<'C' | 'D' | 'H' | 'S'> = ['C', 'D', 'H', 'S'];

    for (const suit of suits) {
      const { getByTestId } = await render(
        <Card suit={suit} rank={1} faceUp testID={`card-${suit}`} />,
      );

      const cardImage = getByTestId(`card-${suit}-image`);
      expect(cardImage).toBeTruthy();
      expect(cardImage.props.resizeMode).toBe('contain');
    }
  });

  it('renders a face-up tint overlay for face-up cards', async () => {
    const { getByTestId } = await render(
      <Card suit="D" rank={9} faceUp testID="tinted-card" />,
    );

    expect(getByTestId('tinted-card-faceup-tint')).toBeTruthy();
  });

  it('does not render a face-up tint overlay for face-down cards', async () => {
    const { queryByTestId } = await render(
      <Card
        suit="D"
        rank={9}
        faceUp={false}
        backStyle="Red"
        testID="untinted-card"
      />,
    );

    expect(queryByTestId('untinted-card-faceup-tint')).toBeNull();
  });
});
