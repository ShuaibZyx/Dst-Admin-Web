import {http} from "../utils/http";

// 体检
export async function healthCheckApi() {
    const response = await http.get('/api/health/check')
    return response.data
}
export async function healthLastApi() {
    const response = await http.get('/api/health/last')
    return response.data
}
export async function healthSetStrictApi(strict) {
    const response = await http.post('/api/health/strict', {strict})
    return response.data
}

// 岛屿冒险预设
export async function iaPresetApi(mode) {
    const response = await http.post(`/api/cluster/level/preset/ia?mode=${mode}`)
    return response.data
}

// 模组订阅状态(海难/火山世界创建闸门)。
// 世界设置页多个 LevelViewer 实例（4 世界 × 2 页签）挂载时会批量查同一组 modId，
// 做 30s TTL 的 Promise 缓存去重；订阅状态变化最迟 30s 后反映，失败立即失效重查
const subCache = new Map()

export async function modSubscribedApi(modId, cluster) {
    const key = `${cluster || ''}|${modId}`
    const hit = subCache.get(key)
    if (hit && hit.exp > Date.now()) return hit.promise
    const promise = http.get(`/api/mod/subscribed/${modId}?cluster=${cluster || ''}`).then(r => r.data)
    promise.catch(() => subCache.delete(key))
    subCache.set(key, {exp: Date.now() + 30000, promise})
    return promise
}

// 直连代码
export async function directConnectApi(levelName) {
    const response = await http.get(`/api/share/direct-connect?levelName=${levelName}`)
    return response.data
}

// 直连配置（IP 三态/外部端口）
export async function directConnectConfigApi(config) {
    const response = await http.post('/api/share/direct-connect/config', config)
    return response.data
}

export async function healthGetStrictApi() {
    const response = await http.get('/api/health/strict')
    return response.data
}
