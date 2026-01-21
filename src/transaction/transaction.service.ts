import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from './schema/transaction.schema';
import { User } from '../auth/user.schema';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TransactionService {
    constructor(
        @InjectModel(Transaction.name) private txModel: Model<Transaction>,
        @InjectModel('User') private userModel: Model<User>,
    ) { }

    // Create Deposit Request
    async createDeposit(userId: string, amount: number, method: string) {
        const user = await this.userModel.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        if (amount <= 0) throw new BadRequestException('Amount must be positive');

        const tx = await this.txModel.create({
            userId,
            type: 'deposit',
            amount,
            method,
            status: 'pending',
            transactionId: `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            description: `Deposit via ${method}`,
        });

        return { message: 'Deposit request created – waiting for approval', txId: tx._id };
    }

    // Create Withdrawal Request
    async createWithdrawal(userId: string, amount: number, method: string) {
        const user = await this.userModel.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        if (user.kycStatus !== 'approved') throw new BadRequestException('KYC required for withdrawal');
        if (user.realBalance < amount) throw new BadRequestException('Insufficient balance');

        const tx = await this.txModel.create({
            userId,
            type: 'withdraw',
            amount: -amount, // Negative to deduct
            method,
            status: 'pending',
            transactionId: `WD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            description: `Withdrawal request via ${method}`,
        });

        return { message: 'Withdrawal request submitted – awaiting approval', txId: tx._id };
    }

    // Get User Transaction History
    async getHistory(userId: string, limit = 20, skip = 0) {
        const txs = await this.txModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await this.txModel.countDocuments({ userId });

        return { transactions: txs, pagination: { total, limit, skip } };
    }

    // Admin Approve Transaction (Deposit/Withdraw)
    async adminApprove(txId: string) {
        const tx = await this.txModel.findById(txId);
        if (!tx) throw new NotFoundException('Transaction not found');
        if (tx.status !== 'pending') throw new BadRequestException('Transaction already processed');

        tx.status = 'success';
        await tx.save();

        const user = await this.userModel.findById(tx.userId);
        if (!user) throw new NotFoundException('User not found');
        if (tx.type === 'deposit') {
            user.realBalance += tx.amount;
        } else if (tx.type === 'withdraw') {
            user.realBalance += tx.amount; 
        }
        await user.save();

        return { message: 'Transaction approved', txId };
    }

    // Admin Reject Transaction
    async adminReject(txId: string, reason: string) {
        const tx = await this.txModel.findById(txId);
        if (!tx) throw new NotFoundException('Transaction not found');
        if (tx.status !== 'pending') throw new BadRequestException('Transaction already processed');

        tx.status = 'rejected';
        tx.rejectionReason = reason;
        await tx.save();

        // Refund on reject (for withdrawal)
        if (tx.type === 'withdraw') {
            const user = await this.userModel.findById(tx.userId);
            if (!user) throw new NotFoundException('User not found');
            user.realBalance -= tx.amount; // amount negative → add back
            await user.save();
        }

        return { message: 'Transaction rejected', reason, txId };
    }

    // Bonus Credit (called from other modules)
    async creditBonus(userId: string, amount: number, reason: string, expiresInDays = 30) {
        const tx = await this.txModel.create({
            userId,
            type: 'bonus_credit',
            amount,
            status: 'success',
            transactionId: `BONUS-${Date.now()}`,
            description: reason,
            expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
        });

        const user = await this.userModel.findById(userId);
        if (!user) throw new NotFoundException('User not found');
        user.bonusBalance += amount;
        await user.save();

        return tx;
    }

    // Cron: Expire Bonus Daily
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async expireBonus() {
        const expired = await this.txModel.find({
            type: 'bonus_credit',
            status: 'success',
            expiresAt: { $lt: new Date() },
        });

        for (const tx of expired) {
            const user = await this.userModel.findById(tx.userId);
            if (user) {
                user.bonusBalance = Math.max(0, user.bonusBalance - tx.amount);
                await user.save();
            }

            tx.status = 'expired';
            await tx.save();
        }

        console.log(`Expired ${expired.length} bonus transactions`);
    }
}