// 文件大小展示：<1GB 用 MB，否则 GB（存档管理/备份列表两表同款）
export function formatSize(bytes) {
    if (!bytes) return '0 MB'
    return bytes >= 1024 * 1024 * 1024
        ? `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
        : `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
