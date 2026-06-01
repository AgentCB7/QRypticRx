import { api } from './client';

export const prescriptionApi = {
  create: (data, token) => api.post('/api/prescriptions', data, token),
  list: (token) => api.get('/api/prescriptions', token),
  get: (id, token) => api.get(`/api/prescriptions/${id}`, token),
  verify: (data, token) => api.post('/api/prescriptions/verify', data, token),
  dispenseItem: (id, itemId, token) => api.post(`/api/prescriptions/${id}/items/${itemId}/dispense`, {}, token),
};
