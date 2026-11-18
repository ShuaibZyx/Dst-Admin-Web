import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildModIndex, buildModNameMap, modIdAtLine, modMatches} from './modIndex.js';

// serialize 同构的 canonical 文本：10 行，workshop-1 起于 2 行、workshop-2 起于 6 行
const CANONICAL = [
    'return {',
    '    ["workshop-1"] = {',
    '        ["enabled"] = true,',
    '        ["configuration_options"] = {},',
    '    },',
    '    ["workshop-2"] = {',
    '        ["enabled"] = false,',
    '        ["configuration_options"] = {},',
    '    },',
    '}',
].join('\n');

test('buildModIndex canonical 两模组：startLine/endLine 按块区间', () => {
    assert.deepEqual(buildModIndex(CANONICAL), [
        {id: 'workshop-1', startLine: 2, endLine: 5},
        {id: 'workshop-2', startLine: 6, endLine: 10},
    ]);
});

test('buildModIndex 解析失败/空文本 → []', () => {
    assert.deepEqual(buildModIndex('return { ["x"] = '), []);
    assert.deepEqual(buildModIndex(''), []);
    assert.deepEqual(buildModIndex('return {}'), []);
});

test('buildModIndex 嵌套伪块不冒充顶层：只收 parse 的顶层键，startLine 取缩进最浅行', () => {
    // workshop-9 只是 configuration_options 里的普通键；workshop-1 在嵌套层还有一条同名
    const nested = [
        'return {',                                      // 1
        '    ["workshop-1"] = {',                        // 2 ← 缩进 4（应选这行）
        '        ["configuration_options"] = {',         // 3
        '            ["workshop-9"] = {',                // 4
        '                ["x"] = 1,',                    // 5
        '            },',                                // 6
        '            ["workshop-1"] = {',                // 7 ← 缩进 12（同名嵌套，不选）
        '                ["y"] = 2,',                    // 8
        '            },',                                // 9
        '        },',                                    // 10
        '    },',                                        // 11
        '}',                                             // 12
    ].join('\n');
    assert.deepEqual(buildModIndex(nested), [
        {id: 'workshop-1', startLine: 2, endLine: 12},
    ]);
});

test('modMatches：id/name 大小写不敏感子串，空 query 恒真', () => {
    assert.equal(modMatches('workshop-123', 'Insight', 'insight'), true);
    assert.equal(modMatches('workshop-123', 'Insight', '123'), true);
    assert.equal(modMatches('workshop-123', undefined, 'workshop-123'), true);
    assert.equal(modMatches('workshop-123', 'Insight', 'x'), false);
    assert.equal(modMatches('workshop-123', 'Insight', ''), true);
    assert.equal(modMatches('workshop-123', 'Insight', '   '), true);
});

test('modIdAtLine：块内行→块 id；块外行→null（块外不清活动态的判据）', () => {
    const blocks = buildModIndex(CANONICAL);
    assert.equal(modIdAtLine(blocks, 2), 'workshop-1');  // 块首行含
    assert.equal(modIdAtLine(blocks, 5), 'workshop-1');  // 块尾行含
    assert.equal(modIdAtLine(blocks, 6), 'workshop-2');
    assert.equal(modIdAtLine(blocks, 10), 'workshop-2');
    assert.equal(modIdAtLine(blocks, 1), null);          // return { 行在块外
    assert.equal(modIdAtLine([], 3), null);
});

test('buildModNameMap：裸数字 modid 与 workshop- 键双向可查（modoverrides 键带前缀）', () => {
    const map = buildModNameMap([{modid: '378160973', name: 'Global Positions'}]);
    assert.equal(map['378160973'], 'Global Positions');
    assert.equal(map['workshop-378160973'], 'Global Positions');
});

test('buildModNameMap：带前缀/本地 modid 与脏名处理', () => {
    const map = buildModNameMap([
        {modid: 'workshop-123', name: 'X'},
        {modid: 'client_mods_disabled', name: '禁用本地模组'},
        {modid: '9', name: '9'},          // 名字就是 id（后端 Name: modId 兜底脏行）→ 不建映射
        {modid: '8', name: ''},           // 无名 → 不建映射
        {name: 'no-modid'},               // 缺 modid → 跳过
    ]);
    assert.equal(map['workshop-123'], 'X');
    assert.equal(map['123'], 'X');
    assert.equal(map['client_mods_disabled'], '禁用本地模组');
    assert.equal('workshop-client_mods_disabled' in map, false);
    assert.equal('9' in map, false);
    assert.equal('8' in map, false);
    assert.deepEqual(buildModNameMap(null), {});
});
