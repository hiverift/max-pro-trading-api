import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
     console.log('🔥 JwtStrategy CONSTRUCTOR CALLED',process.env.JWT_SECRET); // 🔥
    super({
        
      
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'default_secret',
    });


  }

  async validate(payload: any) {
    console.log('JWT VALIDATED PAYLOAD:', payload); // 🔥 MUST PRINT
    return payload;
  }
}
