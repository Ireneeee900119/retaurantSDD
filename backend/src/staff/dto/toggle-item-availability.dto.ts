import { IsBoolean } from 'class-validator';

export class ToggleItemAvailabilityDto {
  @IsBoolean()
  isAvailable: boolean;
}
