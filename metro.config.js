const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Wrap Expo's Babel transformer to patch @mediapipe/tasks-vision (see metro.transformer.js).
process.env.FIGHTFLOW_UPSTREAM_TRANSFORMER = config.transformer.babelTransformerPath;
config.transformer.babelTransformerPath = require.resolve('./metro.transformer.js');

module.exports = config;
