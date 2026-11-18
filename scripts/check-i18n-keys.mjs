import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

// i18n 完整性闸门：任何界面文案键必须在全部语言包存在。
// 两类引用都要覆盖（此前只扫静态 t('key')，动态拼键被误删过两次）：
//   1) 静态：t('key') / i18n.t('key') —— 键名可含括号等任意字符
//   2) 动态：makeI18nLookupProxy([...keys], 'prefix', 'unknown') 之类的运行时拼键
// 用法：node scripts/check-i18n-keys.mjs

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'src');
const langs = ['zh', 'en', 'es', 'jp', 'kr'];

// ---- 收集源码 ----
const files = [];
(function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (p.includes(`${path.sep}locales${path.sep}`)) continue;
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p);
        else if (/\.(jsx?|tsx?)$/.test(name)) files.push(p);
    }
})(srcRoot);
const codeByFile = new Map(files.map(f => [f, fs.readFileSync(f, 'utf8')]));

// ---- 1) 静态键：t('key')，键名任意（含括号）；排除 get(/format( 等误匹配 ----
const literalKeys = new Set();
for (const src of codeByFile.values()) {
    for (const m of src.matchAll(/(?:^|[^\w.)])t\(\s*['"]([^'"]+)['"]/gm)) {
        literalKeys.add(m[1]);
    }
}

// ---- 2) 动态家族：makeI18nLookupProxy(<keys>, '<prefix>', '<unknown>') ----
const familyKeys = new Set();
for (const [file, src] of codeByFile) {
    for (const m of src.matchAll(/makeI18nLookupProxy\(\s*(\[[^\]]*\]|[A-Za-z_$][\w$]*)\s*,\s*['"]([\w.]+)['"]\s*,\s*['"](\w+)['"]\s*\)/g)) {
        const [, keyArg, prefix, unknown] = m;
        let keys = [];
        const arr = keyArg.match(/^\[([^\]]*)\]$/);
        if (arr) {
            keys = [...arr[1].matchAll(/['"]([^'"]*)['"]/g)].map(x => x[1]);
        } else {
            // 标识符：在同一文件里找 const <ident> = [...]
            const decl = src.match(new RegExp(`const\\s+${keyArg.trim()}\\s*=\\s*\\[([^\\]]*)\\]`));
            if (decl) keys = [...decl[1].matchAll(/['"]([^'"]*)['"]/g)].map(x => x[1]);
        }
        for (const k of [...keys, unknown]) {
            familyKeys.add(`${prefix}.${k === '' ? unknown : k}`);
        }
    }
}

// ---- 断言：所有键存在于全部语言包 ----
const locales = {};
for (const lang of langs) {
    locales[lang] = JSON.parse(fs.readFileSync(path.join(srcRoot, 'locales', 'lang', `${lang}.json`), 'utf8'));
}
const problems = [];   // zh/en 问题 = 硬失败（用户可见裸键的唯一来源，fallbackLng=en 只兜单语种缺失）
const warnings = [];   // es/jp/kr 翻译债 = 警告（fallbackLng 会兜到 en，不裸奔）
const allKeys = [...literalKeys, ...familyKeys];
for (const k of allKeys) {
    for (const lang of ['zh', 'en']) {
        if (!(k in locales[lang])) problems.push(`${lang} 缺键: ${k}`);
    }
    for (const lang of ['es', 'jp', 'kr']) {
        if (!(k in locales[lang])) warnings.push(`${lang} 缺键: ${k}`);
    }
}
// zh/en 键集互齐（防单边删漏）
for (const k of Object.keys(locales.zh)) {
    if (!(k in locales.en)) problems.push(`en 缺键(而 zh 有): ${k}`);
}
for (const k of Object.keys(locales.en)) {
    if (!(k in locales.zh)) problems.push(`zh 缺键(而 en 有): ${k}`);
}

if (warnings.length) {
    console.warn(`i18n 警告（翻译债，fallback 兜底不裸奔）：es/jp/kr 共 ${warnings.length} 处缺失`);
}
if (problems.length) {
    console.error('i18n 检查失败（zh/en 会导致界面裸键）:');
    for (const p of problems.slice(0, 40)) console.error('  ' + p);
    if (problems.length > 40) console.error(`  ...共 ${problems.length} 处`);
    process.exit(1);
}
console.log(`i18n 检查通过：静态键 ${literalKeys.size} 个、动态家族键 ${familyKeys.size} 个，zh/en 齐全`);
