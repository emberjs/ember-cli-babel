var Filter = require('broccoli-filter');
var to5 = require('6to5');

module.exports = ES6Filter;

function ES6Filter(inputTree, options) {
	if (!(this instanceof  ES6Filter)) {
		return new ES6Filter(inputTree, options);
	}

	Filter.call(this, inputTree, options);

	this.inputTree = inputTree;
	this.options = options;
}

ES6Filter.prototype = Object.create(Filter.prototype);
ES6Filter.prototype.constructor = ES6Filter;

ES6Filter.prototype.extensions = ['js'];
ES6Filter.prototype.targetExtension = 'js';

ES6Filter.prototype.processString = function(fileContents, srcFile) {
	return to5.transform(fileContents, this.options).code;
};