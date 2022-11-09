# Upgrading

## v8

The most notable breaking changes introduced in v8 are:

1. The `includePolyfill` option is no longer supported ([458](https://github.com/babel/ember-cli-babel/pull/458))
2. `@babel/core` is now a required peer dependency ([452](https://github.com/babel/ember-cli-babel/pull/452))

### Upgrade Path for Apps

Apps that are relying on the `includePolyfill` option should install `core-js`, 
and import `core-js/stable` directly in `app.js`. The reason for this is that, 
`@babel/polyfill` has been deprecated. More info on this deprecation can be 
found in [the documentation for `@babel/polyfill`](https://babeljs.io/docs/en/babel-polyfill).

Apps are now also required to install `@babel/core` directly in order to use 
`ember-cli-babel`. Making `@babel/core` a peer dependency ensures that the 
same version is used by all tooling that require it.

### Upgrade Path for Addons

Since (v1) addons bring in their own version of `ember-cli-babel`, they should 
now also bring in their own version of `@babel/core`. This means that, addons 
should add `@babel/core` under `dependencies` in their `package.json` file. 
This makes the dependency on `@babel/core` more explicit while also avoiding 
addons having to cut a breaking release to update `ember-cli-babel` to v8.
