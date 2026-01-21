import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { UserModule } from 'src/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { OtpSchema } from './otp.schema';
console.log("jdoneonodoen", process.env.JWT_SECRET || 'default_secret')
@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Otp', schema: OtpSchema },]),
    UserModule, // ✅ user model yahin se milega
    PassportModule.register({ defaultStrategy: 'jwt' }),
     JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
