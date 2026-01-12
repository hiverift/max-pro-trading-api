import { Controller, Post, Get, Body, UseGuards,Put,Param,Query, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { WalletService } from './wallet.service';
import { DepositDto } from './dtos/deposit.dto';
import { WithdrawDto } from './dtos/withdraw.dto';
import { RolesGuard } from 'src/common/gaurds/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';


@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Post('deposit')
  deposit(@Req() req, @Body() dto: DepositDto) {
    return this.walletService.deposit(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('deposit/:txId/approve')
  approveDeposit(@Param('txId') txId: string) {
    return this.walletService.approveDeposit(txId);
  }



  @Post('withdraw')
  withdraw(@Req() req, @Body() dto: WithdrawDto) {
    return this.walletService.withdraw(req.user.userId, dto);
  }

//   @Get('history')
//   getHistory(@Req() req) {
//     return this.walletService.getHistory(req.user.userId);
//   }


@UseGuards(JwtAuthGuard)
@Get('history')
async getHistory(
  @Req() req,
  @Query('type') type?: 'deposit' | 'withdraw' | 'bonus' | 'referral_bonus',
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  return this.walletService.getCombinedHistory(req.user.userId, {
    type,
    page: page ? +page : 1,
    limit: limit ? +limit : 20,
  });
}


@Get('balance')
@UseGuards(JwtAuthGuard)
async getBalance(@Req() req) {
  return this.walletService.getBalance(req.user.userId);
}


  // Add /bonus endpoint if needed
}
