import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin,AdminSchema } from './schema/admin.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserSchema } from 'src/auth/user.schema';
import { TransactionSchema } from 'src/transaction/schema/transaction.schema';
import { TradeSchema } from 'src/trade/schema/trade.schema';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/jwt.strategy'; // reuse your existing JWT strategy
import { LoginLog, LoginLogSchema } from './schema/login-log.schema';
import { AuditLog, AuditLogSchema } from './schema/audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Transaction', schema: TransactionSchema },
      { name: 'Trade', schema: TradeSchema },
      { name: LoginLog.name, schema: LoginLogSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, JwtStrategy],
  exports: [AdminService],
})
export class AdminModule {}