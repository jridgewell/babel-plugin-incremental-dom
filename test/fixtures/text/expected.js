function _renderArbitrary(child) {
  var type = typeof child;

  if (type === "number" || (type === "string" || child && child instanceof String)) {
    text(child);
  } else if (type === "function" && child.__jsxDOMWrapper) {
    child();
  } else if (Array.isArray(child)) {
    child.forEach(_renderArbitrary);
  } else {
    _forOwn(child, _renderArbitrary);
  }
}

function _forOwn(object, iterator) {
  for (var prop in object) if (_hasOwn.call(object, prop)) iterator(object[prop], prop);
}

var _hasOwn = Object.prototype.hasOwnProperty;

function _jsxWrapper(func) {
  func.__jsxDOMWrapper = true;
  return func;
}

function render() {
  elementOpen("div");
  text("Hello World!");
  elementOpen("div");
  text("Hiya!");
  elementClose("div");
  elementOpen("div");
  text("First · Second");
  elementClose("div");
  elementOpen("div");

  _renderArbitrary(["First ", _jsxWrapper(function () {
    elementOpen("span");
    text("·");
    return elementClose("span");
  }), " Second"]);

  elementClose("div");
  return elementClose("div");
}