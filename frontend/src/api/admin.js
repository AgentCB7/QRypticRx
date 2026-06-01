import { api } from './client';

export const adminApi = {
  listApplications: (status, token) =>
    api.get(`/api/admin/applications${status ? `?status=${status}` : ''}`, token),
  getApplication: (id, token) => api.get(`/api/admin/applications/${id}`, token),
  approveApplication: (id, token) => api.post(`/api/admin/applications/${id}/approve`, {}, token),
  rejectApplication: (id, reason, token) =>
    api.post(`/api/admin/applications/${id}/reject`, { reason }, token),
};
