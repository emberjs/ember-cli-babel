const babelOptionsUtil = require('./babel-options-util');

module.exports = function getBabelOptions(config, appInstance) {
  let { parent, project } = appInstance;
  let addonProvidedConfig = babelOptionsUtil._getAddonProvidedConfig(config);
  let shouldCompileModules = babelOptionsUtil._shouldCompileModules(config, project);
  let shouldIncludeHelpers = babelOptionsUtil._shouldIncludeHelpers(config, appInstance);
  let shouldHandleTypeScript = babelOptionsUtil._shouldHandleTypeScript(config, parent);
  let shouldIncludeDecoratorPlugins = babelOptionsUtil._shouldIncludeDecoratorPlugins(config);

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

  let filterExtensions = babelOptionsUtil._getExtensions(config, parent);

  let options = {
    annotation: providedAnnotation || `Babel: ${babelOptionsUtil._parentName(parent)}`,
    sourceMaps,
    throwUnlessParallelizable,
    filterExtensions,
  };

  let userPlugins = addonProvidedConfig.plugins;
  let userPostTransformPlugins = addonProvidedConfig.postTransformPlugins;
  
  if (shouldHandleTypeScript) {
    userPlugins = babelOptionsUtil._addTypeScriptPlugin(userPlugins.slice(), parent, project);
  }
  
  if (shouldIncludeDecoratorPlugins) {
    userPlugins = babelOptionsUtil._addDecoratorPlugins(
      userPlugins.slice(),
      addonProvidedConfig.options,
      config,
      parent,
      project
      );
    }
    
    
    options.plugins = []
    .concat(
      shouldIncludeHelpers && babelOptionsUtil._getHelpersPlugin(project),
      userPlugins,
      babelOptionsUtil._getDebugMacroPlugins(config),
      babelOptionsUtil._getEmberModulesAPIPolyfill(config, parent, project),
      babelOptionsUtil._getEmberDataPackagesPolyfill(config, parent),
      shouldCompileModules && babelOptionsUtil._getModulesPlugin(),
      userPostTransformPlugins
      )
      .filter(Boolean);
      
      
  options.presets = [
    shouldRunPresetEnv && babelOptionsUtil._getPresetEnv(addonProvidedConfig, project),
  ].filter(Boolean);
  
  if (shouldCompileModules) {
    options.moduleIds = true;
    options.getModuleId = require("./relative-module-paths").getRelativeModulePath;
  }
  options.highlightCode = babelOptionsUtil._shouldHighlightCode(parent);
  options.babelrc = false;

  return options;
};
