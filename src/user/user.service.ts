import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/auth/user.schema';
import { Transaction } from 'src/transaction/schema/transaction.schema';
import { Trade } from 'src/trade/schema/trade.schema';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel('Transaction') private transactionModel: Model<Transaction>,
        @InjectModel('Trade') private tradeModel: Model<Trade>
    ) { }

    async findAll(query: any) {
        const { page = 1, limit = 10, ...filters } = query;
        const skip = (page - 1) * limit;

        // Basic filtering logic
        const filterQuery: any = {};
        if (filters.search) {
            filterQuery.$or = [
                { email: { $regex: filters.search, $options: 'i' } },
                { name: { $regex: filters.search, $options: 'i' } },
            ];
        }
        if (filters.role) filterQuery.role = filters.role;
        if (filters.kycStatus) filterQuery.kycStatus = filters.kycStatus;

        // Custom Filters from UI
        if (filters.filter) {
            switch (filters.filter) {
                case 'active':
                    filterQuery.accountBlocked = false;
                    break;
                case 'banned':
                    filterQuery.accountBlocked = true;
                    break;
                case 'email_unverified':
                    filterQuery.emailVerified = false;
                    break;
                case 'mobile_unverified':
                    filterQuery.phoneVerified = false;
                    break;
                case 'kyc_unverified':
                    filterQuery.kycStatus = { $ne: 'approved' };
                    break;
                case 'kyc_pending':
                    filterQuery.kycStatus = 'pending';
                    break;
            }
        }

        const users = await this.userModel.find(filterQuery)
            .skip(skip)
            .limit(Number(limit))
            .exec();

        const total = await this.userModel.countDocuments(filterQuery);

        return {
            data: users,
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string) {
        const user = await this.userModel.findById(id).lean();
        if (!user) throw new NotFoundException('User not found');

        // Aggregations
        const totalTrades = await this.tradeModel.countDocuments({ userId: id });
        const totalOrders = totalTrades; // Assuming order = trade for now, or fetch from Order model if exists

        // Total Deposit
        const depositStats = await this.transactionModel.aggregate([
            { $match: { userId: new Types.ObjectId(id), type: 'deposit', status: 'success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalDeposit = depositStats[0]?.total || 0;

        // Total Transactions Count
        const transactionCount = await this.transactionModel.countDocuments({ userId: id });

        return {
            ...user,
            totalTrades,
            totalOrders,
            totalDeposit,
            transactionCount,
            walletBalance: user.realBalance + user.bonusBalance // inferred
        };
    }

    async update(id: string, updateData: any) {
        const user = await this.userModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        if (!user) throw new NotFoundException('User not found');
        return user;
    }
}
