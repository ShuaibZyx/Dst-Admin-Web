import fs from 'node:fs';
import assert from 'node:assert/strict';

// 世界设置目录回归校验（配合 py-dst-cli/build_world_catalog.py 的产物）：
// 1) dst_world_setting.json 每个 WORLD*_GROUP 的直接子节点必须是合法分组(含 items),禁止 stray 键
// 2) 各语言间分组/item 键对等
// 3) 每个图集(分类级或 item 级)的格子必须 64px(LevelViewer 背景平绕窗口)，且 UV 落在网格内
// 4) en 文案不得残留中文
// 5) UV 金标准：已知图标落位(源 XML, v 翻转后)
// 6) LevelViewer 图集 URL 表必须带缓存击穿参数
// 7) modWorldOptions.json 注册表：UV/值域完整

const jsonPath = 'public/misc/dst_world_setting.json';
const regPath = 'src/types/modWorldOptions.json';

const dw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const langs = Object.keys(dw);

// atlas name -> 图片文件 + 头部尺寸来源（png/webp 实际像素）
const ATLAS_IMG = {
    'worldgen_customization': ['public/misc/worldgen_customization_game.webp', 1024, 512],
    'worldsettings_customization': ['public/misc/worldsettings_customization_game.webp', 1024, 1024],
    'customization_shipwrecked': ['public/misc/customization_shipwrecked.png', 1024, 512],
    'customization_core': ['public/misc/customization_core.png', 256, 128],
    'worldgen_cherry': ['public/misc/worldgen_cherry.png', 512, 256],
};

// --- 1) 无 stray 分组键 ---
for (const lang of langs) {
    for (const world of Object.keys(dw[lang])) {
        for (const groupName of ['WORLDGEN_GROUP', 'WORLDSETTINGS_GROUP']) {
            const node = dw[lang][world]?.[groupName];
            if (!node) continue;
            for (const [key, val] of Object.entries(node)) {
                assert.ok(
                    val && typeof val === 'object' && 'items' in val,
                    `${lang}/${world}/${groupName}/${key} 不是合法分组(缺 items)——stray 键会崩渲染`
                );
            }
        }
    }
}

// --- 2) 各语言结构对等 ---
const groupsOf = (lang, world, groupName) => {
    const node = dw[lang][world]?.[groupName] || {};
    return Object.keys(node).filter(k => node[k] && typeof node[k] === 'object' && 'items' in node[k]).sort();
};
for (const world of ['forest', 'cave', 'shipwrecked', 'volcano']) {
    for (const groupName of ['WORLDGEN_GROUP', 'WORLDSETTINGS_GROUP']) {
        const zhGroups = groupsOf('zh', world, groupName);
        for (const lang of langs) {
            assert.deepEqual(groupsOf(lang, world, groupName), zhGroups,
                `${lang}/${world}/${groupName} 分组键与 zh 不一致`);
            for (const g of zhGroups) {
                const zhItems = Object.keys(dw.zh[world][groupName][g].items).sort();
                assert.deepEqual(Object.keys(dw[lang][world][groupName][g].items).sort(), zhItems,
                    `${lang}/${world}/${groupName}/${g} item 键与 zh 不一致`);
            }
        }
    }
}

// --- 3) 图集 64px 格 + UV 网格内（item 级图集优先于分类级） ---
const pngSize = (file) => {
    const buf = fs.readFileSync(file);
    if (buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
        return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    }
    // webp: RIFF....WEBP + VP8X/VP8L/VP8
    assert.equal(buf.subarray(0, 4).toString('ascii'), 'RIFF', `${file} 不是 PNG/RIFF`);
    assert.equal(buf.subarray(8, 12).toString('ascii'), 'WEBP', `${file} 不是 webp`);
    const fmt = buf.subarray(12, 16).toString('ascii');
    if (fmt === 'VP8X') {
        const w = 1 + (buf.readUIntLE(24, 3));
        const h = 1 + (buf.readUIntLE(27, 3));
        return [w, h];
    }
    if (fmt === 'VP8 ') {
        return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
    }
    if (fmt === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)];
    }
    throw new Error(`${file} 未知 webp 变体 ${fmt}`);
};
const checkedAtlases = new Set();
const checkAtlasGrid = (atlas, where) => {
    const info = ATLAS_IMG[atlas.name];
    assert.ok(info, `${where} 引用未知图集 ${atlas.name}`);
    const cols = atlas.width / atlas.item_size;
    const rows = atlas.height / atlas.item_size;
    if (!checkedAtlases.has(atlas.name)) {
        checkedAtlases.add(atlas.name);
        const [w, h] = pngSize(info[0]);
        assert.equal(w / cols, 64, `${atlas.name} 图集格宽应 64px(CSS 平绕窗口),实为 ${w / cols} (图 ${w}, 格 ${cols})`);
        assert.equal(h / rows, 64, `${atlas.name} 图集格高应 64px,实为 ${h / rows}`);
        assert.equal(info[1], w, `${info[0]} 实际宽 ${w} 与登记 ${info[1]} 不符`);
        assert.equal(info[2], h, `${info[0]} 实际高 ${h} 与登记 ${info[2]} 不符`);
    }
    return {cols, rows};
};
for (const lang of langs) {
    for (const world of Object.keys(dw[lang])) {
        for (const groupName of ['WORLDGEN_GROUP', 'WORLDSETTINGS_GROUP']) {
            for (const [g, grp] of Object.entries(dw[lang][world]?.[groupName] || {})) {
                checkAtlasGrid(grp.atlas, `${lang}/${world}/${groupName}/${g}`);
                for (const [key, item] of Object.entries(grp.items)) {
                    assert.ok(item.image, `${lang}/${world}/${groupName}/${g}/${key} 缺 image 坐标`);
                    const atlas = item.atlas || grp.atlas;
                    const {cols, rows} = checkAtlasGrid(atlas, `${lang}/${world}/${groupName}/${g}/${key}`);
                    const col = Math.round(item.image.x * atlas.width / atlas.item_size);
                    const row = Math.round(item.image.y * atlas.height / atlas.item_size);
                    assert.ok(col >= 0 && col < cols && row >= 0 && row < rows,
                        `${lang}/${world}/${groupName}/${g}/${key} UV 越界(col=${col}, row=${row})`);
                }
            }
        }
    }
}

// --- 4) en 文案必须是英文 ---
const cjk = /[一-鿿]/;
for (const world of Object.keys(dw.en)) {
    for (const groupName of ['WORLDGEN_GROUP', 'WORLDSETTINGS_GROUP']) {
        for (const [g, grp] of Object.entries(dw.en[world]?.[groupName] || {})) {
            assert.ok(!cjk.test(String(grp.text)), `en/${world}/${groupName}/${g} 组名残留中文: ${grp.text}`);
            for (const [key, item] of Object.entries(grp.items)) {
                assert.ok(!cjk.test(String(item.text)), `en/${world}/${groupName}/${g}/${key} 名称残留中文: ${item.text}`);
                const desc = item.desc || grp.desc || {};
                for (const [dv, label] of Object.entries(desc)) {
                    assert.ok(!cjk.test(String(label)), `en/${world}/${groupName}/${g}/${key} 档位[${dv}]残留中文: ${label}`);
                }
            }
        }
    }
}

// --- 5) UV 金标准：已知图标落位(源 XML, v 翻转后) ---
const goldens = [
    ['shipwrecked', 'WORLDGEN_GROUP', 'misc', 'volcanoisland', 15, 4],
    ['shipwrecked', 'WORLDGEN_GROUP', 'animals', 'ballphin', 1, 0],
    ['shipwrecked', 'WORLDSETTINGS_GROUP', 'giants', 'kraken', 4, 2],
    ['shipwrecked', 'WORLDSETTINGS_GROUP', 'giants', 'tigershark', 10, 4],
    ['volcano', 'WORLDGEN_GROUP', 'resources', 'coffeebush', 14, 0],
    ['volcano', 'WORLDSETTINGS_GROUP', 'misc', 'dst_boats', 0, 0],
];
for (const [world, groupName, gname, key, wantCol, wantRow] of goldens) {
    const grp = dw.zh[world][groupName][gname];
    assert.ok(grp, `${world}/${groupName}/${gname} 分类不存在`);
    const item = grp.items[key];
    assert.ok(item, `${world}/${groupName}/${gname}/${key} 不存在`);
    const atlas = item.atlas || grp.atlas;
    const col = Math.round(item.image.x * atlas.width / atlas.item_size) + 0;
    const row = Math.round(item.image.y * atlas.height / atlas.item_size) + 0;
    assert.equal(col, wantCol, `${world}/${key} UV col=${col} 应为 ${wantCol}`);
    assert.equal(row, wantRow, `${world}/${key} UV row=${row} 应为 ${wantRow}(须已做 v 翻转)`);
}

// --- 6) LevelViewer 图集 URL 表必须带缓存击穿参数 ---
const viewerSrc = fs.readFileSync('src/pages/Level2/LevelViewer.tsx', 'utf-8');
const urlRefs = viewerSrc.match(/'[^']*\.(?:webp|png)(?:\?v=[^']*)?'/g) || [];
assert.ok(urlRefs.length >= 5, `ATLAS_URL 应覆盖 5 个图集,实际 ${urlRefs.length}`);
for (const ref of urlRefs) {
    assert.ok(/\?v=/.test(ref), `图集 URL 缺缓存击穿参数: ${ref}`);
}

// --- 7) 模组注册表完整性 ---
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
assert.ok(reg.options && reg.domains, 'modWorldOptions.json 结构应为 {domains, options}');
for (const [key, e] of Object.entries(reg.options)) {
    assert.ok(e.tab === 'WORLDGEN' || e.tab === 'WORLDSETTINGS', `${key} tab 非法`);
    assert.ok(e.group, `${key} 缺 group`);
    assert.ok(e.atlas?.name && e.uv, `${key} 缺图标信息`);
    assert.ok(reg.domains[e.descDomain], `${key} 值域 ${e.descDomain} 未登记`);
    assert.ok(e.text?.zh && e.text?.en, `${key} 缺双语名`);
    assert.ok(/^workshop-\d+$/.test(e.modId), `${key} modId 非法: ${e.modId}`);
    checkAtlasGrid(e.atlas, `registry/${key}`);
}

console.log('world-settings checks passed (atlases:', [...checkedAtlases].join(', '), ')');
