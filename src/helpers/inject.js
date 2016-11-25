import toReference from "./ast/to-reference";
import resolvePath from "./resolve-path";
import { deprecate } from "util";

const namespace = "incremental-dom-helpers";

const runtimeMethod = deprecate(function runtimeMethod(runtime, helper) {
  return toReference(`${runtime}.${helper}`);
}, "babel-plugin-incremental-dom: `runtime` option has been deprecated. Please use `runtimeModuleSource` instead.");

function getHelperRef({ file, opts }, helper) {
  const { runtime } = opts;
  if (runtime) {
    return runtimeMethod(runtime, helper);
  }

  let { runtimeModuleSource } = opts;

  if (runtimeModuleSource) {
    return file.addImport(
      resolvePath(file.opts.filename, runtimeModuleSource),
      helper
    );
  }

  const injectedHelper = file.get(namespace)[helper];
  return injectedHelper ? injectedHelper.ref : null;
}

function setHelper({ file }, helper, value) {
  return file.get(namespace)[helper] = value;
}

// Sets up the needed data maps for injecting runtime helpers.
export function setupInjector({ file }) {
  // A map to store helper variable references
  // for each file
  file.set(namespace, Object.create(null));
}

export function injectHelpers({ file }) {
  const injectedHelpers = file.get(namespace);

  for (let helper in injectedHelpers) {
    const { ref, expression } = injectedHelpers[helper];
    file.scope.push({
      id: ref,
      init: expression,
      unique: true
    });
  }
}


// Injects a helper function defined by helperAstFn into the current file at
// the top scope.
export default function inject(plugin, helper, helperAstFn, dependencyInjectors = {}) {
  let ref = getHelperRef(plugin, helper);
  if (ref) {
    return ref;
  }

  ref = plugin.file.scope.generateUidIdentifier(helper);
  let expression = null;

  const injectedHelper = { ref, expression };
  setHelper(plugin, helper, injectedHelper);

  const dependencyRefs = {};

  for (let dependency in dependencyInjectors) {
    let dependencyRef = getHelperRef(plugin, dependency);

    if (!dependencyRef) {
      dependencyRef = dependencyInjectors[dependency](plugin);
    }

    dependencyRefs[dependency] = dependencyRef;
  }

  injectedHelper.expression = helperAstFn(plugin, injectedHelper.ref, dependencyRefs);

  return ref;
}
