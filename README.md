# ember-cli-6to5

This Ember-CLI plugin uses [6to5](https://6to5.org/index.html) to allow you to use ES6 syntax with your
Ember-CLI project.

## Installation

```
npm install --save-dev ember-cli-6to5
```

## Usage

This plugin should work without any configuration after installing. By default it will take every `.js` file
in your project and run it through the 6to5 transpiler to convert the ES6 code to ES5. Running existing ES5 code
through the transpiler shouldn't change the code at all (likely just a format change if it does).

If you need to customize the way that 6to5 transfoms your code, you can do it by passing in any of the options
found [here](https://6to5.org/usage.html#options). Example:

```js
// Brocfile.js

var app = new EmberApp({
	'6to5': {
		// disable comments
		comments: false
	}
});
```

### About Modules

Ember-CLI uses its own ES6 module transpiler for the custom Ember resolver that it uses. Because of that,
this plugin disables 6to5 module compilation by blacklisting that transform. If you find that you want to use
the 6to5 module transform instead of the Ember-CLI one, you'll have to explicitly set `compileModules` to `true`
in your configuration. If `compileModules` is anything other than `true`, this plugin will leave the module
syntax compilation up to Ember-CLI.

