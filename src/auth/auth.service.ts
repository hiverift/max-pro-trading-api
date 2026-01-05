import { Injectable, Logger, Inject,NotFoundException } from '@nestjs/common';
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
import { throwError } from 'rxjs';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { BadRequestException } from '@nestjs/common';   

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectModel('User') private userModel: Model<User>,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: cacheManager.Cache,
  ) {}

  async signup(dto: CreateUserDto) {
    this.logger.log(`Signup attempt for ${dto.email}`);
    const existing = await this.userModel.findOne({ email: dto.email });
    if (existing) throw new NotFoundException('Email exists');
    const hashed = await bcrypt.hash(dto.password, 10);
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const user = new this.userModel({ ...dto, password: hashed, referralCode });
    if (dto.referralCode) {
      const parent = await this.userModel.findOne({ referralCode: dto.referralCode });
      if (parent) {
        user.parentReferral = dto.referralCode;
        parent.referrals.push(referralCode);
        await parent.save();
      }
    }
    await user.save();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.cacheManager.set(`otp_${dto.email}`, otp, 300); // 5 min expiry
    this.logger.log(`User created for ${dto.email}`);
    return { message: 'User created, OTP sent to email' };
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userModel.findOne({ email });
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  

  async login(user: any, rememberMe = false) {
    const payload = { userId: user._id, email: user.email, sub: user._id, role: user.role };
    const expiresIn = rememberMe ? '7d' : '1h';
    return { access_token: this.jwtService.sign(payload, { expiresIn }) };
  }

  async validateGoogleUser(email: string, googleId: string) {
    console.log(`Validating Google user with email: ${email}`);
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

  async enable2FA(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new Error('User not found');
    const secret = speakeasy.generateSecret({ length: 20 });
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();
    return { secret: secret.otpauth_url }; // For app scanning
  }

  async verify2FA(userId: string, token: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new Error('User not found');
    return speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token });
  }

  async verifyOtp(dto: VerifyOtpDto) {
    this.logger.log(`OTP verification for ${dto.email}`);
    const storedOtp = await this.cacheManager.get(`otp_${dto.email}`);
    if (storedOtp !== dto.otp) throw new Error('Invalid OTP');
    await this.cacheManager.del(`otp_${dto.email}`);
    return { message: 'OTP verified' };
  }

  async getDashboard(userId: string) {
    this.logger.log(`Fetching dashboard for user ${userId}`);
    const key = `dashboard_${userId}`;
    let data = await this.cacheManager.get(key);
    if (!data) {
      const user = await this.userModel.findById(userId);
      if (!user) throw new Error('User not found');
      data = {
     activeMode: user.activeMode,
    realBalance: user.realBalance,
    demoBalance: user.demoBalance,
    bonusBalance: user.bonusBalance,
    tier: user.tier,
      };
      await this.cacheManager.set(key, data, 60);
    }
    return data;
  }

 async switchMode(userId: string,dto:any) {
 const user = await this.userModel.findById(userId);
 console.log(`Switching mode for user ${userId} to ${dto.mode}`);
  if (!user) throw new NotFoundException('User not found');
  user.activeMode = dto.mode;
  await user.save();
  return { message: `Switched to ${dto.mode} mode`, mode: dto.mode };
  }

  async getProfile(userId: string) {
  const user = await this.userModel.findById(userId).select('-password -resetPasswordToken -resetPasswordExpiry');
  if (!user) throw new NotFoundException('User not found');
  return {
    name: user.name,
    email: user.email,
    country: user.country,
    whatsapp: user.whatsapp,
    telegramId: user.telegramId,
    link: user.link,
    description: user.description,
    // Add balances if needed in profile
    realBalance: user.realBalance,
    bonusBalance: user.bonusBalance,
    demoBalance: user.demoBalance,
  };
}

async updateProfile(userId: string, dto: UpdateProfileDto) {
  const user = await this.userModel.findById(userId);
  if (!user) throw new NotFoundException('User not found');

  if (dto.email && dto.email !== user.email) {
    const existing = await this.userModel.findOne({ email: dto.email });
    if (existing) throw new BadRequestException('Email already in use');
  }

  Object.assign(user, dto);
  await user.save();

  return { message: 'Profile updated successfully' };
}

async forgotPassword(email: string) {
  const user = await this.userModel.findOne({ email });
  if (!user) {
    return { message: 'If email exists, password reset link has been sent' };
  }

  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  user.resetPasswordToken = token;
  user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  await user.save();

  // Production mein email bhejo
  console.log(`Password Reset Link: http://localhost:3000/reset-password?token=${token}`);

  return { message: 'Password reset link sent to your email' };
}

async resetPassword(token: string, newPassword: string) {
  const user = await this.userModel.findOne({
    resetPasswordToken: token,
    resetPasswordExpiry: { $gt: new Date() },
  });

  if (!user) throw new BadRequestException('Invalid or expired token');

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  return { message: 'Password reset successful' };
}
}