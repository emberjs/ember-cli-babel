module.exports = {
  name: 'answer-to-the-universe',

  isDevelopingAddon: function() {
    return true;
  },

  setupPreprocessorRegistry: function(type, registry) {
    var ProvideAnswerTransformation = require('./provide-answer-transformation');

    registry.add('babel-plugin', {
      name: 'answer-to-the-universe',
      plugin: ProvideAnswerTransformation
    });
  }
};
