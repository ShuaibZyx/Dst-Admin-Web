import { http } from "../utils/http";

async function readDstConfigSync () {
    const url = '/api/dst/config'
    const data = await http.get(url)
    return data.data
}

async function writeDstConfigSync(params) {
    const url = '/api/dst/config'
    const data = await http.post(url, params)
    return data.data
}

async function getKv (key) {
    const url = `/api/kv?key=${key}`
    const data = await http.get(url)
    return data.data
}

async function saveKv(params) {
    const url = '/api/kv'
    const data = await http.post(url, params)
    return data.data
}

async function getClusters () {
    const data = await http.get('/api/dst/config/clusters')
    return data.data
}

async function listDirs (path) {
    const data = await http.get(`/api/fs/dirs?path=${encodeURIComponent(path || '')}`)
    return data.data
}

async function makeDir (path) {
    const data = await http.post('/api/fs/mkdir', {path})
    return data.data
}

async function checkSteamProfile (profile) {
    const data = await http.get(`/api/dst/steam/check?profile=${encodeURIComponent(profile)}`)
    return data.data
}

async function installStatusApi () {
    const data = await http.get('/api/dst/install/status')
    return data.data
}

async function modDownloadStatusApi () {
    const data = await http.get('/api/dst/mods/status')
    return data.data
}

export {
    readDstConfigSync,
    writeDstConfigSync,
    getKv,
    saveKv,
    checkSteamProfile,
    installStatusApi,
    modDownloadStatusApi,
    listDirs,
    getClusters,
    makeDir
}