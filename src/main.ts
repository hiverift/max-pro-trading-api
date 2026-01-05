import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors(); // Add if frontend needed
  await app.listen(3000);
  console.log('App running on http://localhost:3000');
}
bootstrap();