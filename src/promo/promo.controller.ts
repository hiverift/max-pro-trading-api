import { Controller ,UseGuards,Get} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';

@Controller('promo')
@UseGuards(JwtAuthGuard)
export class PromoController {
  @Get('materials')
  getMaterials() {
    return {
      referralLandings: ['https://tradepro.com/landing1', 'https://tradepro.com/landing2'],
      banners: ['/assets/banner1.png', '/assets/banner2.jpg'],
    };
  }
}