// src/ticket/ticket.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ticket } from './entities/ticket.entity';
import { User } from '../auth/user.schema';

@Injectable()
export class TicketService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<Ticket>,
    @InjectModel('User') private userModel: Model<User>,
  ) {}

  // 1. User: Create new ticket
  async createTicket(userId: string, data: {
    subject: string;
    description: string;
    category: string;
    attachment?: string;
  }) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const ticket = new this.ticketModel({
      userId,
      subject: data.subject,
      description: data.description,
      category: data.category,
      attachment: data.attachment,
      status: 'open',
      priority: 'medium',
      replies: [],
    });

    await ticket.save();
    return { message: 'Ticket created', ticketId: ticket._id };
  }

  // 2. User: Get my tickets (with optional status filter)
  async getMyTickets(userId: string, status?: string) {
    const filter: any = { userId };
    if (status) filter.status = status;

    return this.ticketModel
      .find(filter)
      .sort({ createdAt: -1 })
      .select('subject category status priority createdAt replies.length attachment');
  }

  // 3. User or Admin: Add reply
  async addReply(ticketId: string, userId: string | null, message: string, isAdmin: boolean = false) {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    // User can only reply to their own ticket
    if (!isAdmin) {
      if (!userId || ticket.userId.toString() !== userId) {
        throw new ForbiddenException('Not your ticket');
      }
    }

    ticket.replies.push({
      message,
      sender: isAdmin ? 'admin' : 'user',
      createdAt: new Date(),
    });

    // Optional: Update status to in_progress on first reply
    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();
    return { message: 'Reply added' };
  }

  // 4. Admin: Get all tickets
  async getAllTickets(status?: string, userId?: string, limit = 20, skip = 0) {
    const filter: any = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const tickets = await this.ticketModel
      .find(filter)
      .populate('userId', 'email username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.ticketModel.countDocuments(filter);

    return { tickets, pagination: { total, limit, skip } };
  }

  // 5. Admin: Update status / priority
  async updateTicketStatus(ticketId: string, status?: string, priority?: string) {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (status === 'closed' || status === 'resolved') {
      ticket.closedAt = new Date();
    }

    await ticket.save();
    return { message: `Ticket updated to ${status || 'unchanged'}` };
  }

  // 6. View single ticket (user or admin)
  async getTicket(ticketId: string, userId: string, isAdmin: boolean = false) {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate('userId', 'email username');

    if (!ticket) throw new NotFoundException('Ticket not found');

    if (!isAdmin && ticket.userId.toString() !== userId) {
      throw new ForbiddenException('Not your ticket');
    }

    return ticket;
  }
}