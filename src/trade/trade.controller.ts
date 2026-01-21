import { Controller, Post, Get,Delete, Put, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { RolesGuard } from 'src/common/gaurds/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TradeService } from './trade.service';
import { OpenTradeDto } from './dtos/open-trade.dto';

@Controller('trade')
export class TradeController {
    constructor(private tradeService: TradeService) { }

    @UseGuards(JwtAuthGuard)
    @Post('open')
    openTrade(@Req() req, @Body() dto: OpenTradeDto) {
        return this.tradeService.openTrade(req.user.userId, dto);
    }


    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Get('open-trades')
    getOpenTrades() {
        return this.tradeService.getOpenTrades();
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Get('closed-trades')
    getClosedTrades() {
        return this.tradeService.getClosedTrades();
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Put('asset/:id')
    updateAsset(@Param('id') id: string, @Body() updates) {
        return this.tradeService.updateAsset(id, updates);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Put('config')
    updateConfig(@Body() newConfig) {
        return this.tradeService.updateConfig(newConfig);
    }

    @UseGuards(JwtAuthGuard)
    @Get('history')
    async getTradeHistory(@Req() req, @Query('mode') mode?: 'demo' | 'real') {
        console.log(`Fetching trade history for user: ${req.user.userId} with mode: ${mode}`);
        const filter = { userId: req.user.userId };
        if (mode) filter['type'] = mode;
        return this.tradeService.getHistory(filter);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':tradeId/reverse')
    async reverseTrade(@Req() req, @Param('tradeId') tradeId: string) {
        return this.tradeService.reverseTrade(req.user.userId, tradeId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':tradeId/cancel')
    async cancelTrade(@Req() req, @Param('tradeId') tradeId: string) {
        return this.tradeService.cancelTrade(req.user.userId, tradeId);
    }

} 