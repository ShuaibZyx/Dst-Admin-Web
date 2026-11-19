import {http} from "../utils/http";

async function listSaves () {
    const data = await http.get('/api/game/save/list')
    return data.data
}

async function detectSaves () {
    const data = await http.get('/api/game/save/detect')
    return data.data
}

async function uploadSaveFolder (formData) {
    const data = await http.post('/api/game/save/upload-folder', formData)
    return data.data
}

async function moveSaves (sources) {
    const data = await http.post('/api/game/save/move', {sources})
    return data.data
}

async function deleteSave (name) {
    const data = await http.post('/api/game/save/delete', {name})
    return data.data
}

// 在服务端文件管理器中打开「所在文件夹」（kind=save|backup，后端白名单解析根路径）。
// path=条目定位（绝对路径或根下相对路径）：打开其所在目录并选中；缺省打开整个根目录
async function openFolder (kind, path) {
    const data = await http.get('/api/fs/open', {params: path ? {kind, path} : {kind}})
    return data.data
}

export {
    listSaves,
    detectSaves,
    uploadSaveFolder,
    moveSaves,
    deleteSave,
    openFolder
}
