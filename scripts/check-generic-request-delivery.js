#!/usr/bin/env node

const assert = require('node:assert');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {transformFileSync} = require('@babel/core');
const {
  AuthenticationResponseDetails,
  AuthenticationResponseOrdinalVDXFObject,
  CompactIAddressObject,
  GenericRequest,
  GenericResponse,
  ResponseURI,
  VerifiableSignatureData,
} = require('verus-typescript-primitives');

const systemId = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const signerId = 'iJitWFN8PY37GrBVtF38HyftG8WohWipbL';
const postUrl = 'http://127.0.0.1:18787/generic-response/live-vrsctest';
const redirectUrl =
  'https://example.invalid/generic-request-post-was-not-selected';

let postAttempts = 0;
let redirectAttempts = 0;
let postedBody = null;
const axiosMock = {
  post: async (url, body, options) => {
    postAttempts += 1;
    assert.strictEqual(url, postUrl);
    assert.strictEqual(
      options.headers['Content-Type'],
      'application/octet-stream',
    );
    postedBody = body;
    if (postAttempts === 1) {
      const error = new Error('intentional failure');
      error.response = {status: 503};
      throw error;
    }
    return {status: 204};
  },
};
const reactNativeMock = {
  Linking: {
    openURL: async () => {
      redirectAttempts += 1;
    },
  },
};

const loadAppModule = relativePath => {
  const filename = path.resolve(__dirname, '..', relativePath);
  const transformed = transformFileSync(filename, {
    configFile: path.resolve(__dirname, '../babel.config.js'),
  });
  const appModule = new Module(filename, module);
  appModule.filename = filename;
  appModule.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === 'axios') return axiosMock;
    if (request === 'react-native') return reactNativeMock;
    if (request === 'react-native-url-polyfill') return {URL};
    if (request === '../CoinData/CoinDirectory') {
      return {CoinDirectory: {getBasicCoinObj: () => ({})}};
    }
    if (request === '../CoinData/CoinData') {
      return {getSystemNameFromSystemId: () => 'VRSCTEST'};
    }
    if (request === '../api/channels/vrpc/callCreators') {
      return {signGenericResponse: async (_coin, response) => response};
    }
    if (request === '../api/channels/vrpc/requests/verifyGenericResponse') {
      return {verifyGenericResponse: async () => true};
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    appModule._compile(transformed.code, filename);
  } finally {
    Module._load = originalLoad;
  }
  return appModule.exports;
};

const main = async () => {
  const {
    deliverGenericResponse,
    GENERIC_REQUEST_DELIVERY_TYPES,
    getGenericRequestDeliveryInfo,
  } = loadAppModule('src/utils/deeplink/genericRequestDelivery.js');

  const request = new GenericRequest({
    responseURIs: [
      ResponseURI.fromUriString(postUrl, ResponseURI.TYPE_POST),
      ResponseURI.fromUriString(redirectUrl, ResponseURI.TYPE_REDIRECT),
    ],
  });
  const response = new GenericResponse({
    details: [
      new AuthenticationResponseOrdinalVDXFObject({
        data: new AuthenticationResponseDetails({
          requestID: CompactIAddressObject.fromAddress(signerId),
        }),
      }),
    ],
    signature: new VerifiableSignatureData({
      isTestnet: true,
      systemID: CompactIAddressObject.fromAddress(systemId),
      identityID: CompactIAddressObject.fromAddress(signerId),
      signatureAsVch: Buffer.alloc(65, 1),
    }),
  });
  response.setIsTestnet();
  response.setSigned();
  response.setFlags();

  const deliveryInfo = getGenericRequestDeliveryInfo(request);
  assert.strictEqual(deliveryInfo.type, GENERIC_REQUEST_DELIVERY_TYPES.POST);
  assert.strictEqual(deliveryInfo.uriString, postUrl);

  await assert.rejects(
    deliverGenericResponse(request, response),
    error =>
      error.isResponsePostError === true &&
      error.postStatus === 503 &&
      error.deliveryInfo.uriString === postUrl,
  );
  const retryResult = await deliverGenericResponse(request, response);
  assert.strictEqual(retryResult.postResult.status, 204);
  assert.strictEqual(postAttempts, 2);
  assert.strictEqual(redirectAttempts, 0);
  assert.deepStrictEqual(postedBody, response.toBuffer());
  assert.strictEqual(response.details.length, 1);

  const completionSource = fs.readFileSync(
    path.resolve(
      __dirname,
      '../src/containers/DeepLink/GenericRequestComplete/GenericRequestComplete.js',
    ),
    'utf8',
  );
  const onCancelBody = completionSource.match(
    /const onCancel = async \(\) => \{([\s\S]*?)\n  \};/,
  )?.[1];
  assert(onCancelBody, 'cancel handler must remain present');
  assert(onCancelBody.includes('if (shouldCancel)'));
  assert(onCancelBody.includes('completeRequest();'));
  assert(!onCancelBody.includes('markSavedPendingRequestComplete'));
  assert(completionSource.includes('{postFailed && ('));
  assert(
    completionSource.includes("if (e?.isResponsePostError) {\n        setPostFailed(true);"),
  );
  assert(
    completionSource.includes(
      'await completeGenericResponseDelivery({\n        requestBufferString,\n        responseBufferString,\n      });\n      await markSavedPendingRequestComplete();',
    ),
  );

  console.log(
    JSON.stringify(
      {
        passed: true,
        assertions: {
          postSelectedBeforeRedirect: true,
          materialResponseBodyPreserved: true,
          firstPostFailureTaggedForRetryUi: true,
          retrySucceeded: true,
          redirectNotOpenedWhenPostExists: true,
          cancelOnlyAfterPostFailure: true,
          leaveWithoutSendingDoesNotMarkPendingComplete: true,
          successfulDeliveryMarksPendingComplete: true,
        },
        postAttempts,
        redirectAttempts,
        materialDetailCount: response.details.length,
      },
      null,
      2,
    ),
  );
};

main().catch(error => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
