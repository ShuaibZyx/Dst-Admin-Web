// @ts-ignore
import {http} from "../utils/http";

import {create} from 'zustand'

import {StateCreator} from 'zustand'

type Level = Record<string, any> // 替换成你的具体类型

interface LevelsStore {
    levels: Level[]
    getLevels: () => Level[]
    setLevels: (newLevels: Level[]) => void
    reFlushLevels: (cluster: string) => Promise<Level[]>
    // 状态刷新信号：任何启停操作后 bump,GameLevels 监听并立即拉一次世界状态,
    // 让总启动按钮与各世界开关同源联动(不再各自轮询滞后)
    statusTick: number
    tick: () => void
    // 启停操作进行中(uuid -> {op, at})：按钮锁定到真实状态确认(SSE 达标自动清除),
    // 5 分钟超时兜底。异步化后 API 秒回,UI 必须自己保持"启动中/停止中"直到世界真变。
    pendingOps: Record<string, { op: 'starting' | 'stopping', at: number }>
    setPendingOp: (uuid: string, op: 'starting' | 'stopping') => void
    clearPendingOps: (uuids?: string[]) => void
}

async function getLevelApi(cluster: string) {
    const url = '/api/cluster/level'
    const response = await http.get(url, {
        headers: {
            'Cluster': cluster,
        }
    })
    return response.data
}

// 假设这是从 API 获取数据的方法
const fetchLevelApi = async (cluster: string): Promise<Level[]> => {
    const levelResp = await getLevelApi(cluster)
    if (levelResp.code === 200) {
        return levelResp.data
    }
    return []
}

const store: StateCreator<LevelsStore> = (set, get) => ({
    levels: [],
    getLevels: () => get().levels,
    // setLevels 内嵌 pending 确认：真实状态达标即解锁按钮（SSE/轮询数据驱动，零轮询等待）
    // 归一化：所有写入方统一世界形状（key=uuid；status/Ps 缺省时沿用旧值）——
    // 否则 Mod 页 reFlushLevels 写入的原始 level 列表会冲掉 status/key，
    // 服务端日志页的渲染门（level.status）从此恒假，日志不显示
    setLevels: (newLevels) => set((state) => {
        const prevByUuid: Record<string, Level> = {}
        for (const l of state.levels) {
            prevByUuid[l.uuid || l.key || ''] = l
        }
        newLevels = newLevels.map((l) => {
            const prev = prevByUuid[l.uuid || l.key || ''] || {}
            return {
                ...prev,
                ...l,
                key: l.key ?? l.uuid,
                status: l.status ?? prev.status,
                Ps: l.Ps ?? prev.Ps,
                ps: l.ps ?? prev.ps,
            }
        })
        const pending = {...state.pendingOps}
        const now = Date.now()
        for (const l of newLevels) {
            const p = pending[l.uuid]
            if (!p) continue
            // stopping 的确认=status false（真停了）。
            // starting 的确认不能用 status true（进程活着≠能玩——初始化还要 2-3 分钟），
            // 由就绪标志（Reset() returning → 进度 100%）显式 clearPendingOps 确认。
            if (p.op === 'stopping' && !l.status) {
                delete pending[l.uuid]
            } else if (now - p.at > 5 * 60 * 1000) {
                delete pending[l.uuid] // 超时兜底，避免按钮永久锁死
            }
        }
        return {levels: newLevels, pendingOps: pending}
    }),
    reFlushLevels: async (cluster: string) => {
        const newLevels = await fetchLevelApi(cluster)
        get().setLevels(newLevels)
        return newLevels
    },
    statusTick: 0,
    tick: () => set({statusTick: get().statusTick + 1}),
    pendingOps: {},
    setPendingOp: (uuid, op) => set((state) => ({
        pendingOps: {...state.pendingOps, [uuid]: {op, at: Date.now()}}
    })),
    clearPendingOps: (uuids) => set((state) => {
        if (!uuids) return {pendingOps: {}}
        const pending = {...state.pendingOps}
        for (const u of uuids) delete pending[u]
        return {pendingOps: pending}
    }),
})

export const useLevelsStore = create(store)