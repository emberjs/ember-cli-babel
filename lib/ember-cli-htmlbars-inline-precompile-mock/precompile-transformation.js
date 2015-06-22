module.exports = function(babel) {
  var t = babel.types;

  return new babel.Transformer('ember-cli-htmlbars-inline-precompile', {
    Literal: function(node) {
      if (node.value === 'my template') {
        return t.literal("precompiled");
      }
    }
  });
};
