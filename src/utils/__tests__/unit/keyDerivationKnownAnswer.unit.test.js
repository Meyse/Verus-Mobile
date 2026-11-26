/**
 * Known-answer tests for the key derivation code that the app bundles.
 *
 * Every expected value below is copied from a published test vector, never
 * from running this code:
 * - PBKDF2-HMAC-SHA1: RFC 6070, section 2.
 * - PBKDF2-HMAC-SHA256: RFC 7914, section 11.
 * - BIP39 phrase to seed: the Trezor reference vectors
 *   (github.com/trezor/python-mnemonic, vectors.json, "english" list,
 *   passphrase "TREZOR"). These phrases are public test values.
 *
 * Module path: Metro resolves `pbkdf2` and `create-hash` through their
 * package.json `browser` field (`@react-native/metro-config` uses
 * resolverMainFields react-native, browser, main), so the app runs
 * `pbkdf2/browser.js`, `pbkdf2/lib/sync-browser.js` and
 * `create-hash/browser.js`, the pure JS implementations. Jest does not read
 * the `browser` field and would use Node's native crypto instead, so the
 * mocks below point Jest at the same files the app bundles. The first test
 * block checks that the repo Metro config still picks those files. The
 * app's `bip39` (the VerusCoin fork) then derives seeds through that code.
 */

jest.mock('pbkdf2', () => jest.requireActual('pbkdf2/browser'));
jest.mock('pbkdf2/lib/sync', () => jest.requireActual('pbkdf2/lib/sync-browser'));
jest.mock('create-hash', () => jest.requireActual('create-hash/browser'));

const path = require('path');
const pbkdf2 = require('pbkdf2');
const bip39 = require('bip39');

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const fromRepo = file => path.join(REPO_ROOT, file);

// Resolve an import the way the app bundle does: Metro's own resolver (the
// copy `metro` loads), the repo metro.config.js resolveRequest hook, main
// fields and extensions, and the real file system. Returns the file path.
const metroResolve = async (originFile, moduleName, platform) => {
  const fs = jest.requireActual('fs');
  const metroDir = path.dirname(require.resolve('metro/package.json'));
  const resolverPath = require.resolve('metro-resolver', {paths: [metroDir]});
  const {resolve} = jest.requireActual(resolverPath);
  const createDefaultContext = jest.requireActual(
    path.join(path.dirname(resolverPath), 'createDefaultContext'),
  );
  const {resolver} = await require('../../../../metro.config.js');

  const lookup = filePath => {
    try {
      const stat = fs.statSync(filePath);
      return {exists: true, type: stat.isDirectory() ? 'd' : 'f', realPath: fs.realpathSync(filePath)};
    } catch (error) {
      return {exists: false};
    }
  };
  const getPackage = file => {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      return null;
    }
  };
  const getPackageForModule = modulePath => {
    for (let dir = path.dirname(modulePath); dir !== path.dirname(dir); dir = path.dirname(dir)) {
      const packageJson = getPackage(path.join(dir, 'package.json'));
      if (packageJson != null) {
        return {packageJson, rootPath: dir, packageRelativePath: path.relative(dir, modulePath)};
      }
    }
    return null;
  };

  const context = createDefaultContext(
    {
      allowHaste: false,
      assetExts: new Set(resolver.assetExts),
      customResolverOptions: {},
      disableHierarchicalLookup: resolver.disableHierarchicalLookup,
      doesFileExist: file => lookup(file).type === 'f',
      extraNodeModules: resolver.extraNodeModules,
      fileSystemLookup: lookup,
      getPackage,
      getPackageForModule,
      isESMImport: false,
      mainFields: resolver.resolverMainFields,
      nodeModulesPaths: resolver.nodeModulesPaths,
      originModulePath: originFile,
      preferNativePlatform: true,
      resolveAsset: () => null,
      resolveHasteModule: () => null,
      resolveHastePackage: () => null,
      resolveRequest: resolver.resolveRequest,
      sourceExts: resolver.sourceExts,
      unstable_conditionNames: resolver.unstable_conditionNames,
      unstable_conditionsByPlatform: resolver.unstable_conditionsByPlatform,
      unstable_enablePackageExports: resolver.unstable_enablePackageExports,
      unstable_logWarning: () => {},
    },
    null,
  );
  const resolution = resolve(context, moduleName, platform);
  expect(resolution.type).toBe('sourceFile');
  return fs.realpathSync(resolution.filePath);
};

const ascii = value => Buffer.from(value, 'ascii');
const hex = value => value.replace(/\s+/g, '');

const pbkdf2Async = (password, salt, iterations, keylen, digest) =>
  new Promise((resolve, reject) => {
    pbkdf2.pbkdf2(password, salt, iterations, keylen, digest, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });

// RFC 6070, section 2. The c = 16777216 vector is left out: it takes
// minutes in the pure JS implementation.
const RFC6070_SHA1 = [
  ['password', 'salt', 1, 20, '0c 60 c8 0f 96 1f 0e 71 f3 a9 b5 24 af 60 12 06 2f e0 37 a6'],
  ['password', 'salt', 2, 20, 'ea 6c 01 4d c7 2d 6f 8c cd 1e d9 2a ce 1d 41 f0 d8 de 89 57'],
  ['password', 'salt', 4096, 20, '4b 00 79 01 b7 65 48 9a be ad 49 d9 26 f7 21 d0 65 a4 29 c1'],
  [
    'passwordPASSWORDpassword',
    'saltSALTsaltSALTsaltSALTsaltSALTsalt',
    4096,
    25,
    '3d 2e ec 4f e4 1c 84 9b 80 c8 d8 36 62 c0 e4 4a 8b 29 1a 96 4c f2 f0 70 38',
  ],
  ['pass\0word', 'sa\0lt', 4096, 16, '56 fa 6a a7 55 48 09 9d cc 37 d7 f0 34 25 e0 c3'],
];

// RFC 7914, section 11.
const RFC7914_SHA256 = [
  [
    'passwd',
    'salt',
    1,
    64,
    '55 ac 04 6e 56 e3 08 9f ec 16 91 c2 25 44 b6 05' +
      'f9 41 85 21 6d de 04 65 e6 8b 9d 57 c2 0d ac bc' +
      '49 ca 9c cc f1 79 b6 45 99 16 64 b3 9d 77 ef 31' +
      '7c 71 b8 45 b1 e3 0b d5 09 11 20 41 d3 a1 97 83',
  ],
  [
    'Password',
    'NaCl',
    80000,
    64,
    '4d dc d8 f6 0b 98 be 21 83 0c ee 5e f2 27 01 f9' +
      '64 1a 44 18 d0 4c 04 14 ae ff 08 87 6b 34 ab 56' +
      'a1 d4 25 a1 22 58 33 54 9a db 84 1b 51 c9 b3 17' +
      '6a 27 2b de bb a1 d0 78 47 8f 62 b3 97 f3 3c 8d',
  ],
];

// Trezor vectors.json, "english" entries 0, 3, 8, 12, 20 and 23:
// [entropy, mnemonic, seed]. Entries 8, 20 and 23 are longer than the
// 128-byte SHA-512 block, so they also cover the long-password HMAC path.
const TREZOR_PASSPHRASE = 'TREZOR';
const TREZOR_ENGLISH = [
  [
    '00000000000000000000000000000000',
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    'c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04',
  ],
  [
    'ffffffffffffffffffffffffffffffff',
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
    'ac27495480225222079d7be181583751e86f571027b0497b5b5d11218e0a8a13332572917f0f8e5a589620c6f15b11c61dee327651a14c34e18231052e48c069',
  ],
  [
    '0000000000000000000000000000000000000000000000000000000000000000',
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
    'bda85446c68413707090a52022edd26a1c9462295029f2e60cd7c4f2bbd3097170af7a4d73245cafa9c3cca8d561a7c3de6f5d4a10be8ed2a5e608d68f92fcc8',
  ],
  [
    '9e885d952ad362caeb4efe34a8e91bd2',
    'ozone drill grab fiber curtain grace pudding thank cruise elder eight picnic',
    '274ddc525802f7c828d8ef7ddbcdc5304e87ac3535913611fbbfa986d0c9e5476c91689f9c8a54fd55bd38606aa6a8595ad213d4c9c9f9aca3fb217069a41028',
  ],
  [
    '066dca1a2bb7e8a1db2832148ce9933eea0f3ac9548d793112d9a95c9407efad',
    'all hour make first leader extend hole alien behind guard gospel lava path output census museum junior mass reopen famous sing advance salt reform',
    '26e975ec644423f4a4c4f4215ef09b4bd7ef924e85d1d17c4cf3f136c2863cf6df0a475045652c57eb5fb41513ca2a2d67722b77e954b4b3fc11f7590449191d',
  ],
  [
    'f585c11aec520db57dd353c69554b21a89b20fb0650966fa0a9d6f74fd989d8f',
    'void come effort suffer camp survey warrior heavy shoot primary clutch crush open amazing screen patrol group space point ten exist slush involve unfold',
    '01f5bced59dec48e362f2c45b5de68b9fd6c92c6634f44d6d40aab69056506f0e35524a518034ddc1192e1dacd32c1ed3eaa3c3b131c88ed8e7e54c49a5d0998',
  ],
];

describe('key derivation known answers', () => {
  describe('module path matches what Metro bundles', () => {
    // [importing file, import specifier, file the Jest mocks above load]
    const BUNDLE_EDGES = [
      ['src/utils/services/WyreService.js', 'bip39', 'node_modules/bip39/src/index.js'],
      ['node_modules/bip39/src/index.js', 'pbkdf2', 'node_modules/pbkdf2/browser.js'],
      ['node_modules/bip39/src/index.js', 'create-hash', 'node_modules/create-hash/browser.js'],
      ['node_modules/pbkdf2/browser.js', './lib/sync', 'node_modules/pbkdf2/lib/sync-browser.js'],
      ['node_modules/pbkdf2/browser.js', './lib/async', 'node_modules/pbkdf2/lib/async.js'],
      ['node_modules/pbkdf2/lib/async.js', './sync', 'node_modules/pbkdf2/lib/sync-browser.js'],
    ];
    const cases = ['ios', 'android'].flatMap(platform =>
      BUNDLE_EDGES.map(([origin, name, expected]) => [platform, origin, name, expected]),
    );

    it.each(cases)('%s: %s imports %s as %s', async (platform, origin, name, expected) => {
      expect(await metroResolve(fromRepo(origin), name, platform)).toBe(fromRepo(expected));
    });

    it('the Jest mocks load those same files', () => {
      expect(require.resolve('bip39')).toBe(fromRepo('node_modules/bip39/src/index.js'));
      expect(require.resolve('pbkdf2/browser')).toBe(fromRepo('node_modules/pbkdf2/browser.js'));
      expect(require.resolve('pbkdf2/lib/sync-browser')).toBe(
        fromRepo('node_modules/pbkdf2/lib/sync-browser.js'),
      );
      expect(require.resolve('create-hash/browser')).toBe(fromRepo('node_modules/create-hash/browser.js'));
      expect(pbkdf2.pbkdf2Sync).toBe(jest.requireActual('pbkdf2/lib/sync-browser'));
      expect(require('create-hash')).toBe(jest.requireActual('create-hash/browser'));
      expect(require('create-hash')).not.toBe(require('crypto').createHash);
    });
  });

  describe('PBKDF2-HMAC-SHA1, RFC 6070', () => {
    it.each(RFC6070_SHA1)('P=%j S=%j c=%i dkLen=%i (sync)', (p, s, c, dkLen, dk) => {
      expect(pbkdf2.pbkdf2Sync(ascii(p), ascii(s), c, dkLen, 'sha1').toString('hex')).toBe(hex(dk));
    });

    it.each(RFC6070_SHA1)('P=%j S=%j c=%i dkLen=%i (async)', async (p, s, c, dkLen, dk) => {
      const key = await pbkdf2Async(ascii(p), ascii(s), c, dkLen, 'sha1');
      expect(key.toString('hex')).toBe(hex(dk));
    });
  });

  describe('PBKDF2-HMAC-SHA256, RFC 7914', () => {
    it.each(RFC7914_SHA256)('P=%j S=%j c=%i dkLen=%i (sync)', (p, s, c, dkLen, dk) => {
      expect(pbkdf2.pbkdf2Sync(ascii(p), ascii(s), c, dkLen, 'sha256').toString('hex')).toBe(hex(dk));
    });

    it.each(RFC7914_SHA256)('P=%j S=%j c=%i dkLen=%i (async)', async (p, s, c, dkLen, dk) => {
      const key = await pbkdf2Async(ascii(p), ascii(s), c, dkLen, 'sha256');
      expect(key.toString('hex')).toBe(hex(dk));
    });
  });

  describe('BIP39 phrase to seed through the app bip39, Trezor vectors', () => {
    afterEach(() => jest.restoreAllMocks());

    it.each(TREZOR_ENGLISH)('entropy %s: mnemonicToSeedSync', (entropy, mnemonic, seed) => {
      const spy = jest.spyOn(pbkdf2, 'pbkdf2Sync');
      expect(bip39.mnemonicToSeedSync(mnemonic, TREZOR_PASSPHRASE).toString('hex')).toBe(seed);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it.each(TREZOR_ENGLISH)('entropy %s: mnemonicToSeed', async (entropy, mnemonic, seed) => {
      const spy = jest.spyOn(pbkdf2, 'pbkdf2');
      const derived = await bip39.mnemonicToSeed(mnemonic, TREZOR_PASSPHRASE);
      expect(derived.toString('hex')).toBe(seed);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it.each(TREZOR_ENGLISH)('entropy %s: entropy and phrase round trip', (entropy, mnemonic) => {
      expect(bip39.validateMnemonic(mnemonic)).toBe(true);
      expect(bip39.entropyToMnemonic(entropy)).toBe(mnemonic);
      expect(bip39.mnemonicToEntropy(mnemonic)).toBe(entropy);
    });
  });
});
