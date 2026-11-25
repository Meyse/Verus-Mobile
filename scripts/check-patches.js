#!/usr/bin/env node
/*
  Runs after patch-package in postinstall. patch-package 6.2.1 can stop at a patch that does not
  apply (for example a changed patch over an already patched package) and still exit with 0 outside
  CI. The app then builds without that patch; for react-native-verus this means no light client.
  This script checks that every file in patches/ is applied (a reverse `git apply --check`) and
  exits with 1 if one is not. Fix: delete that package from node_modules and install again.
*/
const {spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const insideGit = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {cwd: root, encoding: 'utf8'});
if (insideGit.status !== 0) {
  console.warn('check-patches: not a git checkout, patch check skipped.');
  process.exit(0);
}

const patches = fs.readdirSync(path.join(root, 'patches')).filter(name => name.endsWith('.patch')).sort();
const notApplied = patches.filter(name => {
  const result = spawnSync('git', ['apply', '--check', '-R', path.join('patches', name)], {cwd: root, encoding: 'utf8'});
  return result.status !== 0;
});

if (notApplied.length > 0) {
  console.error(`check-patches: ${notApplied.length} patch(es) not applied:`);
  notApplied.forEach(name => console.error(`  patches/${name}`));
  console.error('Delete the named package from node_modules and run the install again.');
  process.exit(1);
}
console.log(`check-patches: all ${patches.length} patches applied.`);
