import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class StartKycDto {
  @IsString() @IsNotEmpty() phone: string;
}

export class CompleteKycDto {
  @IsString() @IsNotEmpty() incomeBracket: string;
  @IsString() @IsNotEmpty() occupation: string;
  @IsString() @IsNotEmpty() panNumber: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsString() @IsNotEmpty() aadhaarNumber: string;
  @IsBoolean() @IsOptional() isPep?: boolean;
}

export class ReKycDto {
  @IsBoolean() @IsOptional() isPep?: boolean;
}