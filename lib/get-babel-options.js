const {
  _addDecoratorPlugins,
  _addTypeScriptPlugin,
  _getAddonProvidedConfig,
  _shouldCompileModules,
  _shouldIncludeHelpers,
  _shouldHandleTypeScript,
  _shouldIncludeDecoratorPlugins,
  _getExtensions,
  _parentName,
  _getHelpersPlugin,
  _getDebugMacroPlugins,
  _getEmberModulesAPIPolyfill,
  _getEmberDataPackagesPolyfill,
  _getModulesPlugin,
  _getPresetEnv,
  _shouldHighlightCode,
} = require("./babel-options-util");

module.exports = function getBabelOptions(config, appInstance) {
  let { parent, project } = appInstance;
  let addonProvidedConfig = _getAddonProvidedConfig(config);
  let shouldCompileModules = _shouldCompileModules(config, project);
  let shouldIncludeHelpers = _shouldIncludeHelpers(config, appInstance);
  let shouldHandleTypeScript = _shouldHandleTypeScript(config, parent);
  let shouldIncludeDecoratorPlugins = _shouldIncludeDecoratorPlugins(config);

  let emberCLIBabelConfig = config["ember-cli-babel"];
  let shouldRunPresetEnv = true;
  let providedAnnotation;
  let throwUnlessParallelizable;

  if (emberCLIBabelConfig) {
    providedAnnotation = emberCLIBabelConfig.annotation;
    shouldRunPresetEnv = !emberCLIBabelConfig.disablePresetEnv;
    throwUnlessParallelizable = emberCLIBabelConfig.throwUnlessParallelizable;
  }

  let sourceMaps = false;
  if (config.babel && "sourceMaps" in config.babel) {
    sourceMaps = config.babel.sourceMaps;
  }

  let filterExtensions = _getExtensions(config, parent);

  let options = {
    annotation: providedAnnotation || `Babel: ${_parentName(parent)}`,
    sourceMaps,
    throwUnlessParallelizable,
    filterExtensions,
  };

  let userPlugins = addonProvidedConfig.plugins;
  let userPostTransformPlugins = addonProvidedConfig.postTransformPlugins;

  if (shouldHandleTypeScript) {
    userPlugins = _addTypeScriptPlugin(userPlugins.slice(), parent, project);
  }

  if (shouldIncludeDecoratorPlugins) {
    userPlugins = _addDecoratorPlugins(
      userPlugins.slice(),
      addonProvidedConfig.options,
      config,
      parent,
      project
    );
  }

  options.plugins = []
    .concat(
      shouldIncludeHelpers && _getHelpersPlugin(project),
      userPlugins,
      _getDebugMacroPlugins(config),
      _getEmberModulesAPIPolyfill(config, parent, project),
      _getEmberDataPackagesPolyfill(config, parent),
      shouldCompileModules && _getModulesPlugin(),
      userPostTransformPlugins
    ).filter(Boolean);

  options.presets = [
    shouldRunPresetEnv && _getPresetEnv(addonProvidedConfig, project),
  ].filter(Boolean);

  if (shouldCompileModules) {
    options.moduleIds = true;
    options.getModuleId = require("./relative-module-paths").getRelativeModulePath;
  }
  options.highlightCode = _shouldHighlightCode(parent);
  options.babelrc = false;

  return options;
};
