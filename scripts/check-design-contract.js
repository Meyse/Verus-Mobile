const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const requiredFiles = [
  'DESIGN.md',
  'AGENTS.md',
  'TYPOGRAPHY.md',
  'src/theme/onboarding/tokens.js',
  'src/components/BottomSheetModal.js',
  'src/components/InfoSheet.js',
  'src/components/SelectionSheet.js',
  'src/components/SheetScrollView.js',
  'src/components/AppSearchField.js',
  'src/components/AppSearchLauncher.js',
  'src/components/CopyAction.js',
  'src/components/ProgressHeader.js',
  'src/components/SafeBottomActionStack.js',
  'src/components/ServiceManagerHeader.js',
  'src/components/SkeletonLoader.js',
  'src/components/TransactionResult.js',
  'src/styles/components/signedOutFlow.styles.js',
  'src/styles/components/signedOutSheet.styles.js',
  'src/containers/Onboard/CreateProfile/CreateProfile.js',
  'src/containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo.js',
  'src/containers/DeepLink/AppEncryptionRequestInfo/AppEncryptionRequestInfo.js',
  'src/containers/DeepLink/IdentityUpdateRequestInfo/IdentityUpdateRequestInfo.js',
  'src/containers/DeepLink/components/VerusIdIdentityPickerSheet/IdentityPickerSheet.js',
  'src/containers/DeepLink/components/RequestReview/DeepLinkRequestDetailsSheet.js',
  'src/containers/DeepLink/components/RequestReview/DeepLinkRequestSheetScaffold.js',
  'src/containers/Services/AddressBook/AddressBook.js',
  'src/containers/Services/AddressBook/AddressBookEditSheet.js',
  'src/containers/Services/ServiceComponents/GiftCardService/GiftCardFund/GiftCardFund.js',
  'src/containers/Services/ServiceComponents/GiftCardService/GiftCardServiceOverview/GiftCardServiceOverview.js',
  'src/containers/Settings/components/SettingsScaffold.js',
  'src/styles/deeplink/identityUpdateRequestInfo.styles.js',
];

const requiredDesignSections = [
  '## Scope',
  '## Core rules',
  '## Canonical pattern map',
  '## BottomSheets',
  '## Stepped tasks',
  '## Verification and evolution',
];

const requiredDesignFragments = [
  '12-point edge margins',
  '24-point radius',
  '76% chooser maximum height',
  '56 points high',
  '18-point radius',
  '16-point horizontal padding',
  '4-point vertical spacing',
  '62-point minimum height',
  '78% maximum height',
  '56-point quiet Done action',
  'between back and close, in `theme.typography.titleSheet`',
  'Do not show a large step title below the header.',
  '20-point horizontal content inset',
  '24-point top inset',
  '28-point bottom',
  '20-point form inset',
];

const requiredSourceFragments = [
  {
    path: 'src/theme/onboarding/tokens.js',
    fragments: ['headlineMd:', 'fontSize: 28', 'lineHeight: 36'],
  },
  {
    path: 'src/components/BottomSheetModal.js',
    fragments: ['marginHorizontal: 12', 'borderRadius: 24'],
  },
  {
    path: 'src/containers/DeepLink/IdentityUpdateRequestInfo/IdentityUpdateRequestInfo.js',
    fragments: [
      'STEP_REVIEW',
      'STEP_CONTENT',
      'STEP_HIGH_RISK',
      'STEP_CONFIRM_PAY',
      '<SafeBottomActionStack',
    ],
  },
  {
    path: 'src/styles/components/signedOutSheet.styles.js',
    fragments: [
      'paddingHorizontal: 20',
      'fontSize: 20',
      'minHeight: 62',
    ],
  },
  {
    path: 'src/containers/DeepLink/components/VerusIdIdentityPickerSheet/IdentityPickerSheet.js',
    fragments: [
      ": '76%'",
      'height: 56',
      'borderRadius: 18',
      'paddingHorizontal: 16',
      'marginVertical: 4',
      'fontSize: 16',
    ],
  },
  {
    path: 'src/containers/DeepLink/components/RequestReview/DeepLinkRequestDetailsSheet.js',
    fragments: ['maxHeight="78%"', 'title="Request details"'],
  },
  {
    path: 'src/components/InfoSheet.js',
    fragments: ['height={56}', 'variant="secondary"'],
  },
  {
    path: 'src/components/ProgressHeader.js',
    fragments: ['paddingLeft: insets.left + 24', 'height: 5'],
  },
  {
    path: 'src/containers/Services/ServiceComponents/GiftCardService/GiftCardFund/GiftCardFund.js',
    fragments: [
      'paddingHorizontal: 20',
      'paddingTop: 24',
      'paddingBottom: 28',
      'marginBottom: 22',
      'fontSize: 28',
    ],
  },
  {
    path: 'src/containers/Services/AddressBook/AddressBookEditSheet.js',
    fragments: ['paddingHorizontal: 20', 'height={56}'],
  },
];

const failures = [];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Missing design-contract source: ${relativePath}`);
  }
}

for (const sourceContract of requiredSourceFragments) {
  const sourcePath = path.join(root, sourceContract.path);

  if (!fs.existsSync(sourcePath)) continue;

  const source = fs.readFileSync(sourcePath, 'utf8');

  for (const fragment of sourceContract.fragments) {
    if (!source.includes(fragment)) {
      failures.push(
        `${sourceContract.path} drifted from documented mechanics: ${fragment}`,
      );
    }
  }
}

const designPath = path.join(root, 'DESIGN.md');
const agentsPath = path.join(root, 'AGENTS.md');
const ignorePath = path.join(root, '.gitignore');

if (fs.existsSync(designPath)) {
  const design = fs.readFileSync(designPath, 'utf8');
  const normalizedDesign = design.replace(/\s+/g, ' ');

  for (const section of requiredDesignSections) {
    if (!design.includes(section)) {
      failures.push(`DESIGN.md is missing required section: ${section}`);
    }
  }

  for (const fragment of requiredDesignFragments) {
    if (!normalizedDesign.includes(fragment)) {
      failures.push(`DESIGN.md lost documented mechanic: ${fragment}`);
    }
  }

  for (const relativePath of requiredFiles.slice(3)) {
    if (!design.includes(relativePath)) {
      failures.push(`DESIGN.md no longer routes agents to: ${relativePath}`);
    }
  }
}

if (fs.existsSync(agentsPath)) {
  const agents = fs.readFileSync(agentsPath, 'utf8');

  if (!agents.includes('## Mandatory Design Gate')) {
    failures.push('AGENTS.md is missing the mandatory design gate.');
  }

  if (!agents.includes('read `DESIGN.md` in full')) {
    failures.push('AGENTS.md no longer requires agents to read DESIGN.md.');
  }
}

if (fs.existsSync(ignorePath)) {
  const ignoredRoots = new Set(
    fs
      .readFileSync(ignorePath, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim().toLowerCase()),
  );

  for (const forbiddenPattern of ['/agents.md', '/design.md']) {
    if (ignoredRoots.has(forbiddenPattern)) {
      failures.push(`.gitignore must not ignore ${forbiddenPattern}.`);
    }
  }
}

// Say each fact once (DESIGN.md, Core rules). Two narrow copy rules catch the
// repeat that "Claim submitted" showed: a section label ("Submitted
// transactions") or a count line ("1 transaction submitted.") that states the
// title's outcome again. Each rule compares strings in one source file.
const repeatedFactFailures = (() => {
  const babel = require('@babel/core');
  const sourceRoot = path.join(root, 'src');
  const STATUS_WORD =
    /^(\w+ed|sent|done|ready|complete|failed|pending|broadcast|paid|claimed|funded|saved|removed|added|copied|created|opened|signed|found)$/i;
  const TITLE_STYLE =
    /(^|\s)(title|mainTitle|resultTitle|headerTitle|screenTitle)(\s|$)/;
  const LABEL_STYLE =
    /section(Title|Label)|fieldLabel|eyebrow|overline|groupLabel|summaryTitle/i;
  const COUNT_EXPRESSION = /length|count|Count|total/;
  const NEGATION = /\b(not|never|unable|cannot|failed)\b|n't\b/i;
  const PLACEHOLDER = '{…}';

  // "Submitted" and "submitted" share one stem, as do "saved" and "save".
  const stem = word => {
    const lower = word.toLowerCase().replace(/[^a-z]/g, '');
    if (lower.length <= 3) return lower;
    return lower
      .replace(/ies$/, 'y')
      .replace(/(sion|tion)s?$/, 't')
      .replace(/(ing|ed|es|s)$/, '')
      .replace(/([b-df-hj-np-tv-z])\1$/, '$1')
      .replace(/e$/, '');
  };
  const statusWords = text =>
    (text.match(/[A-Za-z][A-Za-z'-]+/g) || []).filter(word =>
      STATUS_WORD.test(word),
    );

  const literalText = node => {
    if (!node) return null;
    if (node.type === 'StringLiteral') return node.value;
    if (node.type === 'TemplateLiteral') {
      return node.quasis.map(quasi => quasi.value.cooked).join(PLACEHOLDER);
    }
    if (node.type === 'JSXText') return node.value.trim() || null;
    if (node.type === 'JSXExpressionContainer') {
      return literalText(node.expression);
    }
    if (node.type === 'ConditionalExpression') {
      const branches = [
        literalText(node.consequent),
        literalText(node.alternate),
      ].filter(Boolean);
      return branches.length > 0 ? branches.join(' | ') : null;
    }
    return null;
  };

  const styleNames = attributes => {
    const style = (attributes || []).find(
      attribute => attribute.name && attribute.name.name === 'style',
    );
    const names = [];
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (node.type === 'Identifier') names.push(node.name);
      for (const key of Object.keys(node)) {
        if (key !== 'loc' && key !== 'start' && key !== 'end') visit(node[key]);
      }
    };
    if (style) visit(style.value);
    return names.join(' ');
  };

  const functionName = functionPath => {
    if (!functionPath) return '';
    const {node, parentPath} = functionPath;
    if (node.id && node.id.name) return node.id.name;
    if (parentPath && parentPath.node.id && parentPath.node.id.name) {
      return parentPath.node.id.name;
    }
    return '';
  };

  // A Text that starts with a count ("{n} transactions submitted.").
  const countLineText = (children, source) => {
    const meaningful = children.filter(
      child => child.type !== 'JSXText' || child.value.trim().length > 0,
    );
    const first = meaningful[0];
    if (!first || first.type !== 'JSXExpressionContainer') return null;
    const expression = first.expression;

    if (expression.type === 'TemplateLiteral') {
      if (expression.quasis[0].value.cooked !== '') return null;
      if (expression.expressions.length === 0) return null;
      const counted = expression.expressions[0];
      if (!COUNT_EXPRESSION.test(source.slice(counted.start, counted.end))) {
        return null;
      }
      return literalText(expression);
    }

    if (!COUNT_EXPRESSION.test(source.slice(expression.start, expression.end))) {
      return null;
    }
    const rest = children
      .slice(children.indexOf(first) + 1)
      .map(child =>
        child.type === 'JSXText'
          ? child.value.replace(/\s+/g, ' ')
          : literalText(child) || PLACEHOLDER,
      )
      .join('')
      .trim();
    return rest ? `${PLACEHOLDER} ${rest}` : null;
  };

  const files = [];
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      if (/^(__tests__|__mocks__|node_modules)$/.test(entry.name)) continue;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(entryPath);
      else if (/\.js$/.test(entry.name)) files.push(entryPath);
    }
  };
  if (fs.existsSync(sourceRoot)) walk(sourceRoot);

  const hits = [];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes('<')) continue;

    let ast;
    try {
      ast = babel.parseSync(source, {
        babelrc: false,
        configFile: false,
        filename: file,
        sourceType: 'module',
        parserOpts: {plugins: ['jsx', 'flow', 'classProperties']},
      });
    } catch (_) {
      continue;
    }

    const relativeFile = path.relative(root, file);
    const titles = [];
    const labels = [];
    const counts = [];
    // Each branch of `ok ? 'Sent' : 'Not sent'` is its own string.
    const add = (list, text, line) =>
      text.split(' | ').forEach(part => list.push({text: part, line}));

    babel.traverse(ast, {
      ObjectProperty(propertyPath) {
        const {key, value} = propertyPath.node;
        const name = key && (key.name || key.value);
        if (name !== 'title') return;
        const text = literalText(value);
        if (text) add(titles, text, value.loc.start.line);
      },
      ReturnStatement(returnPath) {
        const name = functionName(returnPath.getFunctionParent());
        if (!/Title$/i.test(name) || /Sub/i.test(name)) return;
        const text = literalText(returnPath.node.argument);
        if (text) add(titles, text, returnPath.node.loc.start.line);
      },
      ArrowFunctionExpression(arrowPath) {
        const {body} = arrowPath.node;
        if (body.type === 'BlockStatement') return;
        const name = functionName(arrowPath);
        if (!/Title$/i.test(name) || /Sub/i.test(name)) return;
        const text = literalText(body);
        if (text) add(titles, text, body.loc.start.line);
      },
      JSXElement(elementPath) {
        const opening = elementPath.node.openingElement;
        const tag = opening.name.name || '';
        const titleAttribute = opening.attributes.find(
          attribute => attribute.name && attribute.name.name === 'title',
        );
        if (titleAttribute) {
          const text = literalText(titleAttribute.value);
          if (text) add(titles, text, opening.loc.start.line);
        }

        const children = elementPath.node.children;
        const childText = children
          .map(literalText)
          .filter(Boolean)
          .join(' ')
          .trim();
        const style = styleNames(opening.attributes);

        if (childText && (tag === 'RequestTitle' || TITLE_STYLE.test(style))) {
          add(titles, childText, opening.loc.start.line);
        }
        if (childText && LABEL_STYLE.test(style)) {
          add(labels, childText, opening.loc.start.line);
        }

        const countText = countLineText(children, source);
        if (countText && statusWords(countText).length > 0) {
          counts.push({text: countText, line: opening.loc.start.line});
        }
      },
    });

    // "Funding could not be verified" and "2 transactions verified." state
    // opposite facts, so only strings of the same polarity can repeat.
    const findRepeat = (text, sources) => {
      const negative = NEGATION.test(text);
      for (const word of statusWords(text)) {
        const match = sources.find(
          candidate =>
            NEGATION.test(candidate.text) === negative &&
            statusWords(candidate.text).some(
              other => stem(other) === stem(word),
            ),
        );
        if (match) return {word, match};
      }
      return null;
    };

    for (const label of labels) {
      const repeat = findRepeat(label.text, titles);
      if (repeat) {
        hits.push(
          `${relativeFile}:${label.line} section label "${label.text}" repeats "${repeat.word}" from the title "${repeat.match.text}" (line ${repeat.match.line}).`,
        );
      }
    }

    for (const count of counts) {
      const repeat = findRepeat(count.text, [...titles, ...labels]);
      if (repeat) {
        hits.push(
          `${relativeFile}:${count.line} count line "${count.text}" repeats "${repeat.word}" from "${repeat.match.text}" (line ${repeat.match.line}).`,
        );
      }
    }
  }

  return hits.map(
    hit =>
      `Say each fact once: ${hit} Remove the repeat; the title states the outcome. A transaction result uses src/components/TransactionResult.js.`,
  );
})();

failures.push(...repeatedFactFailures);

if (failures.length > 0) {
  console.error('Design contract check failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Design contract check passed (${requiredFiles.length} canonical sources).`,
);
