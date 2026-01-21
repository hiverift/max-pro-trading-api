import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ticket,TicketSchema } from './entities/ticket.entity';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { UserSchema } from '../auth/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}