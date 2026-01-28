import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { UnauthorizedException } from '@nestjs/common'; 

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @InjectModel('User') private userModel: Model<User>,
  ) {
     console.log('🔥 JwtStrategy CONSTRUCTOR CALLED',process.env.JWT_SECRET); // 🔥
    super({
        
      
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'default_secret',
    });


  }

  async validate(payload: any) {
   const user = await this.userModel.findById(payload.sub);
  if (!user) throw new UnauthorizedException();

  if (user.loggedOutUntil && user.loggedOutUntil > new Date()) {
    throw new UnauthorizedException('Session terminated by admin');
  }

  if (user.isLocked && (!user.lockUntil || user.lockUntil > new Date())) {
    throw new UnauthorizedException('Account temporarily locked');
  }

  return { userId: payload.sub, email: payload.email, role: payload.role };

  }
}
