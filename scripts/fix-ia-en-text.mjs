import fs from 'node:fs';
import {execSync} from 'node:child_process';

// 一次性修复:en 海滩/火山文案从中文改英文
// 三源映射:IA Core 官方 ia_sc.po > DST 本体 chinese_s.po > 本体 CUSTOMIZATIONSCREEN > 手工兜底
// 映射由 scripts/build-zh2en-map.py 生成(幂等,可重跑)
// desc 档位:本体 SANDBOXMENU SLIDE 系(与森林 en 一致)

if (!fs.existsSync('.tmp-zh2en.json')) {
    execSync('python scripts/build-zh2en-map.py', {stdio: 'inherit'});
}
const {zh2en, key2en} = JSON.parse(fs.readFileSync('.tmp-zh2en.json', 'utf-8'));

// 手工兜底:仅两个官方 po 与本体 strings 均未覆盖的词(跑出 UNRESOLVED 后人工确认)
const manual = {
    '杂项': 'Misc',
    '生物以及刷新点': 'Creatures and Spawners',
    '敌对生物以及刷新点': 'Hostile Creatures and Spawners',
    'giants': 'Giants',
    '岛屿树木（所有）': 'Island Trees (All)',
    'DST船': 'DST Boats',
    'IA船': 'IA Boats',
};

// desc 9 档:本体 SLIDE 系(与森林 en desc 同源)
const descMap = {
    never: 'None', rare: 'Little', uncommon: 'Less', default: 'Default',
    often: 'More', mostly: 'Lots', always: 'Tons', insane: 'Insane', none: 'None',
};

function translate(text, key) {
    if (zh2en[text]) return zh2en[text];
    if (manual[text]) return manual[text];
    const uk = (key || '').toUpperCase();
    if (uk && key2en[uk]) return key2en[uk];
    return null;
}

const path = 'public/misc/dst_world_setting.json';
const dw = JSON.parse(fs.readFileSync(path, 'utf-8'));

let fixed = 0, unresolved = [];
function fixNode(node, key) {
    const t = node.text;
    const textCjk = /[一-鿿]/.test(String(t));
    if (textCjk) {
        const en = translate(t, key);
        if (en) {
            if (en !== node.text) fixed++;
            node.text = en;
        } else {
            unresolved.push({key, text: t});
        }
    }
    if (node.desc) {
        for (const [dv, label] of Object.entries(node.desc)) {
            node.desc[dv] = descMap[dv] || label;
        }
    }
}

for (const world of ['shipwrecked', 'volcano']) {
    for (const groupName of ['WORLDGEN_GROUP', 'WORLDSETTINGS_GROUP']) {
        for (const [g, grp] of Object.entries(dw.en[world][groupName])) {
            fixNode(grp, g);
            for (const [k, item] of Object.entries(grp.items)) {
                fixNode(item, k);
            }
        }
    }
}

if (unresolved.length) {
    console.error('UNRESOLVED:', JSON.stringify(unresolved, null, 1));
    process.exit(1);
}
fs.writeFileSync(path, JSON.stringify(dw, null, 1) + '\n');
console.log(`fixed ${fixed} texts, desc tiers rewritten`);
