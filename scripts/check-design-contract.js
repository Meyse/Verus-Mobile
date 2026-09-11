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
  '`theme.typography.headlineMd` for the step title (28/36)',
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

if (failures.length > 0) {
  console.error('Design contract check failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Design contract check passed (${requiredFiles.length} canonical sources).`,
);
