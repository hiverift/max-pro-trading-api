import { Controller, Get, Put, Post, Param, Body, Req, UseGuards, Query, Delete } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { RolesGuard } from 'src/common/gaurds/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class AdminController {
  constructor(private adminService: AdminService) { }

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  getUsers(@Query() query) {
    return this.adminService.getUsers(query);
  }

  @Put('user/:id')
  updateUser(@Param('id') id: string, @Body() updates) {
    return this.adminService.updateUser(id, updates);
  }

  @Post('user/:id/balance-adjust')
  adjustBalance(@Param('id') id: string, @Body('amount') amount: number, @Body('reason') reason: string) {
    return this.adminService.adjustBalance(id, amount, reason);
  }

  @Get('kyc/pending')
  getKycPending() {
    return this.adminService.getKycPending();
  }

  @Put('kyc/:id/approve')
  approveKyc(@Param('id') id: string) {
    return this.adminService.approveKyc(id);
  }

  @Get('deposits')
  getDeposits() {
    return this.adminService.getDeposits();
  }

  @Put('deposit/:id/approve')
  approveDeposit(@Param('id') id: string) {
    return this.adminService.approveDeposit(id);
  }

  @Get('withdrawals')
  getWithdrawals() {
    return this.adminService.getWithdrawals();
  }

  @Put('withdrawal/:id/approve')
  approveWithdrawal(@Param('id') id: string) {
    return this.adminService.approveWithdrawal(id);
  }

  @Put('withdrawal/:id/reject')
  rejectWithdrawal(@Param('id') id: string) {
    return this.adminService.rejectWithdrawal(id);
  }

  @Put('wallet/:id/freeze')
  freezeWallet(@Param('id') id: string) {
    return this.adminService.freezeWallet(id);
  }

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
  @Roles('superadmin') // Only superadmin delete kar sake
  @Delete('users/:userId')
  async deleteUser(@Param('userId') userId: string) {
    return this.adminService.deleteUser(userId);
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