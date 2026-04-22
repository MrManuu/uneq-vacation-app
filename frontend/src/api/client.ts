import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send HTTP-only cookie
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      useAuthStore.getState().logout()
    }
    return Promise.reject(err)
  },
)

export default api
