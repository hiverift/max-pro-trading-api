import { Controller, Post, Get, Put, Param, Body, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { RolesGuard } from 'src/common/gaurds/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  // User: Get my notifications
  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyNotifications(@Req() req, @Query('unreadOnly') unreadOnly: string = 'false') {
    return this.notificationService.getMyNotifications(req.user.userId, unreadOnly === 'true');
  }

  // User: Mark as read
  @UseGuards(JwtAuthGuard)
  @Put(':id/read')
  async markAsRead(@Req() req, @Param('id') id: string) {
    return this.notificationService.markAsRead(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
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
      // Broadcast to all
      return this.notificationService.broadcast(
        body.title,
        body.message,
        body.type,
        {}, // filter all
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get('logs')
  async getNotificationLogs(@Query() query: any) {
    return this.notificationService.getNotificationLogs(query);
  }
}