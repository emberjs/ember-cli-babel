function nameMacro(prototye, key, desc) {
  desc.get = function() {
    return this._name;
  };

  return desc;
}

function addType(target) {
  target.prototype.type = target.type;
}

@addType
class Animal {
  static type = 'mammal';

  constructor(name) {
    this._name = name;
  }

  @nameMacro
  set name(name) {
    this._name = name;
  }
}

export default Animal;
