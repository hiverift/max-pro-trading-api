import { PartialType } from '@nestjs/mapped-types';
import { CompleteKycDto } from './create-kyc.dto';

export class UpdateKycDto extends PartialType(CompleteKycDto) {}
