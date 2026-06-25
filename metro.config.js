const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
// Start from the default Metro config and only layer in custom overrides when
// the app actually needs them.
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
