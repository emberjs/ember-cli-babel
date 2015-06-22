module.exports = {
  name: 'ember-cli-htmlbars-inline-precompile',

  isDevelopingAddon: function() {
    return true;
  },

  setupPreprocessorRegistry: function(type, registry) {
    var PrecompileTransformation = require('./precompile-transformation');

    registry.add('babel-plugin', {
      name: 'ember-cli-htmlbars-inline-precompile',
      plugin: PrecompileTransformation
    });
  }
};
