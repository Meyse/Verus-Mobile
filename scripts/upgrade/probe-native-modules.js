#!/usr/bin/env node
/*
  Smoke check S02 (docs/upgrade/smoke-checklist.md).
  Connects to the running Debug app through Metro's inspector (Chrome DevTools Protocol)
  and reports, for each native module the wallet uses, whether JS can reach it and how
  many members it exposes. It also reports the architecture the app runs on.
  It only reads module presence. It calls no module method.

  Usage: node scripts/upgrade/probe-native-modules.js [metroUrl]   (default http://localhost:8081)
*/
const http = require('http');
const WebSocket = require('ws');

const metro = process.argv[2] || 'http://localhost:8081';

const MODULES = [
  ['keychain', 'RNKeychainManager'],
  ['verus', 'VerusLightClient'],
  ['tcp', 'TcpSockets'],
  ['udp', 'UdpSockets'],
  ['randombytes', 'RNRandomBytes'],
  ['os', 'RNOS'],
  ['nfc', 'NfcManager'],
  ['camera', 'CameraView'],
  ['camera', 'CameraDevices'],
  ['iap (iOS)', 'RNIapIos'],
  ['iap (Android)', 'RNIapModule'],
  ['app (Android)', 'VerusBiometricEnrollment'],
  ['app', 'VerusKeepAwake'],
];

const EXPRESSION = `(() => {
  const g = globalThis;
  const names = ${JSON.stringify(MODULES.map(m => m[1]))};
  const get = (n) => {
    let v = null;
    try { v = g.nativeModuleProxy ? g.nativeModuleProxy[n] : null; } catch (e) {}
    if (!v && typeof g.__turboModuleProxy === 'function') {
      try { v = g.__turboModuleProxy(n); } catch (e) {}
    }
    return v;
  };
  const modules = {};
  for (const n of names) {
    const v = get(n);
    let members = 0;
    if (v) { try { members = Object.keys(v).length; } catch (e) {} }
    modules[n] = v ? members : -1;
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
  const ws = new WebSocket(target.webSocketDebuggerUrl);
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
  for (const [key, name] of MODULES) {
    const n = data.modules[name];
    console.log(`${n >= 0 ? 'PRESENT' : 'MISSING'}  ${key.padEnd(14)} ${name}${n >= 0 ? ` (${n} members)` : ''}`);
  }
})().catch(e => { console.error(`probe failed: ${e.message}`); process.exit(1); });
