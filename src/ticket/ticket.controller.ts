// src/ticket/ticket.controller.ts
// Full corrected controller – all TypeScript errors fixed

import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  Query,
  BadRequestException,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { RolesGuard } from 'src/common/gaurds/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TicketService } from './ticket.service';
import { UseInterceptors } from '@nestjs/common';
import { Express } from 'express';
import { Multer } from 'multer';
@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  // 1. User: Create new ticket (with optional file upload)
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FilesInterceptor('attachment', 1))
  async createTicket(
    @Req() req,
    @Body() body: { subject: string; description: string; category: string },
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const attachmentPath = files?.[0]?.path; // single file support

    return this.ticketService.createTicket(req.user.userId, {
      subject: body.subject,
      description: body.description,
      category: body.category,
      attachment: attachmentPath,
    });
  }

  // 2. User: Get my tickets (with optional status filter)
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyTickets(@Req() req, @Query('status') status?: string) {
    return this.ticketService.getMyTickets(req.user.userId, status);
  }

  // 3. User: Add reply to own ticket
  @UseGuards(JwtAuthGuard)
  @Put(':id/reply')
  async addReply(@Req() req, @Param('id') id: string, @Body('message') message: string) {
    if (!message?.trim()) throw new BadRequestException('Message is required');
    return this.ticketService.addReply(id, req.user.userId, message.trim(), false);
  }

  // ────────────────────────────────────────────────
  // ADMIN ENDPOINTS
  // ────────────────────────────────────────────────

  // Admin: Get all tickets (paginated + filters)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get()
  async getAllTickets(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit = '20',
    @Query('skip') skip = '0',
  ) {
    return this.ticketService.getAllTickets(status, userId, +limit, +skip);
  }

  // Admin: Reply to any ticket
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put(':id/reply')
  async adminReply(@Param('id') id: string, @Body('message') message: string) {
    if (!message?.trim()) throw new BadRequestException('Message is required');
    return this.ticketService.addReply(id, null, message.trim(), true);
  }

  // Admin: Update ticket status / priority
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status?: string; priority?: string },
  ) {
    if (!body.status && !body.priority) {
      throw new BadRequestException('At least status or priority is required');
    }
    return this.ticketService.updateTicketStatus(id, body.status, body.priority);
  }

  // Admin/User: View single ticket (full details + replies)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getTicket(@Req() req, @Param('id') id: string) {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    return this.ticketService.getTicket(id, req.user.userId, isAdmin);
  }
}