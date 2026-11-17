import {parse, format} from 'lua-json';
import {luaSafe} from './luaFormat';

// 保存时全量写回（文件=屏集）：把该世界目录项中文件缺失的补默认值。
// 只在保存动作里做——编辑时若就地灌默认键，"改回原值"会因新增键永远判脏。
// master 专管项仅主世界补（与显示规则一致）；模组项文件已有则保留。
export function fillLevelDefaults(level, dstWorldSetting, isMaster) {
    try {
        const data = parse(level.leveldataoverride || 'return {}');
        const loc = String(data.location || '');
        const world = loc.includes('volcano') ? 'volcano'
            : loc.includes('shipwrecked') ? 'shipwrecked'
                : (loc === 'cave' ? 'cave' : 'forest');
        const tree = dstWorldSetting && dstWorldSetting.zh && dstWorldSetting.zh[world];
        if (!tree) return level;
        data.overrides = data.overrides || {};
        for (const gk of ['WORLDGEN_GROUP', 'WORLDSETTINGS_GROUP']) {
            for (const c of Object.values(tree[gk] || {})) {
                for (const [k, v] of Object.entries(c.items || {})) {
                    if (v.master && !isMaster) continue;
                    if (!(k in data.overrides)) data.overrides[k] = v.value;
                }
            }
        }
        return {...level, leveldataoverride: format(luaSafe(data))};
    } catch (e) {
        return level; // 解析失败原样保存（转义修复后不应发生）
    }
}
