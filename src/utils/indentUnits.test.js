import {test} from 'node:test';
import assert from 'node:assert/strict';
import {indentUnits} from './indentUnits.js';

test('indentUnits 空格按 unit 成层：4 空格 unit=4 一层', () => {
    assert.deepEqual(indentUnits('    ', 4), [{startCol: 1, endCol: 5, level: 0}]);
    assert.deepEqual(indentUnits('        ', 4), [
        {startCol: 1, endCol: 5, level: 0},
        {startCol: 5, endCol: 9, level: 1},
    ]);
});

test('indentUnits unit=2（lua-json 默认缩进）：4 空格是两层', () => {
    assert.deepEqual(indentUnits('    ', 2), [
        {startCol: 1, endCol: 3, level: 0},
        {startCol: 3, endCol: 5, level: 1},
    ]);
});

test('indentUnits 不足整层的余数不着色', () => {
    assert.deepEqual(indentUnits('   ', 2), [{startCol: 1, endCol: 3, level: 0}]);
});

test('indentUnits tab 每个记一层、宽 1 字符（不得伸到代码列上）', () => {
    assert.deepEqual(indentUnits('\t\t', 4), [
        {startCol: 1, endCol: 2, level: 0},
        {startCol: 2, endCol: 3, level: 1},
    ]);
});

test('indentUnits tab/空格混合与空串', () => {
    assert.deepEqual(indentUnits('\t    ', 4), [
        {startCol: 1, endCol: 2, level: 0},
        {startCol: 2, endCol: 6, level: 1},
    ]);
    assert.deepEqual(indentUnits('', 4), []);
});
