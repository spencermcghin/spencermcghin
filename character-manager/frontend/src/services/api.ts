import axios from 'axios';
import { Character, CreateCharacterDTO } from '../types/Character';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const characterApi = {
  getAll: async (): Promise<Character[]> => {
    const response = await api.get<Character[]>('/characters');
    return response.data;
  },

  getById: async (id: string): Promise<Character> => {
    const response = await api.get<Character>(`/characters/${id}`);
    return response.data;
  },

  create: async (character: CreateCharacterDTO): Promise<Character> => {
    const response = await api.post<Character>('/characters', character);
    return response.data;
  },

  update: async (id: string, character: Partial<Character>): Promise<Character> => {
    const response = await api.put<Character>(`/characters/${id}`, character);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/characters/${id}`);
  },
};

export default api;
