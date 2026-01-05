import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';

import CustomResponse from 'src/provider/custom-response.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    const result = await this.health.check([
      () => this.mongoose.pingCheck('database', { timeout: 1500 }),
    ]);

    return new CustomResponse(200, 'Health check successful', result);
  }
}
