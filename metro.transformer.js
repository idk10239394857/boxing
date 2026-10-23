/**
 * @mediapipe/tasks-vision contains a computed `import()` that Metro refuses to bundle.
 * It only runs inside module workers (we load MediaPipe on the main thread), so swap
 * that one call for a runtime error before handing the file to Expo's transformer.
 */
const upstream = require(
  process.env.FIGHTFLOW_UPSTREAM_TRANSFORMER ||
    require('expo/metro-config').getDefaultConfig(__dirname).transformer.babelTransformerPath,
);

module.exports = {
  ...upstream,
  transform(props) {
    if (/[\\/]@mediapipe[\\/]tasks-vision[\\/]/.test(props.filename)) {
      props = {
        ...props,
        src: props.src.replace(
          'await import(t.toString())',
          'await Promise.reject(new Error("MediaPipe module workers are not supported"))',
        ),
      };
    }
    return upstream.transform(props);
  },
};
