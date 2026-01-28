import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification,NotificationSchema } from './entities/notification.entity';
import { User } from '../auth/user.schema';
import { sendEmail } from 'src/util/mailerutil'; // your email util

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel('User') private userModel: Model<User>,
  ) {}

  // Send notification to single user (in-app + optional email/SMS)
  async sendToUser(userId: string, title: string, message: string, type: string = 'info', actionUrl?: string, template?: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const notification = await this.notificationModel.create({
      userId,
      title,
      message,
      type,
      actionUrl,
      template,
    });

    // Optional: Email
    if (user.email) {
      await sendEmail(
        user.email,
        title,
        message,
      );
    }

    // Optional: SMS (add Twilio later)

    return notification;
  }

  // Broadcast to all users or filtered (role, KYC status, etc.)
  async broadcast(title: string, message: string, type: string = 'info', filter: any = {}) {
    const users = await this.userModel.find(filter).select('_id email');

    const notifications = users.map(user => ({
      userId: user._id,
      title,
      message,
      type,
    }));

    await this.notificationModel.insertMany(notifications);

    // Optional: Email broadcast (loop or queue)
    // users.forEach(user => sendEmail(user.email, title, message));

    return { message: 'Broadcast sent', count: users.length };
  }

  // Get my notifications (user)
  async getMyNotifications(userId: string, unreadOnly: boolean = false) {
    const filter: any = { userId };
    if (unreadOnly) filter.isRead = false;

    const notifications = await this.notificationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    return notifications;
  }

  // Mark as read
  async markAsRead(notificationId: string, userId: string) {
    console.log(`Marking notification ${notificationId} as read for user ${userId}`);
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true },
    );

    if (!notification) throw new NotFoundException('Notification not found or not yours');

    return notification;
  }

  // Admin: Get sent logs (broadcast + single)
  async getNotificationLogs(filter: any = {}) {
    const logs = await this.notificationModel
      .find(filter)
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .limit(100);

    return logs;
  }
}