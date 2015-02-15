module.exports = {
  name: 'ember-cli-babel',
  included: function(app) {
    this._super.included.apply(this, arguments);

    var options = getOptions(app.options['babel']);

    var plugin = {
      name: 'ember-cli-babel',
      ext: 'js',
      toTree: function(tree) {
        return require('broccoli-babel-transpiler')(tree, options);
      }
    };

    app.registry.add('js', plugin);
  }
};

function getOptions(options) {
  options = options || {};

  // Ensure modules aren't compiled unless explicitly set to compile
  options.blacklist = options.blacklist || ['es6.modules'];

  if (options.compileModules === true) {
    if (options.blacklist.indexOf('es6.modules') >= 0) {
      options.blacklist.splice(options.indexOf('es6.modules'), 1);
    }
  } else {
    if (options.blacklist.indexOf('es6.modules') < 0) {
      options.blacklist.push('es6.modules');
    }
  }

  // Ember-CLI inserts its own 'use strict' directive
  options.blacklist.push('useStrict');

  return options;
}
