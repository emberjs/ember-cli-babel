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

function _getEmberModulesAPIPolyfill(config) {
  if (config.disableEmberModulesAPIPolyfill) {
    return;
  }

  if (_emberVersionRequiresModulesAPIPolyfill()) {
    const ignore = _getEmberModulesAPIIgnore(config);

    return [
      [require.resolve("babel-plugin-ember-modules-api-polyfill"), { ignore }],
    ];
  }
}

function _getEmberModulesAPIIgnore(config) {
  const ignore = {
    "@ember/debug": ["assert", "deprecate", "warn"],
    "@ember/application/deprecations": ["deprecate"],
  };

  if (config.shouldIgnoreEmberString) {
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
  if (config.shouldIgnoreJQuery) {
    ignore["jquery"] = ["default"];
  }

  return ignore;
}

function _getEmberDataPackagesPolyfill(config) {
  if (config.emberDataVersionRequiresPackagesPolyfill) {
    return [[require.resolve("babel-plugin-ember-data-packages-polyfill")]];
  }
}

module.exports = function (config = {}) {
  return []
    .concat(
      _getDebugMacroPlugins(),
      _getEmberModulesAPIPolyfill(config),
      _getEmberDataPackagesPolyfill(config)
    )
    .filter(Boolean);
};
module.exports.getDebugMacroPlugins = _getDebugMacroPlugins;
module.exports.getEmberModulesAPIPolyfill = _getEmberModulesAPIPolyfill;
module.exports.getEmberDataPackagesPolyfill = _getEmberDataPackagesPolyfill;
