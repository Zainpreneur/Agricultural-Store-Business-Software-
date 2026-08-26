import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agri_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('agri_token');
      localStorage.removeItem('agri_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: { error?: string; details?: { path: string; message: string }[] } } };
  const data = anyErr?.response?.data;
  if (data?.details?.length) {
    return data.details.map((d) => `${d.path}: ${d.message}`).join('; ');
  }
  return data?.error || (err instanceof Error ? err.message : 'Something went wrong');
}
