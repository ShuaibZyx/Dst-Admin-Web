// 彩虹缩进的行首空白拆层（纯逻辑）：产出按【字符列】着色的区间，1 基、endCol 不含。
// tab 一个记一层、宽 1 字符（绝不把着色伸到代码列上）；空格按 unit 字符成层，不足整层的余数不着色。
export function indentUnits(ws, unit) {
    const out = [];
    let col = 1;
    let level = 0;
    for (let i = 0; i < ws.length;) {
        if (ws[i] === '\t') {
            out.push({startCol: col, endCol: col + 1, level});
            col += 1;
            level += 1;
            i += 1;
        } else {
            let run = 0;
            while (i < ws.length && ws[i] === ' ') {
                run += 1;
                i += 1;
            }
            for (let u = 0; u * unit + unit <= run; u++) {
                out.push({startCol: col + u * unit, endCol: col + (u + 1) * unit, level});
                level += 1;
            }
            col += run;
        }
    }
    return out;
}
