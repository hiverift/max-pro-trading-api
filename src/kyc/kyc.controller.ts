import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { RolesGuard } from 'src/common/gaurds/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { KycService } from './kyc.service';
import { StartKycDto, CompleteKycDto, ReKycDto } from './dto/create-kyc.dto';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @UseGuards(JwtAuthGuard)
  @Post('start')
  async startKyc(@Req() req, @Body() dto: StartKycDto) {
    return this.kycService.startKyc(req.user.userId, dto.phone);
  }

  /**
   * Complete Standard KYC – PAN + Aadhaar upload (form-data)
   * Fields: incomeBracket, occupation, panNumber, aadhaarNumber, isPep (optional)
   * Files: documents (2 files max – PAN & Aadhaar)
   */
  @UseGuards(JwtAuthGuard)
  @Post('complete')
  @UseInterceptors(
    FilesInterceptor('documents', 2, {
      dest: './uploads/kyc',
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
          return cb(new BadRequestException('Only jpg/png/pdf allowed!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 6 * 1024 * 1024 }, // 6MB max
    }),
  )
  async completeKyc(
    @Req() req,
    @Body() dto: CompleteKycDto,
    @UploadedFiles() files: Express.Multer.File[], // ← Correct type
  ) {
    if (files.length !== 2) {
      throw new BadRequestException('Exactly 2 files required: PAN & Aadhaar');
    }

    const [panFile, aadhaarFile] = files;

    return this.kycService.completeKyc(req.user.userId, dto, {
      pan: panFile,
      aadhaar: aadhaarFile,
    });
  }

  /**
   * Re-KYC – Live Selfie Upload
   * Fields: isPep (optional)
   * Files: selfie (1 file)
   */
  @UseGuards(JwtAuthGuard)
  @Post('re-kyc')
  @UseInterceptors(
    FilesInterceptor('selfie', 1, {
      dest: './uploads/kyc/selfie',
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new BadRequestException('Only jpg/png allowed for selfie!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 6 * 1024 * 1024 },
    }),
  )
  async reKyc(
    @Req() req,
    @Body() dto: ReKycDto,
    @UploadedFiles() files: Express.Multer.File[], // ← Correct type
  ) {
    if (!files?.length) {
      throw new BadRequestException('Live selfie required for Re-KYC');
    }

    return this.kycService.reKyc(req.user.userId, dto, files[0]);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-status')
  async getMyKycStatus(@Req() req) {
    return this.kycService.getKycStatus(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('my')
  async deleteMyKyc(@Req() req) {
    return this.kycService.deleteKyc(req.user.userId);
  }

  // ────────────────────────────────────────────────
  // ADMIN ENDPOINTS
  // ────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get('pending')
  async getPendingKyc(@Query('limit') limit = '10', @Query('skip') skip = '0') {
    return this.kycService.getPendingKyc(+limit, +skip);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put(':kycId/approve')
  async approveKyc(@Param('kycId') kycId: string) {
    return this.kycService.adminApproveKyc(kycId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put(':kycId/reject')
  async rejectKyc(@Param('kycId') kycId: string, @Body('reason') reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Reason required');
    return this.kycService.adminRejectKyc(kycId, reason.trim());
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @Delete(':kycId')
  async deleteKyc(@Param('kycId') kycId: string) {
    return this.kycService.adminDeleteKyc(kycId);
  }
}