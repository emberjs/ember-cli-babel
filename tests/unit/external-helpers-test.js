import { module, test } from 'qunit';

module('Unit | external helpers test', function() {
  test('external helpers work ', function(assert) {
    assert.expect(0);

    // This test will transpile to use external helpers depending on targets. If
    // those helpers are not present, it will break. If IE11 is removed from
    // targets we should find another way to test this.
    class Foo {}

    new Foo();
  });
});
