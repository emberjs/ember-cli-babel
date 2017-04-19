# ember-cli-babel

[![Build Status](https://travis-ci.org/babel/ember-cli-babel.svg?branch=master)](https://travis-ci.org/babel/ember-cli-babel)
[![Build status](https://ci.appveyor.com/api/projects/status/2a6pspve1wrwwyj5/branch/master?svg=true)](https://ci.appveyor.com/project/embercli/ember-cli-babel/branch/master)


This Ember-CLI plugin uses [Babel](https://babeljs.io/) and [babel-preset-env](https://github.com/babel/babel-preset-env) to allow you to use ES6 syntax with your Ember CLI project.

## Installation

```
ember install ember-cli-babel
```

## Usage

This plugin should work without any configuration after installing. By default it will take every `.js` file
in your project and run it through the Babel transpiler to convert your ES6 code to code supported by your
target browsers (as specified in `config/targets.js` in ember-cli >= 2.13). Running non-ES6 code
through the transpiler shouldn't change the code at all (likely just a format change if it does).

If you need to customize the way that `babel-preset-env` configures the plugins that transform your code,
you can do it by passing in any of the options found [here](https://github.com/babel/babel-preset-env#options).

Example (configuring babel directly):

```js
// ember-cli-build.js

var app = new EmberApp({
  babel: {
    // enable "loose" mode
    loose: true,
    // don't transpile generator functions
    exclude: [
      'transform-regenerator',
    ]
  }
});
```

Example (configuring ember-cli-babel itself):

```js
// ember-cli-build.js

var app = new EmberApp({
  'ember-cli-babel': {
    compileModules: false
  }
});
```

### Polyfill

Babel comes with a polyfill that includes a custom [regenerator runtime](https://github.com/facebook/regenerator/blob/master/runtime.js)
and [core.js](https://github.com/zloirock/core-js). Many transformations will work without it, but for full support you
must include the polyfill in your app. The [Babel feature tour](https://babeljs.io/docs/tour/) includes a note for
features that require the polyfill to work.

To include it in your app, pass `includePolyfill: true` in your `ember-cli-babel` options.

```js
// ember-cli-build.js

var app = new EmberApp(defaults, {
  'ember-cli-babel': {
    includePolyfill: true
  }
});
```

### Addon usage

For addons which want additional customizations, they are able to interact with
this addon directly.

```js
treeForAddon(tree) {
  let addon = this.addons.find(addon => addon.name === 'ember-cli-babel'); // find your babel addon

  let options = addon.buildBabelOptions({
    'ember-cli-babel'
  })

  return addon.transpileTree(tree, {
    'babel': {
      // any babel specific options
     },

    'ember-cli-babel': {
      // any ember-cli-babel options
    }
  });
}
```

### About Modules

Older versions of Ember CLI (`< 2.12`) use its own ES6 module transpiler. Because of that, this plugin disables Babel
module compilation by blacklisting that transform when running under affected ember-cli versions. If you find that you
want to use the Babel module transform instead of the Ember CLI one, you'll have to explicitly set `compileModules` to `true`
in your configuration. If `compileModules` is anything other than `true`, this plugin will leave the module
syntax compilation up to Ember CLI.
