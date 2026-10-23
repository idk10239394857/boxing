/**
 * Build-time switches on top of app.json:
 *   FF_SINGLE_BUNDLE=1       one JS bundle with no lazy route chunks (for single-file hosting)
 */
module.exports = ({ config }) => {
  const plugins = (config.plugins ?? []).map((p) =>
    p === 'expo-router' && process.env.FF_SINGLE_BUNDLE ? ['expo-router', { asyncRoutes: false }] : p,
  );
  return {
    ...config,
    plugins,
    experiments: {
      ...config.experiments,
    },
  };
};
