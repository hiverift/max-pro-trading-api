import { Controller, Post, Get, Delete, Put, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
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

    @UseGuards(JwtAuthGuard)
    @Get('history')
    async getTradeHistory(@Req() req, @Query('mode') mode?: 'demo' | 'real') {
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'superadmin')
    @Get('assets')
    async getAssets() {
        return this.tradeService.getAssets();
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'superadmin')
    @Post('assets/:symbol/toggle')
    async toggleAsset(@Param('symbol') symbol: string, @Body('enabled') enabled: boolean) {
        return this.tradeService.toggleAsset(symbol, enabled);
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'superadmin')
    @Get('settings')
    async getTradeSettings() {
        return this.tradeService.getTradeSettings();
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'superadmin')
    @Post('settings')
    async updateTradeSettings(@Body() updates: any) {
        return this.tradeService.updateTradeSettings(updates);
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'superadmin')
    @Get('trades/open')
    async getOpenTrades() {
        return this.tradeService.getOpenTrades();
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'superadmin')
    @Post('trades/force-close')
    async forceCloseTrades(@Body('tradeId') tradeId?: string) {
        return this.tradeService.forceCloseTrades(tradeId);
    }

    @Get('getAllCurrencies')
    async getAll() {
        return this.tradeService.getAllCurrencies();
    }

    @Get('getCurrencyById/:symbol')
    async getOne(@Param('symbol') symbol: string) {
        return this.tradeService.getCurrency(symbol);
    }

    @Post('createCurrency')
    async create(@Body() dto: any) {
        return this.tradeService.createCurrency(dto);
    }

    @Put('updateCurrency/:symbol')
    async update(@Param('symbol') symbol: string, @Body() updates: any) {
        return this.tradeService.updateCurrency(symbol, updates);
    }

    // @Put(':symbol/toggle')
    // async toggle(@Param('symbol') symbol: string, @Body('enabled') enabled: boolean) {
    //     return this.tradeService.toggleCurrency(symbol, enabled);
    // }

    @Delete('deleteCurrency/:symbol')
    async delete(@Param('symbol') symbol: string) {
        return this.tradeService.deleteCurrency(symbol);
    }

}