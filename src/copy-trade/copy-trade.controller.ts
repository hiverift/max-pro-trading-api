// New src/copy-trade/copy-trade.controller.ts
import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { CopyTradeService } from './copy-trade.service';

@Controller('copy-trade')
@UseGuards(JwtAuthGuard)
export class CopyTradeController {
  constructor(private copyTradeService: CopyTradeService) {}

  @Get('leaders')
  getLeaders() {
    return this.copyTradeService.getLeaders();
  }

  @Post('follow/:leaderId')
  followLeader(@Req() req, @Param('leaderId') leaderId: string) {
    return this.copyTradeService.followLeader(req.user.userId, leaderId);
  }

  @Post('unfollow/:leaderId')
  unfollowLeader(@Req() req, @Param('leaderId') leaderId: string) {
    return this.copyTradeService.unfollowLeader(req.user.userId, leaderId);
  }

  @Get('my-leaders')
  getMyLeaders(@Req() req) {
    return this.copyTradeService.getMyLeaders(req.user.userId);
  }

  @Get('my-followers')
  getMyFollowers(@Req() req) {
    return this.copyTradeService.getMyFollowers(req.user.userId);
  }
}