import Ember from 'ember';

const { Controller, A, computed } = Ember;

export default Controller.extend({

  // Just a very roundabout way of using some ES6 features
  value: ((test = 'Test') => `${test} ${'Value'}`)(), // jshint ignore:line

  // Test a generator (needs the regenerator runtime) and some ES6 constructs (requires the corejs polyfill)
  values: A(Array.from({ *[Symbol.iterator]() { yield 'one'; yield 'two'; } })), // jshint ignore:line

  hasProxies: computed({
    get() {
      const target = {};
      const handler = {
        get: (receiver, name) => {
          return `Hello, ${name}!`;
        }
      };

      const p = new Proxy(target, handler);
      return p.world === 'Hello, world!';
    }
  })
});
