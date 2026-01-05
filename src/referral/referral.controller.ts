import { Controller, Get, Post, Body, UseGuards,Query, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { ReferralService } from './referral.service';

@Controller('referral')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(private referralService: ReferralService) {}

  @Get('code')
  getCode(@Req() req) {
    return this.referralService.getCode(req.user.userId);
  }

  @Get('tree')
  getTree(@Req() req) {
    return this.referralService.getTree(req.user.userId);
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
  getStatistics(@Req() req, @Query('period') period: 'day' | 'week' | 'month' = 'day') {
    return this.referralService.getStatistics(req.user.userId, period);
  }

  @Get('sub-affiliate')
  getSubAffiliate(@Req() req) {
    return this.referralService.getSubAffiliateData(req.user.userId);
  }
}