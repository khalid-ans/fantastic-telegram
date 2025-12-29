import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
    baseURL: API_BASE_URL,
})

// Add Auth Interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Add Response Interceptor to handle global 401s (EXCEPT on login itself)
api.interceptors.response.use((response) => {
    return response;
}, (error) => {
    const isLoginPath = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginPath) {
        console.warn('Session expired or unauthorized. Logging out...');
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});

// ============================================
// Platform Auth API
// ============================================
export const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    return data
}

export const register = async (userData) => {
    const { data } = await api.post('/auth/signup', userData)
    return data
}

export const getMe = async () => {
    const { data } = await api.get('/auth/me')
    return data
}

export const saveTelegramConfig = async (config) => {
    const { data } = await api.post('/auth/save-telegram-config', config)
    return data
}

// ============================================
// Admin User API
// ============================================
export const getUsers = async () => {
    const { data } = await api.get('/users')
    return data
}

export const updateApproval = async (userId, isApproved) => {
    const status = isApproved ? 'approved' : 'rejected'
    const { data } = await api.patch(`/users/${userId}/status`, { status })
    return data
}

export const deleteUser = async (userId) => {
    const { data } = await api.delete(`/users/${userId}`)
    return data
}

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
export const getTasks = async (userId = '') => {
    const params = userId ? { userId } : {}
    const { data } = await api.get('/tasks', { params })
    return data
}

export const getTask = async (taskId) => {
    const { data } = await api.get(`/tasks/${taskId}`)
    return data
}

export const scheduleTask = async (taskData) => {
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

export const clearHistory = async (all = false) => {
    const params = all ? { all: 'true' } : {}
    const { data } = await api.delete('/tasks/history', { params })
    return data
}

// ============================================
// Telegram Auth API (Microservice Bridge)
// ============================================
export const sendAuthCode = async (phoneNumber) => {
    const { data } = await api.post('/telegram-auth/send-code', { phoneNumber })
    return data
}

export const signInTelegram = async (phone, code, phoneCodeHash) => {
    const { data } = await api.post('/telegram-auth/sign-in', { phone, code, phoneCodeHash })
    return data
}

export const getAuthStatus = async () => {
    const { data } = await api.get('/telegram-auth/status')
    return data
}

export const logoutTelegram = async () => {
    const { data } = await api.post('/telegram-auth/logout')
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

export const getGrowthMetrics = async ({ channelId, days }) => {
    if (!channelId) return []
    const { data } = await api.post('/analytics/growth', { channelId, days })
    return data
}

export default api
