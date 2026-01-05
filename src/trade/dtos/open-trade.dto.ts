import { IsString, IsNumber, IsIn } from 'class-validator';

export class OpenTradeDto {
  @IsString() asset: string;
  @IsNumber() amount: number;
//   @IsString() direction: string;
  @IsIn(['up', 'down']) direction: 'up' | 'down'; // up = Buy, down = Sell
  @IsString() type: string; // real, demo
}