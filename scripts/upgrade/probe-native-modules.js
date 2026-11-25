#!/usr/bin/env node
/*
  Smoke check S02 (docs/upgrade/smoke-checklist.md).
  Connects to the running Debug app through Metro's inspector (Chrome DevTools Protocol)
  and reports, for each native module the wallet uses, whether JS can reach it and how
  many members it exposes. It also reports the architecture the app runs on.
  It only reads module presence. It calls no module method.
  It exits with 1 when a key or funds module is missing, or when a module does not
  expose its method as a function.

  Usage: node scripts/upgrade/probe-native-modules.js [metroUrl]   (default http://localhost:8081)
*/
const http = require('http');
const WebSocket = require('ws');

const metro = process.argv[2] || 'http://localhost:8081';

// [key, module name, one method the module exports]. Under the New Architecture, legacy
// modules are lazy interop objects with no enumerable keys, so the method is read by name.
const MODULES = [
  ['keychain', 'RNKeychainManager', 'getGenericPasswordForOptions'],
  ['verus', 'VerusLightClient', 'initialize'],
  ['tcp', 'TcpSockets', 'connect'],
  ['udp', 'UdpSockets', 'createSocket'],
  ['randombytes', 'RNRandomBytes', 'randomBytes'],
  ['os', 'RNOS', null],
  ['nfc', 'NfcManager', 'isSupported'],
  ['camera', 'CameraView', 'requestCameraPermission'],
  ['camera', 'CameraDevices', null],
  ['iap (iOS)', 'RNIapIos', 'endConnection'],
  ['iap (Android)', 'RNIapModule', 'initConnection'],
  ['app (Android)', 'VerusBiometricEnrollment', 'getEnrollmentBoundCredentialStatus'],
  ['app', 'VerusKeepAwake', 'activate'],
];

// The wallet cannot work without these, on both platforms.
const REQUIRED = ['RNKeychainManager', 'VerusLightClient', 'TcpSockets', 'UdpSockets', 'RNRandomBytes'];

const EXPRESSION = `(() => {
  const g = globalThis;
  const list = ${JSON.stringify(MODULES.map(m => [m[1], m[2]]))};
  const get = (n) => {
    let v = null;
    try { v = g.nativeModuleProxy ? g.nativeModuleProxy[n] : null; } catch (e) {}
    if (!v && typeof g.__turboModuleProxy === 'function') {
      try { v = g.__turboModuleProxy(n); } catch (e) {}
    }
    return v;
  };
  const modules = {};
  for (const [n, method] of list) {
    const v = get(n);
    if (!v) { modules[n] = null; continue; }
    let members = 0;
    try { members = Object.keys(v).length; } catch (e) {}
    let methodType = null;
    if (method) { try { methodType = typeof v[method]; } catch (e) { methodType = 'error'; } }
    modules[n] = { members, method, methodType };
  }
  return JSON.stringify({
    bridgeless: !!g.RN$Bridgeless,
    fabric: typeof g.nativeFabricUIManager !== 'undefined',
    turboModuleProxy: typeof g.__turboModuleProxy === 'function',
    modules,
  });
})()`;

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let body = '';
      res.on('data', c => (body += c));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  const targets = await getJson(`${metro}/json/list`);
  const target = targets.find(t => t.webSocketDebuggerUrl && /React Native|Hermes/i.test(`${t.title} ${t.description}`)) || targets[0];
  if (!target) throw new Error('No inspector target. Is the app running against this Metro?');
  // Metro 0.87 and newer refuse a debugger connection without a local Origin header.
  const ws = new WebSocket(target.webSocketDebuggerUrl, {headers: {Origin: new URL(metro).origin}});
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Runtime.evaluate timed out')), 15000);
    ws.on('message', raw => {
      const msg = JSON.parse(raw);
      if (msg.id === 1) { clearTimeout(timer); resolve(msg); }
    });
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: EXPRESSION, returnByValue: true } }));
  });
  ws.close();
  if (!result.result || !result.result.result) throw new Error(JSON.stringify(result));
  const data = JSON.parse(result.result.result.value);
  console.log(`target: ${target.title} (${target.description || ''})`);
  console.log(`bridgeless=${data.bridgeless} fabric=${data.fabric} turboModuleProxy=${data.turboModuleProxy}`);
  let failed = false;
  for (const [key, name] of MODULES) {
    const m = data.modules[name];
    if (!m) {
      const required = REQUIRED.includes(name);
      if (required) failed = true;
      console.log(`MISSING  ${key.padEnd(14)} ${name}${required ? ' (required)' : ''}`);
      continue;
    }
    const method = m.method ? `, ${m.method}: ${m.methodType}` : '';
    const broken = m.method && m.methodType !== 'function';
    if (broken) failed = true;
    console.log(`${broken ? 'BROKEN ' : 'PRESENT'}  ${key.padEnd(14)} ${name} (${m.members} enumerable members${method})`);
  }
  if (failed) process.exit(1);
})().catch(e => { console.error(`probe failed: ${e.message}`); process.exit(1); });
