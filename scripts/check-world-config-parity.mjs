import fs from 'node:fs';
import assert from 'node:assert/strict';

// 海难/火山世界配置完整度校验（与森林/洞穴同构）：
// 1) 模板 override（用户可配）必须都在 UI 有配置项（否则用户配不到该项）
// 2) UI 配置项必须都在模板 override 设定（否则创建世界时该项无默认）
// 结构性键（世界生成模式）除外。模板在后端仓库，dev 对齐校验跨仓库读取。

const dw = JSON.parse(fs.readFileSync('public/misc/dst_world_setting.json', 'utf8'));
const tplDir = '../dst-admin-go-1.6.1/utils/levelConfigUtils/templates';

function uiKeys(world) {
    const keys = new Set();
    for (const gn of ['WORLDGEN_GROUP', 'WORLDSETTINGS_GROUP']) {
        const node = dw.zh?.[world]?.[gn] || {};
        for (const [g, grp] of Object.entries(node)) {
            if (!grp || typeof grp !== 'object' || !('items' in grp)) continue;
            for (const k of Object.keys(grp.items || {})) keys.add(k);
        }
    }
    return keys;
}

function tplOverrides(file) {
    const src = fs.readFileSync(`${tplDir}/${file}`, 'utf8');
    const m = src.match(/overrides=\{([\s\S]*?)\n  \}/);
    const keys = new Set();
    if (m) {
        for (const line of m[1].split('\n')) {
            const mm = line.match(/^\s*([A-Za-z0-9_]+)=/);
            if (mm) keys.add(mm[1]);
        }
    }
    return keys;
}

// 结构性/世界生成模式键（非用户可配的自由项）
const structural = new Set(['layout_mode', 'task_set', 'start_location', 'prefabswaps_start', 'clocktype']);

for (const [world, file] of [
    ['shipwrecked', 'shipwrecked_leveldataoverride.lua'],
    ['volcano', 'volcano_leveldataoverride.lua'],
]) {
    const ui = uiKeys(world);
    const ov = tplOverrides(file);

    const missingUi = [...ov].filter(k => !structural.has(k) && !ui.has(k)).sort();
    assert.deepEqual(missingUi, [],
        `${world}: 模板 override 有但 UI 缺配置项（用户配不到）: ${missingUi.join(', ')}`);

    const missingTpl = [...ui].filter(k => !structural.has(k) && !ov.has(k)).sort();
    assert.deepEqual(missingTpl, [],
        `${world}: UI 有配置项但模板未设默认: ${missingTpl.join(', ')}`);
}

console.log('world-config parity checks passed');
