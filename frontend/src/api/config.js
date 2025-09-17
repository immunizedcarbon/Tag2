import api from './client';

export const fetchConfig = async () => {
  const { data } = await api.get('/config');
  return data;
};

export const updateConfig = async (payload) => {
  const { data } = await api.post('/config', payload);
  return data;
};
