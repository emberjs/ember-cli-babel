module.exports = {
	name: 'ember-cli-6to5',
	included: function(app) {
		this._super.included.apply(this, arguments);

		var options = getOptions(app.options['6to5']);

		var plugin = {
			name: 'ember-cli-6to5',
			ext: 'js',
			toTree: function(tree) {
				return require('broccoli-6to5-transpiler')(tree, options);
			}
		};

		app.registry.add('js', plugin);
	}
};

function getOptions(options) {
	options = options || {};

	// Ensure modules aren't compiled unless explicitly set to compile
	options.blacklist = options.blacklist || ['modules'];

	if (options.compileModules === true) {
		if (options.blacklist.indexOf('modules') >= 0) {
			options.blacklist.splice(options.indexOf('modules'), 1);
		}
	} else {
		if (options.blacklist.indexOf('modules') < 0) {
			options.blacklist.push('modules');
		}
	}

	// Ember-CLI inserts its own 'use strict' directive
	options.blacklist.push('useStrict');

	return options;
}
