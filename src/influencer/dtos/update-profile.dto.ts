import { IsString, IsOptional } from 'class-validator';

export class UpdateInfluencerDto {
  @IsOptional() @IsString() socialMediaLinks: string;
  @IsOptional() @IsString() audienceDetails: string;
}