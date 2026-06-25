/**
 * @format
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

test('renders AcesUpTable background', async () => {
  const { findByTestId } = await render(<App />);
  const background = await findByTestId('acesup-background');
  expect(background).toBeTruthy();
});
