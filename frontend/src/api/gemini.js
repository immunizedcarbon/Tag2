import api from './client';

export const runGeminiTask = async ({ text, task, options }) => {
  const { data } = await api.post('/gemini', { text, task, options });
  return data;
};
