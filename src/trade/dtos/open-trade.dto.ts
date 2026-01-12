import { IsString, IsNumber, IsIn } from 'class-validator';

export class OpenTradeDto {
  @IsString() asset: string;
  @IsNumber() amount: number;
//   @IsString() direction: string;
  @IsIn(['up', 'down']) direction: 'up' | 'down'; // up = Buy, down = Sell
  @IsString() type: string; // real, demo

  @IsNumber() expiryMinutes: number;

  @IsNumber()
@IsIn([60, 300, 900, 1800, 3600]) // 1min, 5min, 15min, 30min, 1hr
expirySeconds: number = 60;
}