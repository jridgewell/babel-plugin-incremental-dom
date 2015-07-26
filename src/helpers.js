const nonWhitespace = /\S/;
const newlines = /\r\n?|\n/;

// Trims the whitespace off the lines.
function lineFilter(lines, line, i, { length }) {
  if (i > 0) { line = line.trimLeft(); }
  if (i + 1 < length) { line = line.trimRight(); }
  if (line) { lines.push(line); }

  return lines;
}

// Cleans the whitespace from a text node.
function cleanText({ value }) {
  if (nonWhitespace.test(value)) {
    let lines = value.split(newlines);

    lines = lines.reduce(lineFilter, []);

    return lines.join(" ");
  }
}

export default function(t) {

  // Helper to create a function call in AST.
  function toFunctionCall(functionName, args) {
    return t.callExpression(t.identifier(functionName), args)
  }

  // Helper to create a function call statement in AST.
  function toFunctionCallStatement(functionName, args) {
    return t.expressionStatement(toFunctionCall(functionName, args));
  }

  // Helper to transform a JSX identifier into a normal reference.
  function toReference(node, identifier) {
    if (t.isIdentifier(node)) {
        return node;
    }
    if (t.isJSXIdentifier(node)) {
      return identifier ? t.identifier(node.name) : t.literal(node.name);
    }
    return t.memberExpression(
      toReference(node.object, true),
      toReference(node.property, true)
    );
  }

  // Filters out empty children, and transform JSX expressions
  // into normal expressions.
  function childFilter(children, child) {
    if (t.isJSXExpressionContainer(child)) {
      child = child.expression;
    }

    if (t.isLiteral(child) && typeof child.value === "string") {
      let text = cleanText(child);
      if (!text) { return children; }

      child = toFunctionCall("text", [t.literal(text)]);
    }

    if (t.isJSXExpressionContainer(child)) child = child.expression;
    if (t.isJSXEmptyExpression(child)) {
      return children;
    } else if (t.isArrayExpression(child)) {
      child = t.sequenceExpression(buildChildren(child.elements));
    } else if (t.isIdentifier(child) || t.isMemberExpression(child)) {
      child = toReference(child);
    }

    children.push(child);
    return children;
  }

  // Helper to transform an expression into an expression statement.
  function toStatement(expression) {
    if (!t.isStatement(expression)) {
      return t.expressionStatement(expression);
    }
    return expression;
  }

  // Helper to flatten out sequence expressions into a top level
  // expression statements.
  function sequenceReducer(nodes, node) {
    if (t.isSequenceExpression(node)) {
      let expressions = flattenExpressions(node.expressions);
      nodes.push(...expressions);
    } else {
      nodes.push(toStatement(node));
    }
    return nodes;
  }

  function buildChildren(children) {
      return children.reduce(childFilter, []);
  }

  function flattenExpressions(expressions) {
    return expressions.reduce(sequenceReducer, []);
  }

  return {
    buildChildren: buildChildren,

    flattenExpressions: flattenExpressions,

    toFunctionCall: toFunctionCall,

    toReference: toReference,


    // Extracts attributes into the appropriate
    // attribute array. Static attributes and the key
    // are placed into static attributes, and expressions
    // are placed into the variadic attributes.
    extractOpenArguments(attributes) {
      let key = null;
      let statics = [];
      let attrs = [];
      let hasSpread = false;

      for (let attribute of attributes) {
        if (t.isJSXSpreadAttribute(attribute)) {
          hasSpread = true;
          attrs.push(attribute);
        } else {
          let name = attribute.name.name;
          let attr = t.literal(name);
          let value = attribute.value;

          if (!value) {
            value = t.literal(true);
          } else if (t.isJSXExpressionContainer(value)) {
            value = value.expression;
          }

          if (name === "key") {
            key = value;
          }

          if (name === "key" || t.isLiteral(value)) {
            statics.push(attr, value)
          } else {
            attrs.push([ attr, value ]);
          }
        }
      }

      if (!statics.length) { statics = null; }
      if (!attrs.length) { attrs = null; }

      return { key, statics, attrs, hasSpread };
    },

    // Transforms an attribute array into sequential attr calls.
    attrsToAttrCalls(scope) {
      return function(attr) {
        if (t.isJSXSpreadAttribute(attr)) {
          let iterator = scope.generateUidIdentifier("attr");

          return t.forInStatement(
            t.variableDeclaration("var", [iterator]),
            attr.argument,
            toFunctionCallStatement("attr", [
              iterator,
              t.memberExpression(attr.argument, iterator, true)
            ])
          );
        } else {
          return toFunctionCall("attr", attr);
        }
      }
    }
  };
};
