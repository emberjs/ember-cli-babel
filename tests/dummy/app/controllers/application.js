import Controller from '@ember/controller';
import { computed } from '@ember/object';
import { A } from '@ember/array';
import Animal from 'dummy/utils/class-animal';

export default Controller.extend({
  init() {
    this._super(...arguments);
    this.animal = new Animal('dog');
  },

  animalName: computed({
    get() {
      return this.animal.name;
    },
  }),

  staticAnimalType: computed({
    get() {
      return Animal.type;
    },
  }),

  // Just a very roundabout way of using some ES6 features
  value: ((test = 'Test') => `${test} ${'Value'}`)(),

  // Test a generator (needs the regenerator runtime) and some ES6 constructs (requires the corejs polyfill)
  values: A(
    Array.from({
      *[Symbol.iterator]() {
        yield 'one';
        yield 'two';
      },
    })
  ),
});
