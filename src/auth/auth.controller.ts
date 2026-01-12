import { Controller, Post, Get, Body,Patch, Query, UseGuards, Req,NotFoundException, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { LocalAuthGuard } from './local.auth.guard';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthGuard } from '@nestjs/passport';
import { SwitchModeDto } from './dto/switch-mode.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';    

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: CreateUserDto) {
    return this.authService.signup(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() req, @Query('rememberMe') rememberMe: boolean) {
    return this.authService.login(req.user, rememberMe);
  }


  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}


  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req) {
    console.log('Google auth callback for user:', req.user);
    return this.authService.login(req.user);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  enable2FA(@Req() req) {
    return this.authService.enable2FA(req.user.userId);
  }

  @Post('2fa/verify')
  verify2FA(
    @Body('userId') userId: string,
    @Body('token') token: string
  ) {
    return this.authService.verify2FA(userId, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  getDashboard(@Req() req) {
    console.log('Fetching dashboard for user:', req.user.userId);
    return this.authService.getDashboard(req.user.userId);
  }

@UseGuards(JwtAuthGuard)
@Post('switch-mode')
async switchMode(@Req() req, @Body() dto: SwitchModeDto) {

 return await this.authService.switchMode(req.user.userId, dto);

}

@UseGuards(JwtAuthGuard)
@Get('profile')
async getProfile(@Req() req) {
  return this.authService.getProfile(req.user.userId);
}

@UseGuards(JwtAuthGuard)
@Patch('profile')
async updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
  return this.authService.updateProfile(req.user.userId, dto);
}

@Post('forgot-password')
async forgotPassword(@Body() dto: ForgotPasswordDto) {
  return this.authService.forgotPassword(dto.email);
}

@Post('reset-password')
async resetPassword(@Body() dto: ResetPasswordDto) {
  return this.authService.resetPassword(dto.token, dto.newPassword);
}

@Delete()
async deleteUser(@Req() req) {
  return this.authService.deleteUser(req.user.userId);
}
}
