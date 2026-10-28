import { IsBoolean } from 'class-validator';

export class ToggleCategoryActiveDto {
  @IsBoolean()
  isActive: boolean;
}
