import {updateModApi} from "../api/modApi.jsx";

// 单个模组更新的共用核心：调用更新接口并把最新信息合并进 modList
// 供 ModItem 单条更新与列表「逐条更新」共用，返回 {ok, msg}
export async function doUpdateMod(cluster, modid, lang, setModList) {
    const resp = await updateModApi(cluster, modid, lang)
    if (resp.code !== 200) {
        return {ok: false, msg: resp.msg || ''}
    }
    const newMod = resp.data
    newMod.installed = true
    setModList(current => {
        const index = current.findIndex(item => item.modid === newMod.modid)
        if (index === -1) {
            // 找不到对应条目时不误覆盖第一条
            return current
        }
        if (current[index].enable) {
            newMod.enable = true
        }
        const next = [...current]
        next[index] = newMod
        return next
    })
    return {ok: true, msg: ''}
}
