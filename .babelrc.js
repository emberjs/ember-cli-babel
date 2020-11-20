const emberPlugins = require("./lib/ember-plugins");

module.exports = function (api) {
  const resolvePath = require("./lib/relative-module-paths")
    .resolveRelativeModulePath;

  api.cache(true);

  return {
    presets: [
      [
        require.resolve("@babel/preset-env"),
        {
          targets: require("./tests/dummy/config/targets"),

          // do we still need to disable this and manually add modules plugins in the plugins array below?
          modules: false,
        },
      ],
    ],
    plugins: [
      // if they need/want external helpers
      [
        require.resolve("@babel/plugin-transform-runtime"),
        {
          version: require("@babel/plugin-transform-runtime/package").version,
          regenerator: false,
          useESModules: true,
        },
      ],
      [require.resolve("@babel/plugin-proposal-decorators"), { legacy: true }],
      [require.resolve("@babel/plugin-proposal-class-properties")],

      ...emberPlugins({
        emberDataVersionRequiresPackagesPolyfill: false,
        shouldIgnoreJQuery: true,
        shouldIgnoreEmberString: true,
        disableEmberModulesAPIPolyfill: false,
      }),

      // configure module resolution plugins
      // TODO: consider moving this into `...emberPlugins()` and allowing opt-out
      [require.resolve("babel-plugin-module-resolver"), { resolvePath }],
      [
        require.resolve("@babel/plugin-transform-modules-amd"),
        { noInterop: true },
      ],
    ],
  };
};
