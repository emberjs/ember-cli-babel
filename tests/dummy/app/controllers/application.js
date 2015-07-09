import Ember from 'ember';

export default Ember.Controller.extend({
  // Just a very roundabout way of using some ES6 features
  value: ((test = 'Test') => `${test} ${'Value'}`)(), // jshint ignore:line

  // Test a generator (needs the regenerator runtime) and some ES6 constructs (requires the corejs polyfill)
  values: Array.from({ *[Symbol.iterator]() { yield 'one'; yield 'two'; } }) // jshint ignore:line
});
