import axios from 'axios';
import type {
  AdminMenuCategory,
  ToggleCategoryResponse,
  ToggleItemResponse,
} from '../types/admin';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export async function getAdminCategories(): Promise<AdminMenuCategory[]> {
  const { data } = await axios.get<{ categories: AdminMenuCategory[] }>(
    `${BASE}/staff/menu/categories`,
  );
  return data.categories;
}

export async function toggleItemAvailability(
  itemId: string,
  isAvailable: boolean,
): Promise<ToggleItemResponse> {
  const { data } = await axios.patch<ToggleItemResponse>(
    `${BASE}/staff/menu/items/${itemId}/availability`,
    { isAvailable },
  );
  return data;
}

export async function toggleCategoryActive(
  categoryId: string,
  isActive: boolean,
): Promise<ToggleCategoryResponse> {
  const { data } = await axios.patch<ToggleCategoryResponse>(
    `${BASE}/staff/menu/categories/${categoryId}/active`,
    { isActive },
  );
  return data;
}
