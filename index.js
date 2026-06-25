/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register the root component so the native shells can boot the app.
AppRegistry.registerComponent(appName, () => App);
