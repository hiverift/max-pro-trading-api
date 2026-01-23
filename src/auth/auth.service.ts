import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager from 'cache-manager';
import * as speakeasy from 'speakeasy';

import { User } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import fs from 'fs';
import { fileUpload } from 'src/util/fileupload';
import { sendEmail } from 'src/util/mailerutil';
import CustomResponse from 'src/provider/custom-response.service';
import CustomError from 'src/provider/customer-error.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel('User') private userModel: Model<User>,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: cacheManager.Cache,
  ) { }

  // ===================== SIGNUP =====================
  async signup(dto: CreateUserDto) {
    try {
      this.logger.log(`Signup attempt for ${dto.email}`);

      const existing = await this.userModel.findOne({ email: dto.email });
      if (existing) {
        throw new CustomError(400, 'Email already exists');
      }

      const hashed = await bcrypt.hash(dto.password, 10);
      const referralCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const user = new this.userModel({
        ...dto,
        password: hashed,
        referralCode,
      });

      if (dto.referralCode) {
        const parent = await this.userModel.findOne({
          referralCode: dto.referralCode,
        });
        if (parent) {
          user.parentReferral = dto.referralCode;
          parent.referrals.push(referralCode);
          await parent.save();
        }
      }

      const user1 = await user.save();
      console.log('user dindoe ', user1)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await this.cacheManager.set(`otp_${dto.email}`, otp, 300);

      return new CustomResponse(
        201,
        'User created successfully. OTP sent to email',
        user1
      );
    } catch (error) {
      throw error instanceof CustomError
        ? error
        : new CustomError(500, error.message);
    }
  }


  async login(user: any, rememberMe = false) {
    const payload = {
      userId: user._id,
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    const expiresIn = rememberMe ? '7d' : '1h';
    const userRecord = await this.userModel.findById(user._id);
    if (!userRecord) {
      throw new BadRequestException('User Not Found. Contact support.');
    }
    const token = this.jwtService.sign(payload, { expiresIn });


    return new CustomResponse(200, 'Login successful', {
      accessToken: token,
      user: user,

    });
  }

  // ===================== VERIFY OTP =====================
  async verifyOtp(dto: VerifyOtpDto) {
    const storedOtp = await this.cacheManager.get(`otp_${dto.email}`);

    if (!storedOtp || storedOtp !== dto.otp) {
      throw new CustomError(400, 'Invalid or expired OTP');
    }

    await this.cacheManager.del(`otp_${dto.email}`);

    return new CustomResponse(200, 'OTP verified successfully');
  }

  // ===================== ENABLE 2FA =====================
  async enable2FA(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');

    const secret = speakeasy.generateSecret({ length: 20 });
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;

    await user.save();

    return new CustomResponse(200, '2FA enabled', {
      qrCode: secret.otpauth_url,
    });
  }

  // ===================== VERIFY 2FA =====================
  async verify2FA(userId: string, token: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');
    console.log('user twoFactorSecret', user.twoFactorSecret, token);
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      throw new CustomError(400, 'Invalid 2FA token');
    }

    return new CustomResponse(200, '2FA verified successfully');
  }

  // ===================== DASHBOARD =====================
  async getDashboard(userId: string) {
    const cacheKey = `dashboard_${userId}`;
    let data = await this.cacheManager.get(cacheKey);

    if (!data) {
      const user = await this.userModel.findById(userId);
      if (!user) throw new CustomError(404, 'User not found');

      data = {
        activeMode: user.activeMode,
        realBalance: user.realBalance,
        demoBalance: user.demoBalance,
        bonusBalance: user.bonusBalance,
        tier: user.tier,
      };

      await this.cacheManager.set(cacheKey, data, 60);
    }

    return new CustomResponse(200, 'Dashboard fetched', data);
  }

  // ===================== SWITCH MODE =====================
  async switchMode(userId: string, dto: any) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');

    user.activeMode = dto.mode;
    await user.save();

    return new CustomResponse(200, `Switched to ${dto.mode} mode`, {
      mode: dto.mode,
    });
  }

  // ===================== PROFILE =====================
  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -resetPasswordToken -resetPasswordExpiry');

    if (!user) throw new CustomError(404, 'User not found');

    return new CustomResponse(200, 'Profile fetched', user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, file?: Express.Multer.File) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');

    if (dto.email && dto.email !== user.email) {
      const exists = await this.userModel.findOne({ email: dto.email });
      if (exists) throw new CustomError(400, 'Email already in use');
    }

    const avatart = fileUpload('profileImage', file);
    if (file) {
      user.avatarPath = `${process.env.SERVER_BASE_URL}/uploads/profileImage/${avatart}`; // store local path or S3 URL
    }

    Object.assign(user, dto);
    const updatedUser = await user.save();

    return new CustomResponse(200, 'Profile updated successfully', updatedUser);
  }


  // ===================== FORGOT PASSWORD =====================
  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      return new CustomResponse(
        200,
        'User not found. If the email exists, a reset link has been sent.',
      );
    }

    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    user.resetPasswordToken = token;
    user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    console.log(
      `Reset link:${process.env.FRONTEND_URL}/reset-password?token=${token}`,
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail(
      email,
      'Password Reset Request',
      `You requested a password reset. Click the link to reset your password: ${resetLink} . If you did not request this, ignore this email.`
    );

    return new CustomResponse(200, 'Password reset link sent to your email', { resetlink: resetLink });
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() },
    });

    if (!user) throw new CustomError(400, 'Invalid or expired token');

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    await user.save();

    return new CustomResponse(200, 'Password reset successful');
  }

  async validateGoogleUser(email: string, googleId: string) {
    let user = await this.userModel.findOne({ email });
    if (!user) {
      user = new this.userModel({ email, googleId });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
    return user;
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userModel.findOne({ email });
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async deleteUser(userId: string) {
    const user = await this.userModel.findByIdAndDelete(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const deleteuser = await user.save();

    return new CustomResponse(200, 'Password reset successful', deleteuser);
  }
}