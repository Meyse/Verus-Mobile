#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/utils/amountInput.js'), 'utf8');
const appModule = {exports: {}};
new Function('module', source.replace(/export const /g, 'const ') +
  '\nmodule.exports = {editAmountInput, getAmountDecimalSeparator};')(appModule);
const {editAmountInput} = appModule.exports;
let cases = 0;
const check = (value, start, end, key, expected, cursor, separator = '.', maxLength = Infinity) => {
  assert.deepEqual(editAmountInput(value, {start, end}, key, separator, maxLength), {
    value: expected, selection: {start: cursor, end: cursor},
  });
  cases++;
};

check('', 0, 0, '1', '1', 1);
check('', 0, 0, 'decimal', '.', 1);
check('', 0, 0, 'decimal', ',', 1, ',');
check('1234', 2, 2, '9', '12934', 3);
check('1234', 1, 3, '9', '194', 2);
check('1234', 4, 4, 'delete', '123', 3);
check('1234', 0, 0, 'delete', '1234', 0);
check('0.001', 2, 5, 'delete', '0.', 2);
check('', 0, 0, 'delete', '', 0);
check('123', -4, -4, '9', '9123', 1);
check('123', 100, 100, '9', '1239', 4);
check('1.2', 3, 3, 'decimal', '1.2', 3);
check('1,2', 3, 3, 'decimal', '1,2', 3);
check('1,2', 1, 2, 'decimal', '1.2', 2);
check('123', 3, 3, 'x', '123', 3);
check('1234', 4, 4, '5', '1234', 4, '.', 4);
check('1234', 1, 2, '9', '1934', 2, '.', 4);
check('0.001202441266498501', 20, 20, 'delete', '0.00120244126649850', 19);

for (const separator of ['.', ',']) {
  let result = {value: '', selection: {start: 0, end: 0}};
  for (const digit of '0.001202441266498501') {
    result = editAmountInput(result.value, result.selection, digit === '.' ? 'decimal' : digit, separator);
  }
  assert.equal(result.value, separator === '.' ? '0.001202441266498501' : '0,001202441266498501');
  assert.deepEqual(result.selection, {start: 20, end: 20});
  cases++;
}

console.log(`Amount keypad: PASS (${cases} editing checks)`);
