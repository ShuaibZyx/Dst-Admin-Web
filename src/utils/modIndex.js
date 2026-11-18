import {parse} from 'lua-json';

// modoverrides.lua 的模组块行号索引与搜索匹配（纯逻辑，供可视化栏联动/配色/搜索用）。
// 行号 1 基、endLine 含尾。id 列表以 parse 的顶层键为权威，行号按原文正则回查——
// 缩进最浅的匹配行视为顶层块首行（防 configuration_options 内嵌同名键冒充）。
export function buildModIndex(text) {
    let ids;
    try {
        const data = parse(text || '');
        if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
        ids = Object.keys(data);
    } catch {
        return [];
    }
    if (ids.length === 0) return [];

    const lines = (text || '').split(/\r?\n/);
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const blocks = [];
    for (const id of ids) {
        // ["id"] = { / ['id'] = { / "id" = { / id = { 均视为块首行
        const re = new RegExp(`^\\s*\\[?\\s*["']?${escape(id)}["']?\\s*\\]?\\s*=\\s*\\{`);
        let best = -1;
        let bestIndent = Infinity;
        for (let i = 0; i < lines.length; i++) {
            const m = lines[i].match(re);
            if (m) {
                const indent = lines[i].match(/^\s*/)[0].length;
                if (indent < bestIndent) {
                    bestIndent = indent;
                    best = i;
                }
            }
        }
        if (best >= 0) blocks.push({id, startLine: best + 1, endLine: 0});
    }

    blocks.sort((a, b) => a.startLine - b.startLine);
    for (let i = 0; i < blocks.length; i++) {
        blocks[i].endLine = i + 1 < blocks.length ? blocks[i + 1].startLine - 1 : lines.length;
    }
    return blocks;
}

// 搜索匹配：id 或 name 任一包含 query（大小写不敏感子串）；空白 query 恒真
export function modMatches(id, name, query) {
    const needle = (query || '').trim().toLowerCase();
    if (!needle) return true;
    return id.toLowerCase().includes(needle) || (name || '').toLowerCase().includes(needle);
}
