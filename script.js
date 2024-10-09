function syntaxAnalysis(code) {
  const tokens = [
    {type: "comment", pattern: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm},
    {type: "string", pattern: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g},
    {
      type: "keyword",
      pattern:
        /\b(function|var|let|const|if|else|for|while|return|class|import|export|new|try|catch|throw|await|async|switch|case|default|break|continue|typeof|instanceof)\b/g,
    },
    {
      type: "operator",
      pattern:
        /(\+|-|\*|\/|=|==|===|!=|!==|<|>|<=|>=|\+=|-=|\*=|\/=|&&|\|\||!|%|&|\||\^|~|>>|<<|=>|:|\?)/g,
    },
    {type: "number", pattern: /\b\d+(\.\d+)?\b/g},
    {type: "null", pattern: /null/g},
    {type: "undefined", pattern: /undefined/g},
    {type: "boolean", pattern: /true|false/g},
    {type: "identifier", pattern: /\b[a-zA-Z_]\w*\b/g},
    {type: "bracket", pattern: /[{}()\[\]]/g},
    {type: "separator", pattern: /[;.]/g},
  ];

  let result = [];
  let errors = [];
  const bracketStack = [];

  function matchPattern(pattern, type) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      type === "invalid" && match[0].includes("@") && console.log(match[0]);
      if (
        result.some(
          (t) =>
            (type === "invalid" && t.index === match.index) ||
            (t.index <= match.index &&
              t.value.length + t.index >= match.index + match[0].length),
        )
      ) {
        continue;
      }
      result.push({type, value: match[0], index: match.index});
    }
  }

  tokens.forEach((token) => {
    matchPattern(token.pattern, token.type);
  });

  for (let i = 0; i < code.length; ) {
    const t = result.find((t) => t.index === i);
    if (t) {
      i = t.index + t.value.length;
      continue;
    }
    if (code.at(i) === " " || code.at(i) === "\t" || code.at(i) === "\n") {
      i += 1;
      continue;
    }
    const index = i;
    let value = code.at(i++);
    const next = result.find((t) => t.index >= i);
    while (
      next &&
      i < next.index &&
      !(code.at(i) === " " || code.at(i) === "\t" || code.at(i) === "\n")
    ) {
      value += code.at(i++);
    }
    result.push({type: "invalid", value, index});
  }

  result.sort((a, b) => a.index - b.index);

  result.forEach((token) => {
    if (token.value === "{" || token.value === "(" || token.value === "[") {
      bracketStack.push({type: token.value, index: token.index});
    }

    if (token.value === "}" || token.value === ")" || token.value === "]") {
      const lastBracket = bracketStack.pop();

      if (!lastBracket) {
        errors.push({
          error: `Unexpected closing '${token.value}'`,
          index: token.index,
        });
      } else if (
        (token.value === "}" && lastBracket.type !== "{") ||
        (token.value === ")" && lastBracket.type !== "(") ||
        (token.value === "]" && lastBracket.type !== "[")
      ) {
        errors.push({
          error: `Mismatched '${lastBracket.type}' at index ${lastBracket.index} and '${token.value}' at index ${token.index}`,
          index: token.index,
        });
      }
    }
  });

  while (bracketStack.length > 0) {
    const unmatched = bracketStack.pop();
    errors.push({
      error: `Unmatched opening '${unmatched.type}'`,
      index: unmatched.index,
    });
  }

  return {tokens: result, errors: errors};
}

const getWhiteSpace = (index, src, next) => {
  if (!next) {
    return "";
  }
  for (let i = index; i < next.index; ++i) {
    if (src[i] === " " || src[i] === "\t") {
      return src[i];
    }
  }
  return "";
};

function generateHTML(tokens, src) {
  const tokenStyles = {
    comment: "color: #6fba95; font-style: italic;",
    string: "color: #0c8a21;",
    keyword: "color: #b310b0;",
    identifier: "color: #fbb125;",
    operator: "color: #aa1f1f;",
    number: "color: #767bff;",
    null: "color: #767bff;",
    undefined: "color: #767bff;",
    boolean: "color: #767bff;",
    bracket: "color: #FFF;",
    separator: "color: #ee6312;",
    invalid: "color: #FFF; background: #F00;",
  };

  const getPaintedToken = (i) =>
    `<span style="${tokenStyles[tokens[i].type]}">${
      tokens[i].value
    }</span>${getWhiteSpace(tokens[i].index, src, tokens[i + 1])}`;

  let htmlOutput = `<p style="white-space-collaps: break-spaces; white-space: pre; font-size: 16px; line-height: 20px; margin: 0;">`;
  let i = 0;
  let prevLine;

  for (
    let nextline = src.indexOf("\n");
    nextline >= 0 && i < tokens.length;
    ++i
  ) {
    if (tokens[i].index > nextline) {
      prevLine = nextline + 1;
      nextline = src.indexOf("\n", tokens[i].index + tokens[i].value.length);
      htmlOutput += `</p><p style="white-space-collaps: break-spaces; white-space: pre; font-size: 20px; line-height: 24px; margin: 0;">`;
    }
    while (src[prevLine] === " " || src[prevLine] === "\t") {
      htmlOutput += src[prevLine++];
    }
    htmlOutput += getPaintedToken(i);
  }

  while (i < tokens.length) {
    htmlOutput += getPaintedToken(i++);
  }

  return htmlOutput + "</p>";
}

const jsCode = `
function greet(name) {{
    /* Multi
    return 'nothing';
             line */#
    if (name) { // cool comment
        const a = "10" > 4 ? 123 : {x: null};@
        // const b = "10" > 4 ? 123 : {x: null};
        return "Hello, " + name;
    } else {
        let a = {name: 'World'}
        return "Hello, " + a.name + "!";@
    }
}
`;

const {tokens, errors} = syntaxAnalysis(jsCode);

const htmlOutput = generateHTML(tokens, jsCode);

document.body.innerHTML = `
<div style="display: flex; gap: 50px; justify-content: center; background: #1d1e2e; max-height: 100vh; max-width: 100vw; height: 100vh; width: 100vw;; padding: 48px; box-sizing: border-box;">
<div style="max-height: fit-content; padding: 16px; max-width: 360px; border-radius: 10px; background: #2d2e3e;">
${htmlOutput}
</div>
<div style="max-height: fit-content; padding: 16px; max-width: 360px; border-radius: 10px; background: #2d2e3e; color: #FFF;">
<pre>${JSON.stringify(errors, null, 2)}</pre>
</div>
</div>
`;
