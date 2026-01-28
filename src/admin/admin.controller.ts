import { Controller, Get, Put, Post, Param, Body, Req, UseGuards, Query, Delete } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { RolesGuard } from 'src/common/gaurds/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin')

export class AdminController {
  constructor(private adminService: AdminService) { }


  @Post('login')
  async login(@Body() body: { email: string; password: string }, @Req() req: any) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.adminService.adminLogin(body.email, body.password, ip, userAgent);
  }


  @Post('verify-2fa')
  async verify2FA(@Body() body: { email: string; otp: string }, @Req() req: any) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.adminService.verifyAdmin2FA(body.email, body.otp, ip, userAgent);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }



  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get('kyc/pending')
  getKycPending() {
    return this.adminService.getKycPending();
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put('kyc/:id/approve')
  approveKyc(@Param('id') id: string) {
    return this.adminService.approveKyc(id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get('deposits')
  getDeposits() {
    return this.adminService.getDeposits();
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put('deposit/:id/approve')
  approveDeposit(@Param('id') id: string) {
    return this.adminService.approveDeposit(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get('withdrawals')
  getWithdrawals() {
    return this.adminService.getWithdrawals();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put('withdrawal/:id/approve')
  approveWithdrawal(@Param('id') id: string) {
    return this.adminService.approveWithdrawal(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put('withdrawal/:id/reject')
  rejectWithdrawal(@Param('id') id: string) {
    return this.adminService.rejectWithdrawal(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put('wallet/:id/freeze')
  freezeWallet(@Param('id') id: string) {
    return this.adminService.freezeWallet(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put('user/:id/approve-leader')
  approveLeader(@Param('id') id: string) {
    return this.adminService.approveLeader(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get('alerts/high-loss')
  getHighLossAlerts() {
    return this.adminService.getHighLossAlerts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get('alerts/api-downtime')
  getApiDowntimeAlerts() {
    return this.adminService.getApiDowntimeAlerts();
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin') // Only superadmin delete kar sake
  @Delete('users/:userId')
  async deleteUser(@Param('userId') userId: string) {
    return this.adminService.deleteUser(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get('users')
  async getUsers(
    @Query() query: {
      email?: string;
      phone?: string;
      userId?: string;
      kycStatus?: string;
      accountStatus?: string;
      referralSource?: string;
      page?: string;
      limit?: string;
    },
  ) {
    return this.adminService.getUsers(query);
  }

  /**
   * Get single user profile (full details)
   */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get('users/:id')
  async getUserProfile(@Param('id') id: string) {
    return this.adminService.getUserProfile(id);
  }

  /**
   * Update user profile (name, email, phone, etc.)
   */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() updates: any) {
    return this.adminService.updateUser(id, updates);
  }

  /**
   * Block / Unblock user account
   */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Post('users/:id/block')
  async blockUnblockUser(@Param('id') id: string, @Body('block') block: boolean, @Body('reason') reason?: string) {
    return this.adminService.blockUnblockUser(id, block, reason);
  }

  /**
   * Reset user password (send new random password via email)
   */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Post('users/:id/reset-password')
  async resetPassword(@Param('id') id: string) {
    return this.adminService.resetPassword(id);
  }

  /**
   * Manual balance adjustment (realBalance) with audit log
   */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Post('users/:id/balance-adjust')
  async adjustBalance(@Param('id') id: string, @Body('amount') amount: number, @Body('reason') reason: string) {
    return this.adminService.adjustBalance(id, amount, reason);
  }

  @Get('security/logins')
  async getLoginLogs(
    @Query() query: {
      userId?: string;
      email?: string;
      ip?: string;
      status?: string;
      page?: string;
      limit?: string;
    },
  ) {
    return this.adminService.getLoginLogs(query);
  }

  @Post('security/force-logout')
  async forceLogout(@Body() body: { userId: string; reason?: string }) {
    return this.adminService.forceLogout(body.userId, body.reason);
  }
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  // @Delete(':userId')
  // async deleteKyc(@Param('userId') userId: string) {
  //   return this.adminService.deleteKyc(userId);
  // }

  // @UseGuards(JwtAuthGuard)
  // @Delete('my')
  // async deleteMyKyc(@Req() req) {
  //   return this.adminService.deleteKyc(req.user.userId);
  // }
}