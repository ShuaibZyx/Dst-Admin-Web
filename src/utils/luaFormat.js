// lua-json 的 format() 不做字符串转义：多行文本（预设 desc 等）直接写进引号会产出
// 裸换行的非法 Lua。写回前统一做 Lua 引号转义。
// （用 fromCharCode 构造反斜杠，避免各层转义把字面量吃掉）
export function luaSafe(v) {
    const BS = String.fromCharCode(92);
    if (typeof v === 'string') {
        return v
            .split(BS).join(BS + BS)
            .split(String.fromCharCode(39)).join(BS + String.fromCharCode(39))
            .split(String.fromCharCode(13)).join(BS + 'r')
            .split(String.fromCharCode(10)).join(BS + 'n');
    }
    if (Array.isArray(v)) return v.map(luaSafe);
    if (v && typeof v === 'object') {
        const out = {};
        for (const [k, val] of Object.entries(v)) out[k] = luaSafe(val);
        return out;
    }
    return v;
}
