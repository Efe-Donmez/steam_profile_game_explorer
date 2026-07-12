import { IsNotEmpty, IsString } from 'class-validator';

export class RefineRequestDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
