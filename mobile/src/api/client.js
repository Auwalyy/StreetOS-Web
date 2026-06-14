import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://streetos-web.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  try {
    const stored = await AsyncStorage.getItem('streetos-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const stored = await AsyncStorage.getItem('streetos-auth');
        if (stored) {
          const { state } = JSON.parse(stored);
          if (state?.refreshToken) {
            const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, {
              refreshToken: state.refreshToken,
            });
            const newToken = data.data.token;
            const newRefresh = data.data.refreshToken;
            // Update storage
            const updated = { state: { ...state, token: newToken, refreshToken: newRefresh } };
            await AsyncStorage.setItem('streetos-auth', JSON.stringify(updated));
            original.headers.Authorization = `Bearer ${newToken}`;
            return api(original);
          }
        }
      } catch {
        await AsyncStorage.removeItem('streetos-auth');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
