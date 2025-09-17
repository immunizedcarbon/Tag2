import api from './client';

export const searchDataset = async ({ dataset, params }) => {
  const { data } = await api.post('/bundestag/search', { dataset, params });
  return data;
};

export const fetchDocument = async ({ dataset, documentId }) => {
  const { data } = await api.get(`/bundestag/${dataset}/${documentId}`);
  return data;
};
