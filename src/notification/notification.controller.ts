import { Controller, Post, Get, Put, Param, Body, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { RolesGuard } from 'src/common/gaurds/roles.guard';
import { PermissionsGuard } from 'src/common/gaurds/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) { }


  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyNotifications(@Req() req, @Query('unreadOnly') unreadOnly: string = 'false') {
    return this.notificationService.getMyNotifications(req.user.userId, unreadOnly === 'true');
  }


  @UseGuards(JwtAuthGuard)
  @Put(':id/read')
  async markAsRead(@Req() req, @Param('id') id: string) {
    return this.notificationService.markAsRead(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('SEND_NOTIFICATIONS')
  @Post('send')
  async sendNotification(
    @Body() body: {
      userId?: string; // single user (optional)
      title: string;
      message: string;
      type?: string;
      actionUrl?: string;
      template?: string;
    },
  ) {
    if (body.userId) {
      return this.notificationService.sendToUser(
        body.userId,
        body.title,
        body.message,
        body.type,
        body.actionUrl,
        body.template,
      );
    } else {

      return this.notificationService.broadcast(
        body.title,
        body.message,
        body.type,
        {},
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('VIEW_NOTIFICATIONS')
  @Get('logs')
  async getNotificationLogs(@Query() query: any) {
    return this.notificationService.getNotificationLogs(query);
  }
}