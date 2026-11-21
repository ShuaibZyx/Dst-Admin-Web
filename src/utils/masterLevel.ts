import {parse} from 'lua-json';

// 「主世界」判定 —— 与 server.ini 的 [SHARD] is_master 是两件事：
//
//   * is_master(server_ini)＝集群主分片权威，全集群只有一个为 true，
//     决定谁是 shard 网络的主分片（写进 server.ini，不能乱开）。
//   * 主世界(master level)＝世界生成界面上「可配置 master_controlled 选项」的那些世界，
//     只影响面板里选项的显隐，不落盘。
//
// IA 的世界是成对的（modservercreationmain.lua 的配对逻辑）：
//   森林↔洞穴、海难↔火山，每对的槽位 1 是主世界（游戏 IsMasterLevel = location_index==1）。
//   即森林和海难各是自己那对的主世界，洞穴/火山是从世界。
//
// 为什么不能只看 server.ini：overlay 集群（把 IA 世界并进森林/洞穴存档，
// 见 Go 侧 GenerateIAPreset 的 overlay 模式「两世界均不抢主分片」）里，
// 海难的 is_master 是 false，但它的 leveldataoverride 里确实写着全套 master_controlled 项
// （含 mild/hurricane/monsoon/dry/shipwrecked_season_start）。用 is_master 判定就会把这些项藏掉。
//
// 规则：主世界类型恒显示 master 项；server.ini 的 is_master 为真时也显示
// （洞穴/火山可由此手动打开）。森林/海难无法关掉——按 IA 语义它们本就该有。
export const MASTER_LEVEL_TYPES = ['forest', 'shipwrecked'];

// 已解析出世界类型时用这个（LevelViewer 内部已有 levelType）
export function isMasterLevel(levelType?: string, serverIniIsMaster?: boolean): boolean {
    return !!serverIniIsMaster || MASTER_LEVEL_TYPES.includes(levelType || '');
}

// 只有 leveldataoverride 原文时用这个（与 isIAWorld/isClassicWorld 同源取 location，
// 兼容旧模板的 volcano 短名）；解析失败按非主世界处理，不弹 Lua 错误提示
export function isMasterLevelWorld(leveldataoverride?: string, serverIniIsMaster?: boolean): boolean {
    if (serverIniIsMaster) return true;
    try {
        const loc = (parse(leveldataoverride || '') as any)?.location || '';
        return MASTER_LEVEL_TYPES.some(t => loc === t || loc.includes(t));
    } catch {
        return false;
    }
}
