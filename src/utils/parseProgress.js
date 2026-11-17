// 从 SteamCMD 输出行解析进度百分比（多种格式兼容），解析不到返回 null
export function parsePercent(line) {
    if (!line) return null

    // [ 12%] Downloading ... / 常规百分号
    let m = line.match(/\[\s*(\d+(?:\.\d+)?)%\]/) || line.match(/(\d+(?:\.\d+)?)%/)
    if (m) return clamp(m[1])

    // Update state (...) progress: 45.67 (...)
    m = line.match(/progress:\s*(\d+(?:\.\d+)?)/)
    if (m) return clamp(m[1])

    // (25,893 / 204,800 KB) 或 (25893 of 204800 KB) 或 已下载 X，共 Y KB
    m = line.match(/\(([\d,]+)\s*(?:of|\/)\s*([\d,]+)\s*KB\)/) ||
        line.match(/已下载\s*([\d,]+)[，,]\s*共\s*([\d,]+)\s*KB/)
    if (m) {
        const a = parseFloat(m[1].replace(/,/g, ''))
        const b = parseFloat(m[2].replace(/,/g, ''))
        if (b > 0) return Math.min(100, Math.round(a / b * 100))
    }
    return null
}

function clamp(v) {
    return Math.min(100, Math.round(parseFloat(v)))
}

// 失败判定：[失败]… / 失败：… / "失败 N" 中 N>0（避免"失败 0"误标）
export function isFailLine(line) {
    if (!line) return false
    return line.startsWith('[失败]') || line.startsWith('失败') || /失败\s+[1-9]\d*/.test(line)
}

// 从启动日志行解析启动/停止进度（后端打点 [进度:NN%] 文本）。
// percent 取所有进度行最大值：并发启动多世界时打点交错,取最大保证进度条单调;
// label 取最后一条进度行文本;启动被拒/失败行置 failed。无可解析内容返回 null(进度条隐藏)。
export function parseStartProgress(lines) {
    if (!Array.isArray(lines) || lines.length === 0) return null
    let percent = null
    let label = ''
    let failed = false
    for (const raw of lines) {
        const line = String(raw || '')
        const m = line.match(/\[进度:(\d{1,3})%\]\s*(.*)/)
        if (m) {
            const p = clamp(m[1])
            if (percent === null || p > percent) percent = p
            label = m[2].trim()
            continue
        }
        if (isFailLine(line) || /被拒|下载失败/.test(line)) {
            failed = true
        }
    }
    if (percent === null && !failed) return null
    return {percent: percent ?? 0, label, failed}
}
