export class MenuItemDto {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  displayOrder: number;
}

export class MenuCategoryDto {
  id: string;
  name: string;
  displayOrder: number;
  items: MenuItemDto[];
}
