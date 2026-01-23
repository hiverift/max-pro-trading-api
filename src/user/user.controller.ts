import { Controller, Get, Param, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get()
    async findAll(@Query() query: any) {
        return this.userService.findAll(query);
    }

    @Get('active')
    async findActive(@Query() query: any) {
        return this.userService.findAll({ ...query, filter: 'active' });
    }

    @Get('banned')
    async findBanned(@Query() query: any) {
        return this.userService.findAll({ ...query, filter: 'banned' });
    }

    @Get('email_unverified')
    async findEmailUnverified(@Query() query: any) {
        return this.userService.findAll({ ...query, filter: 'email_unverified' });
    }

    @Get('mobile_unverified')
    async findMobileUnverified(@Query() query: any) {
        return this.userService.findAll({ ...query, filter: 'mobile_unverified' });
    }

    @Get('kyc_unverified')
    async findKycUnverified(@Query() query: any) {
        return this.userService.findAll({ ...query, filter: 'kyc_unverified' });
    }

    @Get('kyc_pending')
    async findKycPending(@Query() query: any) {
        return this.userService.findAll({ ...query, filter: 'kyc_pending' });
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.userService.findOne(id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        return this.userService.update(id, body);
    }
}
