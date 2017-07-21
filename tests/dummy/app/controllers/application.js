import Ember from 'ember';
import Animal from 'dummy/utils/class-animal';

export default Ember.Controller.extend({

  animalName: Ember.computed({
    get() {
      const animal = new Animal('dog');
      return animal.name;
    }
  }),

  // Just a very roundabout way of using some ES6 features
  value: ((test = 'Test') => `${test} ${'Value'}`)(),

  // Test a generator (needs the regenerator runtime) and some ES6 constructs (requires the corejs polyfill)
  values: Ember.A(Array.from({ *[Symbol.iterator]() { yield 'one'; yield 'two'; } }))
});
