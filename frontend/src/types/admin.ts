export interface AdminMenuItem {
  id: string;
  name: string;
  price: string;
  isAvailable: boolean;
  displayOrder: number;
}

export interface AdminMenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  items: AdminMenuItem[];
}

export interface ToggleItemResponse {
  itemId: string;
  name: string;
  isAvailable: boolean;
  updatedAt: string;
}

export interface ToggleCategoryResponse {
  categoryId: string;
  name: string;
  isActive: boolean;
  updatedAt: string;
}
