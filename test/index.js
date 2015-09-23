const path   = require("path");
const fs     = require("fs");
const assert = require("assert");
const babel  = require("babel");
const plugin = require("../src/index");

function resolve(path) {
  let expected = '';
  try {
    expected = fs.readFileSync(path).toString();
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
  return expected;
}

function transform(path) {
  return babel.transformFileSync(path, {
    blacklist: ['strict', 'react'],
    plugins: [plugin]
  }).code;
}

function parse(json) {
  return json ? JSON.parse(json) : {};
}

function trim(str) {
  return str.replace(/^\s+|\s+$/, "");
}


describe("turn jsx into incremental-dom", () => {
  const fixturesDir = path.join(__dirname, "fixtures");

  fs.readdirSync(fixturesDir).map((caseName) => {
    it(`should ${caseName.split("-").join(" ")}`, () => {
      const fixtureDir = path.join(fixturesDir, caseName);
      const expected = resolve(path.join(fixtureDir, "expected.js"));
      const opts = parse(resolve(path.join(fixtureDir, "options.json")));
      const throwMsg = opts.throws;
      let actual;

      try {
        actual = transform(path.join(fixtureDir, "actual.js"));
      } catch (err) {
        if (throwMsg) {
          if (err.message.indexOf(throwMsg) >= 0) {
            return;
          } else {
            err.message = "Expected error message: " + throwMsg + ". Got error message: " + err.message;
          }
        }

        throw err;
      }

      if (throwMsg) {
        throw new Error("Expected error message: " + throwMsg + ". But parsing succeeded.");
      } else {
        assert.equal(trim(actual), trim(expected));
      }
    });
  });
});
