import axios from 'axios';
import type { MenuCategory } from '../types/menu';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export async function getMenu(): Promise<MenuCategory[]> {
  const { data } = await axios.get<MenuCategory[]>(`${BASE}/menu`);
  return data;
}
