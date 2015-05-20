module.exports = function(babel) {
  var t = babel.types;

  return new babel.Transformer('answer-to-the-universe', {
    Literal: function(node) {
      if (node.value === 'THE-answer') {
        return t.literal(42);
      }
    }
  });
};
