import { IsNumber, IsString } from 'class-validator';

export class DepositDto {
  @IsNumber() amount: number;
  @IsString() method: string; // UPI, card, crypto
}