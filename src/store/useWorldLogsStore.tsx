// @ts-ignore
import {create} from 'zustand'
import {StateCreator} from 'zustand'

// 每世界独立的运行日志与启动/停止进度（各世界的日志互不串扰）。
// 数据来源：每个世界的 LiveStream 订阅（WorldLogCollector），
// 日志页切换世界时直接显示对应世界的缓冲，不必等新帧。

type Progress = { percent: number, label: string, failed: boolean }

interface WorldLogsStore {
    logs: Record<string, string[]>
    progress: Record<string, Progress>
    appendLog: (uuid: string, line: string) => void
    clearLog: (uuid: string) => void
    setProgress: (uuid: string, patch: Partial<Progress>) => void
    clearProgress: (uuids?: string[]) => void
}

const LOG_CAP = 3000 // 每世界日志缓冲上限（防内存无限涨）

const store: StateCreator<WorldLogsStore> = (set) => ({
    logs: {},
    progress: {},
    appendLog: (uuid, line) => set((state) => {
        const buf = [...(state.logs[uuid] || []), line]
        return {logs: {...state.logs, [uuid]: buf.length > LOG_CAP ? buf.slice(-LOG_CAP) : buf}}
    }),
    clearLog: (uuid) => set((state) => ({logs: {...state.logs, [uuid]: []}})),
    setProgress: (uuid, patch) => set((state) => {
        const prev = state.progress[uuid]
        // 进度单调递增（打点乱序/回跳时取最大），失败状态一旦置位保留到显式清除
        const percent = Math.max(patch.percent ?? 0, prev?.percent ?? 0)
        return {
            progress: {
                ...state.progress,
                [uuid]: {
                    percent,
                    label: patch.label ?? prev?.label ?? '',
                    failed: patch.failed ?? prev?.failed ?? false,
                },
            },
        }
    }),
    clearProgress: (uuids) => set((state) => {
        if (!uuids) return {progress: {}}
        const next = {...state.progress}
        for (const u of uuids) delete next[u]
        return {progress: next}
    }),
})

export const useWorldLogsStore = create(store)
