import {useEffect, useRef} from "react"
import {usePageVisible} from "./usePageVisible.js"

// 一条聚合 SSE 吃 4 类事件（event: status|log|startlog|sysinfo）。
// 多组件共享同一条连接（streamPool 按 cluster|level 复用）：面板从 4 条 SSE 降到 1 条。
// 页面隐藏时释放、恢复自动重连（usePageVisible）。
const streamPool = new Map() // "cluster|level" -> {es, cbs:Set}

export function useLiveStream(options) {
    const {cluster, level, onStatus, onLog, onStartLog, onSysInfo} = options
    const visible = usePageVisible()
    // 稳定 wrapper（Set 按身份去重，回调内容每渲染更新）
    const cbRef = useRef({})
    cbRef.current.onStatus = onStatus
    cbRef.current.onLog = onLog
    cbRef.current.onStartLog = onStartLog
    cbRef.current.onSysInfo = onSysInfo

    useEffect(() => {
        if (!visible) return
        const key = `${cluster || ''}|${level || ''}`
        let entry = streamPool.get(key)
        if (!entry) {
            const cbs = new Set()
            const es = new EventSource(`/api/game/live/stream?cluster=${encodeURIComponent(cluster || '')}&level=${encodeURIComponent(level || '')}`)
            es.addEventListener('status', (e) => {
                try {
                    const d = JSON.parse(e.data)
                    cbs.forEach(cb => cb.onStatus?.(d))
                } catch (err) {
                    console.log(err)
                }
            })
            es.addEventListener('log', (e) => cbs.forEach(cb => cb.onLog?.(e.data)))
            es.addEventListener('startlog', (e) => cbs.forEach(cb => cb.onStartLog?.(e.data, false)))
            es.addEventListener('startlog-hist', (e) => cbs.forEach(cb => cb.onStartLog?.(e.data, true)))
            es.addEventListener('sysinfo', (e) => {
                try {
                    const d = JSON.parse(e.data)
                    if (d.code === 200) cbs.forEach(cb => cb.onSysInfo?.(d.data))
                } catch (err) {
                    console.log(err)
                }
            })
            entry = {es, cbs}
            streamPool.set(key, entry)
        }
        entry.cbs.add(cbRef.current)
        return () => {
            entry.cbs.delete(cbRef.current)
            if (entry.cbs.size === 0) {
                entry.es.close()
                streamPool.delete(key)
            }
        }
    }, [cluster, level, visible])
}
