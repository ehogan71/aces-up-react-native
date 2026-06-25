// Keep Jest pointed at the React Native preset and the shared setup file.
module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|bmp|svg)$': '<rootDir>/jest.fileMock.js',
  },
};
