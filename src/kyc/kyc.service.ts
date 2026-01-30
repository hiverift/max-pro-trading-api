import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/user.schema';
import { Kyc } from './entities/kyc.entity';
import * as fs from 'fs';
import { CompleteKycDto, ReKycDto, StartKycDto } from './dto/create-kyc.dto';
import CustomResponse from 'src/provider/custom-response.service';
import { Otp } from 'src/auth/otp.schema';
import { fileUpload } from 'src/util/fileupload';

@Injectable()
export class KycService {
  constructor(
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Kyc') private kycModel: Model<Kyc>,
    @InjectModel('Otp') private otpModel: Model<Otp>,
  ) {}

  async startKyc(userId: string, phone: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP in DB with 5 min expiry
    const otp = new this.otpModel({
      userId,
      phone,
      code: otpCode,
      type: 'kyc_phone_verify',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });
    await otp.save();

    // TODO: Integrate real SMS/OTP service here
    console.log(`OTP sent to ${phone}: ${otpCode}`); // For testing – replace with real SMS

    user.phone = phone; // Store phone temporarily
    await user.save();

    return new CustomResponse(200, 'OTP sent to phone. Verify to proceed.', { phone:phone,otp:otpCode });
  }

  // New: Verify OTP for KYC start
  async verifyKycOtp(userId: string, otpCode: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const otp = await this.otpModel.findOne({
      userId,
      code: otpCode,
      type: 'kyc_phone_verify',
      expiresAt: { $gt: new Date() }, // Not expired
    });

    if (!otp) throw new BadRequestException('Invalid or expired OTP');

    // OTP verified – delete it
    await otp.deleteOne();

    // Mark phone verified (optional field in user schema)
    user.phoneVerified = true;
    await user.save();

    return new CustomResponse(200, 'Phone verified successfully. Proceed to complete KYC.');
  }


 async completeKyc(
  userId: string,
  dto: CompleteKycDto,
  files: { pan?: Express.Multer.File; aadhaar?: Express.Multer.File },
) {
  const user = await this.userModel.findById(userId);
  if (!user) throw new NotFoundException('User not found');

  const existingKyc = await this.kycModel.findOne({ userId });

  let panImagePath: string | undefined;
  let aadhaarImagePath: string | undefined;

  if (files?.pan) {
    const panFile = fileUpload('kyc/pan', files.pan);
    panImagePath = `${process.env.SERVER_BASE_URL}/uploads/kyc/pan/${panFile}`;
  }

  if (files?.aadhaar) {
    const aadhaarFile = fileUpload('kyc/aadhaar', files.aadhaar);
    aadhaarImagePath = `${process.env.SERVER_BASE_URL}/uploads/kyc/aadhaar/${aadhaarFile}`;
  }

  // 🔁 UPDATE CASE
  if (existingKyc) {
    existingKyc.phone = dto.phone ?? existingKyc.phone;
    existingKyc.incomeBracket = dto.incomeBracket ?? existingKyc.incomeBracket;
    existingKyc.occupation = dto.occupation ?? existingKyc.occupation;
    existingKyc.panNumber = dto.panNumber ?? existingKyc.panNumber;
    existingKyc.aadhaarNumber = dto.aadhaarNumber ?? existingKyc.aadhaarNumber;
    existingKyc.isPep = dto.isPep ?? existingKyc.isPep;

    if (panImagePath) existingKyc.panImagePath = panImagePath;
    if (aadhaarImagePath) existingKyc.aadhaarImagePath = aadhaarImagePath;

    existingKyc.status = 'pending';
    await existingKyc.save();

    user.kycStatus = 'pending';
    await user.save();

    return new CustomResponse(200, 'KYC updated successfully', {
      kycId: existingKyc._id,
      status: existingKyc.status,
    });
  }

  // 🆕 CREATE CASE
  if (!files?.pan || !files?.aadhaar) {
    throw new BadRequestException('PAN and Aadhaar images required');
  }

  const kyc = await this.kycModel.create({
    userId,
    phone: dto.phone,
    incomeBracket: dto.incomeBracket,
    occupation: dto.occupation,
    panNumber: dto.panNumber,
    panImagePath,
    aadhaarNumber: dto.aadhaarNumber,
    aadhaarImagePath,
    isPep: dto.isPep || false,
    status: 'pending',
  });

  user.kycStatus = 'pending';
  await user.save();

  return new CustomResponse(200, 'KYC submitted for review', {
    kycId: kyc._id,
    status: kyc.status,
  });
}


  async reKyc(userId: string, dto: ReKycDto, selfieFile: Express.Multer.File) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!selfieFile) throw new BadRequestException('Live selfie required');

    const existingKyc = await this.kycModel.findOne({ userId });
    if (!existingKyc) throw new BadRequestException('No previous KYC found');
   const panCardPath = fileUpload('re-kyc/selfie', selfieFile.path );
    existingKyc.selfiePath = `${process.env.SERVER_BASE_URL}/uploads/re-kyc/selfie/${panCardPath}`;
    existingKyc.isPep = dto.isPep ?? existingKyc.isPep;
    existingKyc.status = 'pending';
    await existingKyc.save();

    user.kycStatus = 'pending';
    await user.save();

    return new CustomResponse(200, 'Re-KYC submitted', {
      kycId: existingKyc._id,
      status: existingKyc.status,
    });
  }

  async getKycStatus(userId: string) {
    const user = await this.userModel.findById(userId).select('kycStatus phone');
    if (!user) throw new NotFoundException('User not found');

    const latestKyc = await this.kycModel
      .findOne({ userId })
      .sort({ createdAt: -1 })
      .select('status rejectionReason createdAt');

    return new CustomResponse(200, 'KYC status fetched', {
      kycStatus: user.kycStatus || 'not_started',
      phone: user.phone,
      latestKyc: latestKyc
        ? {
            status: latestKyc.status,
            rejectionReason: latestKyc.rejectionReason,
            submittedAt: latestKyc.createdAt,
          }
        : null,
    });
  }
  
  async deleteKyc(userId: string) {
    const kyc = await this.kycModel.findOne({ userId });
    if (!kyc) throw new NotFoundException('No KYC record found');

    // Delete physical files (optional – uncomment if needed)
    // if (kyc.panImagePath) fs.unlinkSync(kyc.panImagePath);
    // if (kyc.aadhaarImagePath) fs.unlinkSync(kyc.aadhaarImagePath);
    // if (kyc.selfiePath) fs.unlinkSync(kyc.selfiePath);

    kyc.status = 'deleted';
    kyc.panImagePath = '';
    kyc.aadhaarImagePath = '';
    kyc.selfiePath = '';
    kyc.rejectionReason = 'User deleted KYC documents';
    await kyc.save();

    const user = await this.userModel.findById(userId);
    if (user) {
      user.kycStatus = 'pending';
      await user.save();
    }

    return new CustomResponse(200, 'Your KYC documents deleted', { status: 'pending' });
  }

async getPendingKyc(limit: number = 10, skip: number = 0) {
  const kycs = await this.kycModel
    .find()
    .populate({
      path: 'userId',
      select: 'email phone kycStatus',
      match: { kycStatus: 'pending' }, 
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // populate ke baad null users aa sakte hain → filter karo
  const filteredKycs = kycs.filter(k => k.userId);

  const total = await this.kycModel.countDocuments()
    .populate({
      path: 'userId',
      match: { kycStatus: 'pending' },
    });

  return new CustomResponse(200, 'Pending KYC fetched', {
    pendingKyc: filteredKycs,
    pagination: { total: filteredKycs.length, limit, skip },
  });
}


  async adminApproveKyc(kycId: string) {
    const kyc = await this.kycModel.findById(kycId);
    if (!kyc) throw new NotFoundException('KYC not found');

    if (kyc.status !== 'pending') {
      throw new BadRequestException(`KYC already ${kyc.status}`);
    }

    kyc.status = 'approved';
    await kyc.save();

    await this.userModel.updateOne({ _id: kyc.userId }, { kycStatus: 'approved' });

    return new CustomResponse(200, 'KYC approved', { kycId });
  }

  async adminRejectKyc(kycId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Reason required');

    const kyc = await this.kycModel.findById(kycId);
    if (!kyc) throw new NotFoundException('KYC not found');

    if (kyc.status !== 'pending') {
      throw new BadRequestException(`KYC already ${kyc.status}`);
    }

    kyc.status = 'rejected';
    kyc.rejectionReason = reason.trim();
    await kyc.save();

    await this.userModel.updateOne({ _id: kyc.userId }, { kycStatus: 'rejected' });

    return new CustomResponse(200, 'KYC rejected', { reason, kycId });
  }

  async adminDeleteKyc(kycId: string) {
    const kyc = await this.kycModel.findById(kycId);
    if (!kyc) throw new NotFoundException('KYC not found');

    // Delete files (optional)
    // if (kyc.panImagePath) fs.unlinkSync(kyc.panImagePath);
    // if (kyc.aadhaarImagePath) fs.unlinkSync(kyc.aadhaarImagePath);
    // if (kyc.selfiePath) fs.unlinkSync(kyc.selfiePath);

    await kyc.deleteOne();

    await this.userModel.updateOne({ _id: kyc.userId }, { kycStatus: 'pending' });

    return new CustomResponse(200, 'KYC record deleted', { kycId });
  }
}