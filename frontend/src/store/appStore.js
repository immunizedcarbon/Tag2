import { create } from 'zustand';

export const useAppStore = create((set) => ({
  selectedTitle: '',
  selectedText: '',
  selectedMetadata: null,
  geminiResult: null,
  setSelectedContent: ({ title, text, metadata }) =>
    set({ selectedTitle: title ?? '', selectedText: text ?? '', selectedMetadata: metadata ?? null }),
  clearSelectedContent: () => set({ selectedTitle: '', selectedText: '', selectedMetadata: null }),
  setGeminiResult: (result) => set({ geminiResult: result }),
  resetGeminiResult: () => set({ geminiResult: null }),
}));
