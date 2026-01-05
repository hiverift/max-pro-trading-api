// New src/copy-trade/copy-trade.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/user.schema';

@Injectable()
export class CopyTradeService {
  private readonly logger = new Logger(CopyTradeService.name);

  constructor(@InjectModel('User') private userModel: Model<User>) {}

  async getLeaders() {
    return this.userModel.find({ isLeader: true }).select('email tier realBalance'); // Select relevant info
  }

  async followLeader(userId: string, leaderId: string) {
    this.logger.log(`User ${userId} following leader ${leaderId}`);
    const user = await this.userModel.findById(userId);
    const leader = await this.userModel.findById(leaderId);
    if (!user) throw new NotFoundException('User not found');
    if (!leader || !leader.isLeader) throw new NotFoundException('Leader not found or not approved');
    if (!user.followedLeaders.includes(leaderId)) {
      user.followedLeaders.push(leaderId);
      leader.followers.push(userId);
      await user.save();
      await leader.save();
    }
    return { message: 'Followed successfully' };
  }

  async unfollowLeader(userId: string, leaderId: string) {
    this.logger.log(`User ${userId} unfollowing leader ${leaderId}`);
    const user = await this.userModel.findById(userId);
    const leader = await this.userModel.findById(leaderId);
    if (user && leader) {
      user.followedLeaders = user.followedLeaders.filter(id => id !== leaderId);
      leader.followers = leader.followers.filter(id => id !== userId);
      await user.save();
      await leader.save();
    }
    return { message: 'Unfollowed successfully' };
  }

  async getMyLeaders(userId: string) {
    const user = await this.userModel.findById(userId).populate('followedLeaders', 'email tier');
    if (!user) throw new NotFoundException('User not found');
    return user.followedLeaders;
  }

  async getMyFollowers(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!user.isLeader) throw new NotFoundException('Not a leader');
    return this.userModel.find({ _id: { $in: user.followers } }).select('email');
  }
}