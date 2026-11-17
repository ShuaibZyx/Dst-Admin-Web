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

// 模组订阅状态(海难/火山世界创建闸门)
export async function modSubscribedApi(modId, cluster) {
    const response = await http.get(`/api/mod/subscribed/${modId}?cluster=${cluster || ''}`)
    return response.data
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
