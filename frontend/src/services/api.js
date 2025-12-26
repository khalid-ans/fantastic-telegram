import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
    baseURL: API_BASE_URL,
})

// ============================================
// Folder API
// ============================================
export const getFolders = async () => {
    const { data } = await api.get('/folders')
    return data
}

export const createFolder = async (folderData) => {
    const { data } = await api.post('/folders', folderData)
    return data
}

export const updateFolder = async (id, folderData) => {
    const { data } = await api.put(`/folders/${id}`, folderData)
    return data
}

export const deleteFolder = async (id) => {
    const { data } = await api.delete(`/folders/${id}`)
    return data
}

export const getFolderEntities = async (id) => {
    const { data } = await api.get(`/folders/${id}/entities`)
    return data
}

// ============================================
// Entity API
// ============================================
export const getEntities = async (type = null) => {
    const params = type ? { type } : {}
    const { data } = await api.get('/entities', { params })
    return data
}

export const syncFromTelegram = async () => {
    const { data } = await api.post('/entities/sync-telegram')
    return data
}

export const syncEntities = async (entities) => {
    const { data } = await api.post('/entities/sync', { entities })
    return data
}

// ============================================
// Task API
// ============================================
export const getTasks = async () => {
    const { data } = await api.get('/tasks')
    return data
}

export const getTask = async (taskId) => {
    const { data } = await api.get(`/tasks/${taskId}`)
    return data
}

export const scheduleTask = async (taskData) => {
    // If taskData is FormData, let axios handle the Content-Type automatically (boundary)
    const { data } = await api.post('/tasks/schedule', taskData)
    return data
}

export const undoTask = async (taskId) => {
    const { data } = await api.post(`/tasks/${taskId}/undo`)
    return data
}

export const updateTaskMetrics = async (taskId) => {
    const { data } = await api.post(`/tasks/${taskId}/update-metrics`)
    return data
}

// ============================================
// Auth API
// ============================================
export const sendAuthCode = async (phoneNumber) => {
    const { data } = await api.post('/auth/send-code', { phoneNumber })
    return data
}

export const signIn = async (code) => {
    const { data } = await api.post('/auth/sign-in', { code })
    return data
}

export const getAuthStatus = async () => {
    const { data } = await api.get('/auth/status')
    return data
}

// ============================================
// Analytics API
// ============================================
export const exportAnalytics = async () => {
    const response = await api.get('/analytics/export', {
        responseType: 'blob'
    })
    return response.data
}

export default api
