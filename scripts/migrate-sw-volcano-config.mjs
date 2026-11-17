// 海难/火山世界配置补齐迁移（一次性）：
// 1) 核心项(森林/洞穴有)→ 复制到海难/火山对应分组(核心图集 UV+文案+默认值)
// 2) 专有项(热带季节/中毒/岩浆等)→ 新建(船难图集徽章 UV + 文案/值域)
// 3) 火山模板补 override；海难模板补 balatro/tides/yellowcrocodog
// 4) 分组 atlas 元数据按 UV 来源(核心 2048x2048 / 船难 2048x1024)
import fs from 'node:fs';

const jsonPath = 'public/misc/dst_world_setting.json';
const dw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const langs = ['zh', 'en'];

const COLS = 16, ROWS = 8; // 船难图集网格
const uv = (c, r) => ({ x: c / COLS, y: r / ROWS });

function locate(key) {
    for (const world of ['forest', 'cave']) {
        for (const gn of ['WORLDGEN_GROUP', 'WORLDSETTINGS_GROUP']) {
            const node = dw.zh?.[world]?.[gn] || {};
            for (const [g, grp] of Object.entries(node)) {
                if (grp && typeof grp === 'object' && grp.items && grp.items[key]) {
                    return { world, gn, g, item: grp.items[key], atlas: grp.atlas, order: grp.order, gtext: grp.text, gdesc: grp.desc };
                }
            }
        }
    }
    return null;
}

function ensureGroup(lang, world, gn, g, meta) {
    if (!dw[lang][world]) dw[lang][world] = {};
    if (!dw[lang][world][gn]) dw[lang][world][gn] = {};
    if (!dw[lang][world][gn][g] || typeof dw[lang][world][gn][g] !== 'object' || !('items' in dw[lang][world][gn][g])) {
        dw[lang][world][gn][g] = { text: meta.text, desc: meta.desc ?? null, order: meta.order, atlas: { ...meta.atlas }, items: {} };
    }
    return dw[lang][world][gn][g];
}

// 目标分组：核心项按森林分组名(全局/冒险家/活动/资源再生)，UV 来源核心图集
// 海难/火山专有项 → tropical_seasons(船难图集)
const coreTarget = {
    // 海难缺失核心项(38) -> [category, group]
    shipwrecked: {
        WORLDSETTINGS_GROUP: {
            global: ['autumn', 'beefaloheat', 'day', 'ghostenabled', 'ghostsanitydrain', 'krampus', 'portalresurection', 'resettime', 'spawnmode', 'specialevent', 'spring', 'summer', 'winter'],
            survivors: ['brightmarecreatures', 'darkness', 'dropeverythingondespawn', 'extrastartingitems', 'healthpenalty', 'hunger', 'lessdamagetaken', 'seasonalstartingitems', 'shadowcreatures', 'spawnprotection', 'temperaturedamage'],
            events: ['crow_carnival', 'hallowed_nights', 'winters_feast', 'year_of_the_beefalo', 'year_of_the_bunnyman', 'year_of_the_carrat', 'year_of_the_catcoon', 'year_of_the_dragonfly', 'year_of_the_gobbler', 'year_of_the_pig', 'year_of_the_snake', 'year_of_the_varg'],
            regrowth: ['basicresource_regrowth'],
        },
        WORLDGEN_GROUP: {
            global: ['season_start'],
        },
    },
    volcano: {
        WORLDSETTINGS_GROUP: {
            global: ['day', 'ghostenabled'],
        },
        WORLDGEN_GROUP: {
            global: ['season_start', 'flint', 'rock_ice', 'houndmound', 'world_size'],
        },
    },
};

// 核心分组元数据(与森林同构：全局/冒险家/活动/资源再生)
const coreGroupMeta = {
    global: { text: '全局', desc: null, order: 0 },
    survivors: { text: '冒险家', desc: null, order: 2 },
    events: { text: '活动', desc: null, order: 1 },
    regrowth: { text: '资源再生', desc: null, order: 4 },
};

// 1) 复制核心项
for (const world of ['shipwrecked', 'volcano']) {
    for (const [gn, groups] of Object.entries(coreTarget[world])) {
        for (const [g, keys] of Object.entries(groups)) {
            for (const key of keys) {
                const loc = locate(key);
                if (!loc) { console.log(`!! 森林无 ${key}，跳过`); continue; }
                const atlasMeta = { ...loc.atlas }; // 核心图集 UV 须配核心 atlas 维度
                for (const lang of langs) {
                    const src = locate(key); // lang 用 zh/en 相同 UV；desc/value/text 从森林该 lang 取
                    const srcNode = dw[lang]?.[loc.world]?.[loc.gn]?.[loc.g]?.items?.[key] || loc.item;
                    const grp = ensureGroup(lang, world, gn, g, { text: coreGroupMeta[g].text, desc: coreGroupMeta[g].desc, order: coreGroupMeta[g].order, atlas: atlasMeta });
                    grp.atlas = atlasMeta;
                    grp.items[key] = JSON.parse(JSON.stringify(srcNode));
                }
            }
        }
    }
}

// 2) 专有项(船难图集徽章)
const seasonDesc = { noseason: '无此季', veryshortseason: '很短', shortseason: '短', default: '默认', longseason: '长', verylongseason: '很长', random: '随机' };
const seasonDescEn = { noseason: 'None', veryshortseason: 'Very Short', shortseason: 'Short', default: 'Default', longseason: 'Long', verylongseason: 'Very Long', random: 'Random' };
const boolDesc = { default: '默认', always: '总是', never: '从不', none: '无' };
const boolDescEn = { default: 'Default', always: 'Always', never: 'Never', none: 'None' };
const swAtlas = { width: 2048, height: 1024, item_size: 128 };

const specific = [
    // [world, category, group, key, cell, text_zh, text_en, desc_zh, desc_en, value]
    ['shipwrecked', 'WORLDSETTINGS_GROUP', 'tropical_seasons', 'mild', [13, 2], '温和季', 'Mild', seasonDesc, seasonDescEn, 'default'],
    ['shipwrecked', 'WORLDSETTINGS_GROUP', 'tropical_seasons', 'dry', [10, 1], '旱季', 'Dry', seasonDesc, seasonDescEn, 'default'],
    ['shipwrecked', 'WORLDSETTINGS_GROUP', 'tropical_seasons', 'monsoon', [14, 2], '季风季', 'Monsoon', seasonDesc, seasonDescEn, 'default'],
    ['shipwrecked', 'WORLDSETTINGS_GROUP', 'tropical_seasons', 'hurricane', [1, 2], '飓风季', 'Hurricane', seasonDesc, seasonDescEn, 'default'],
    ['shipwrecked', 'WORLDSETTINGS_GROUP', 'tropical_seasons', 'poison', [0, 4], '中毒', 'Poison', boolDesc, boolDescEn, 'default'],
    ['shipwrecked', 'WORLDSETTINGS_GROUP', 'tropical_seasons', 'poi', [7, 3], '兴趣点', 'Points of Interest', boolDesc, boolDescEn, 'default'],
    ['shipwrecked', 'WORLDGEN_GROUP', 'tropical_seasons', 'shipwrecked_season_start', [13, 3], '起始季节', 'Season Start', { default: '默认', mild: '温和季', dry: '旱季', monsoon: '季风季', hurricane: '飓风季' }, { default: 'Default', mild: 'Mild', dry: 'Dry', monsoon: 'Monsoon', hurricane: 'Hurricane' }, 'default'],
    ['volcano', 'WORLDSETTINGS_GROUP', 'tropical_seasons', 'dry', [10, 1], '旱季', 'Dry', seasonDesc, seasonDescEn, 'default'],
    ['volcano', 'WORLDSETTINGS_GROUP', 'tropical_seasons', 'lava', [8, 0], '岩浆', 'Lava', boolDesc, boolDescEn, 'default'],
    ['volcano', 'WORLDSETTINGS_GROUP', 'tropical_seasons', 'meteor', [10, 2], '陨石', 'Meteors', boolDesc, boolDescEn, 'default'],
    ['volcano', 'WORLDSETTINGS_GROUP', 'tropical_seasons', 'poisonous', [5, 2], '毒性', 'Poisonous', boolDesc, boolDescEn, 'default'],
    ['volcano', 'WORLDSETTINGS_GROUP', 'tropical_seasons', 'roar', [9, 0], '咆哮', 'Roar', boolDesc, boolDescEn, 'default'],
    ['volcano', 'WORLDGEN_GROUP', 'tropical_seasons', 'volcanoisland', [15, 4], '火山岛', 'Volcano Island', boolDesc, boolDescEn, 'default'],
];

for (const [world, gn, g, key, [c, r], tzh, ten, dzh, den, val] of specific) {
    for (const lang of langs) {
        const grp = ensureGroup(lang, world, gn, g, { text: lang === 'zh' ? '热带季节' : 'Tropical Seasons', desc: null, order: 5, atlas: swAtlas });
        grp.atlas = swAtlas;
        grp.items[key] = {
            text: lang === 'zh' ? tzh : ten,
            desc: lang === 'zh' ? dzh : den,
            value: val,
            image: uv(c, r),
        };
    }
}

fs.writeFileSync(jsonPath, JSON.stringify(dw, null, 2) + '\n', 'utf8');
console.log('dst_world_setting.json 迁移完成');

// 3) 海难模板补 balatro/tides/yellowcrocodog
const swTplPath = '../dst-admin-go-1.6.1/utils/levelConfigUtils/templates/shipwrecked_leveldataoverride.lua';
let swTpl = fs.readFileSync(swTplPath, 'utf8');
for (const [key, val] of [['balatro', 'default'], ['tides', 'default'], ['yellowcrocodog', 'default']]) {
    if (!new RegExp(`\\n  ${key}=`).test(swTpl)) {
        swTpl = swTpl.replace(/\n  \},/, `\n  ${key}="${val}",\n  },`);
    }
}
fs.writeFileSync(swTplPath, swTpl, 'utf8');
console.log('shipwrecked 模板补 3 项 override');

// 4) 火山模板补 override(31 项 UI 有但模板无)
const volTplPath = '../dst-admin-go-1.6.1/utils/levelConfigUtils/templates/volcano_leveldataoverride.lua';
let volTpl = fs.readFileSync(volTplPath, 'utf8');
const volUi = new Set();
for (const gn of ['WORLDGEN_GROUP', 'WORLDSETTINGS_GROUP']) {
    const node = dw.zh?.volcano?.[gn] || {};
    for (const [g, grp] of Object.entries(node)) {
        if (grp && typeof grp === 'object' && 'items' in grp) for (const k of Object.keys(grp.items || {})) volUi.add(k);
    }
}
const existing = new Set();
{
    const m = volTpl.match(/overrides=\{([\s\S]*?)\n  \}/);
    if (m) for (const line of m[1].split('\n')) { const mm = line.match(/^\s*([A-Za-z0-9_]+)=/); if (mm) existing.add(mm[1]); }
}
const toAdd = [...volUi].filter(k => !existing.has(k)).sort();
if (toAdd.length) {
    const lines = toAdd.map(k => `  ${k}="default",`).join('\n');
    volTpl = volTpl.replace(/\n  \},/, `\n${lines}\n  },`);
    fs.writeFileSync(volTplPath, volTpl, 'utf8');
}
console.log('volcano 模板补 override:', toAdd.join(','));
