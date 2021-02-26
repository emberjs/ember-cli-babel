const semver = require("semver");
const resolvePackagePath = require("resolve-package-path");

function _getDebugMacroPlugins() {
  const isProduction = process.env.EMBER_ENV === "production";
  const isDebug = !isProduction;

  return [
    [
      require.resolve("babel-plugin-debug-macros"),
      {
        flags: [
          {
            source: "@glimmer/env",
            flags: { DEBUG: isDebug, CI: !!process.env.CI },
          },
        ],

        externalizeHelpers: {
          global: "Ember",
        },

        debugTools: {
          isDebug,
          source: "@ember/debug",
          assertPredicateIndex: 1,
        },
      },
      "@ember/debug stripping",
    ],
    [
      require.resolve("babel-plugin-debug-macros"),
      {
        // deprecated import path https://github.com/emberjs/ember.js/pull/17926#issuecomment-484987305
        externalizeHelpers: {
          global: "Ember",
        },

        debugTools: {
          isDebug,
          source: "@ember/application/deprecations",
          assertPredicateIndex: 1,
        },
      },
      "@ember/application/deprecations stripping",
    ],
  ];
}
function _emberVersionRequiresModulesAPIPolyfill() {
  // once a version of Ember ships with the
  // emberjs/rfcs#176 modules natively this will
  // be updated to detect that and return false
  return true;
}

function _getEmberModulesAPIPolyfill(appRoot, config) {
  if (config.disableEmberModulesAPIPolyfill) {
    return;
  }

  if (_emberVersionRequiresModulesAPIPolyfill()) {
    const ignore = _getEmberModulesAPIIgnore(appRoot, config);
    const useEmberModule = _shouldDeprecateGlobalEmber(appRoot);

    return [
      [
        require.resolve("babel-plugin-ember-modules-api-polyfill"),
        { ignore, useEmberModule },
      ],
    ];
  }
}

function _shouldIgnoreEmberString(appRoot) {
  return resolvePackagePath("@ember/string", appRoot) !== null;
}

function _shouldIgnoreJQuery(appRoot) {
  let packagePath = resolvePackagePath("@ember/jquery", appRoot);
  if (packagePath === null) {
    return true;
  }
  let pkg = require(packagePath);
  return pkg && semver.gt(pkg.version, "0.6.0");
}

function _shouldDeprecateGlobalEmber(appRoot) {
  let packagePath = resolvePackagePath("ember-source", appRoot);
  if (packagePath === null) {
    return false;
  }

  let pkg = require(packagePath);
  return pkg && semver.gte(pkg.version, "3.27.0-alpha.1");
}

function _emberDataVersionRequiresPackagesPolyfill(appRoot) {
  let packagePath = resolvePackagePath("ember-data", appRoot);
  if (packagePath === null) {
    return false;
  }
  let pkg = require(packagePath);
  return pkg && semver.lt(pkg.version, "3.12.0-alpha.0");
}

function _getEmberModulesAPIIgnore(appRoot, config) {
  const ignore = {
    "@ember/debug": ["assert", "deprecate", "warn"],
    "@ember/application/deprecations": ["deprecate"],
  };

  if (config.shouldIgnoreEmberString || _shouldIgnoreEmberString(appRoot)) {
    ignore["@ember/string"] = [
      "fmt",
      "loc",
      "w",
      "decamelize",
      "dasherize",
      "camelize",
      "classify",
      "underscore",
      "capitalize",
      "setStrings",
      "getStrings",
      "getString",
    ];
  }
  if (config.shouldIgnoreJQuery || _shouldIgnoreJQuery(appRoot)) {
    ignore["jquery"] = ["default"];
  }

  return ignore;
}

function _getEmberDataPackagesPolyfill(appRoot, config) {
  if (config.emberDataVersionRequiresPackagesPolyfill) {
    return [[require.resolve("babel-plugin-ember-data-packages-polyfill")]];
  }
  return _emberDataVersionRequiresPackagesPolyfill(appRoot);
}

function _getModuleResolutionPlugins(config) {
  if (!config.disableModuleResolution) {
    const resolvePath = require("../lib/relative-module-paths")
      .resolveRelativeModulePath;
    return [
      [require.resolve("babel-plugin-module-resolver"), { resolvePath }],
      [
        require.resolve("@babel/plugin-transform-modules-amd"),
        { noInterop: true },
      ],
    ];
  }
}

function _getProposalDecoratorsAndClassPlugins(config) {
  if (!config.shouldIgnoreDecoratorAndClassPlugins) {
    return [
      ["@babel/plugin-proposal-decorators", { legacy: true }],
      ["@babel/plugin-proposal-class-properties"],
    ];
  }
}

/**
 * This function allows returns all the required Ember specific babel plugins for the app to transpile correctly.
 * As the first argument, you need to pass in the appRoot (which is usually the __dirname).
 * As the second argument, which is optional, you can choose to turn the switch on and off of several plugins that this function returns.
 * **List of supported configs**
 * {
 *  disableModuleResolution: boolean, // determines if you want the module resolution enabled
 *  emberDataVersionRequiresPackagesPolyfill: boolean, // enable ember data's polyfill
 *  shouldIgnoreJQuery: boolean, // ignore jQuery
 *  shouldIgnoreEmberString: boolean, // ignore ember string
 *  shouldIgnoreDecoratorAndClassPlugins: boolean, // disable decorator plugins
 *  disableEmberModulesAPIPolyfill: boolean, // disable ember modules API polyfill
 * }
 * @param {string} appRoot - root directory of your project
 * @param {object} config - config options to finetune the plugins
 */
module.exports = function (appRoot, config = {}) {
  return []
    .concat(
      _getProposalDecoratorsAndClassPlugins(config),
      _getDebugMacroPlugins(appRoot),
      _getEmberModulesAPIPolyfill(appRoot, config),
      _getEmberDataPackagesPolyfill(appRoot, config),
      _getModuleResolutionPlugins(config)
    )
    .filter(Boolean);
};

module.exports.getDebugMacroPlugins = _getDebugMacroPlugins;
module.exports.getEmberModulesAPIPolyfill = _getEmberModulesAPIPolyfill;
module.exports.getEmberDataPackagesPolyfill = _getEmberDataPackagesPolyfill;
module.exports.getModuleResolutionPlugins = _getModuleResolutionPlugins;
module.exports.getProposalDecoratorsAndClassPlugins = _getProposalDecoratorsAndClassPlugins;
