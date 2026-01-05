import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from '../auth/user.schema';

import CustomResponse from 'src/provider/custom-response.service';
import CustomError from 'src/provider/customer-error.service';

@Injectable()
export class CopyTradeService {
  private readonly logger = new Logger(CopyTradeService.name);

  constructor(@InjectModel('User') private userModel: Model<User>) {}

  // ===================== GET LEADERS =====================
  async getLeaders() {
    const leaders = await this.userModel
      .find({ isLeader: true })
      .select('email tier realBalance');

    return new CustomResponse(200, 'Leaders fetched', leaders);
  }

  // ===================== FOLLOW LEADER =====================
  async followLeader(userId: string, leaderId: string) {
    this.logger.log(`User ${userId} following leader ${leaderId}`);

    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');

    const leader = await this.userModel.findById(leaderId);
    if (!leader || !leader.isLeader) {
      throw new CustomError(404, 'Leader not found or not approved');
    }

    if (!user.followedLeaders.includes(leaderId)) {
      user.followedLeaders.push(leaderId);
      leader.followers.push(userId);
      await user.save();
      await leader.save();
    }

    return new CustomResponse(200, 'Followed successfully');
  }

  // ===================== UNFOLLOW LEADER =====================
  async unfollowLeader(userId: string, leaderId: string) {
    this.logger.log(`User ${userId} unfollowing leader ${leaderId}`);

    const user = await this.userModel.findById(userId);
    const leader = await this.userModel.findById(leaderId);

    if (user && leader) {
      user.followedLeaders = user.followedLeaders.filter(
        id => id !== leaderId,
      );
      leader.followers = leader.followers.filter(
        id => id !== userId,
      );
      await user.save();
      await leader.save();
    }

    return new CustomResponse(200, 'Unfollowed successfully');
  }

  // ===================== MY LEADERS =====================
  async getMyLeaders(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate('followedLeaders', 'email tier');

    if (!user) throw new CustomError(404, 'User not found');

    return new CustomResponse(200, 'My leaders fetched', user.followedLeaders);
  }

  // ===================== MY FOLLOWERS =====================
  async getMyFollowers(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');
    if (!user.isLeader) throw new CustomError(403, 'Not a leader');

    const followers = await this.userModel
      .find({ _id: { $in: user.followers } })
      .select('email');

    return new CustomResponse(200, 'My followers fetched', followers);
  }
}
