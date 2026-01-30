import { BadRequestException, Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { RolesGuard } from 'src/common/gaurds/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import express from 'express';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class ReportsController {
  constructor(private service: ReportsService) {}
x
  @Get('users')
  async getUserReports(@Query() query: any) {
    return this.service.getUserReports(query);
  }

  @Get('finance')
  async getFinanceReports(@Query() query: any) {
    return this.service.getFinanceReports(query);
  }

  @Get('trade')
  async getTradeReports(@Query() query: any) {
    return this.service.getTradeReports(query);
  }

  // Export CSV (common for all)
  @Get('export')
  async exportReport(@Res() res: express.Response, @Query() query: any) {
    const type = query.type;  

    let reportData;
    if (type === 'users') reportData = await this.service.getUserReports({ ...query, exportCsv: true });
    else if (type === 'finance') reportData = await this.service.getFinanceReports({ ...query, exportCsv: true });
    else if (type === 'trade') reportData = await this.service.getTradeReports({ ...query, exportCsv: true });
    else throw new BadRequestException('Invalid report type');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report.csv`);
    res.send(reportData.csvData);
  }

}