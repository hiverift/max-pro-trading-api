import { Controller, Get, Post, Body, UseGuards, Query, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { ReferralService } from './referral.service';

import { RolesGuard } from 'src/common/gaurds/roles.guard';
import { PermissionsGuard } from 'src/common/gaurds/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
@Controller('referral')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(private referralService: ReferralService) { }

  @Get('code')
  getCode(@Req() req) {
    return this.referralService.getCode(req.user.userId);
  }

  @Get('tree')
  getTree(@Req() req) {
    return this.referralService.getTree(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getReferralTree')
  async getReferralTree(@Req() req) {
    return this.referralService.getReferralTree(req.user.userId);
  }



  // Admin: Get all referral logs
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('VIEW_REFERRALS')
  @Get('logs')
  async getLogs() {
    return this.referralService.getAllReferralLogs();
  }

  @Get('earnings')
  getEarnings(@Req() req) {
    return this.referralService.getEarnings(req.user.userId);
  }

  @Post('withdraw')
  withdraw(@Req() req, @Body('amount') amount: number) {
    return this.referralService.withdraw(req.user.userId, amount);
  }

  @Get('dashboard')
  getAffiliateDashboard(@Req() req) {
    return this.referralService.getAffiliateDashboard(req.user.userId);
  }

  @Get('statistics')
  getStatistics(@Req() req, @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    return this.referralService.getStatistics(req.user.userId, period);
  }

  @Get('sub-affiliate')
  getSubAffiliate(@Req() req) {
    return this.referralService.getSubAffiliateData(req.user.userId);
  }
}