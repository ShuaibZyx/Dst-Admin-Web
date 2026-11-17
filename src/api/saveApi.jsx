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

export {
    listSaves,
    detectSaves,
    uploadSaveFolder,
    moveSaves,
    deleteSave
}
