import { Controller, Put, Get, Body, UseGuards,Post, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { InfluencerService } from './influencer.service';
import { UpdateInfluencerDto } from './dtos/update-profile.dto';

@Controller('influencer')
@UseGuards(JwtAuthGuard)
export class InfluencerController {
  constructor(private influencerService: InfluencerService) {}
 
  @UseGuards(JwtAuthGuard)
@Post('promo')
createPromo(@Req() req, @Body('code') code: string) {
  return this.influencerService.createPromoCode(req.user.userId, code);
}
  @Put('profile')
  updateProfile(@Req() req, @Body() dto: UpdateInfluencerDto) {
    return this.influencerService.updateProfile(req.user.userId, dto);
  }

  @Get('dashboard')
  getDashboard(@Req() req) {
    return this.influencerService.getDashboard(req.user.userId);
  }

  @Get('analytics')
  getAnalytics(@Req() req) {
    return this.influencerService.getDashboard(req.user.userId); // Reuse for performance
  }

  @Get('campaigns')
  getCampaigns(@Req() req) {
    return this.influencerService.getCampaigns(req.user.userId);
  }

  @Get('earnings')
  getEarnings(@Req() req) {
    return this.influencerService.getEarnings(req.user.userId);
  }

  // Add


@UseGuards(JwtAuthGuard)
@Get('promo')
getPromo(@Req() req) {
  return this.influencerService.getPromoCodes(req.user.userId);
}
}