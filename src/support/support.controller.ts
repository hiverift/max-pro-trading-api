import { Controller,Post,Req,Body } from '@nestjs/common';

@Controller('support')
export class SupportController {

@Post('ticket')
createTicket(@Req() req, @Body() dto: { subject: string; message: string }) {
  // Save to DB
  return { message: 'Ticket created' };
}
}
