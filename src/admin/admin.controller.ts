import { Controller, Get, Put, Post, Param, Body, Req, UseGuards, Query, Delete } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/gaurds/jwt.auth.guard';
import { RolesGuard } from 'src/common/gaurds/roles.guard';
import { PermissionsGuard } from 'src/common/gaurds/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) { }


  @Post('login')
  async login(@Body() body: { email: string; password: string }, @Req() req: any) {
    console.log('doenondoneo');
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.adminService.adminLogin(body.email, body.password, ip, userAgent);
  }


  @Post('verify-2fa')
  async verify2FA(@Body() body: { email: string; otp: string }, @Req() req: any) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.adminService.verifyAdmin2FA(body.email, body.otp, ip, userAgent);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('VIEW_DASHBOARD')
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }


  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('MANAGE_KYC')
  @Get('kyc/pending')
  getKycPending() {
    return this.adminService.getKycPending();
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('MANAGE_KYC')
  @Put('kyc/:id/approve')
  approveKyc(@Param('id') id: string) {
    return this.adminService.approveKyc(id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('VIEW_FINANCE')
  @Get('deposits')
  getDeposits() {
    return this.adminService.getDeposits();
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('APPROVE_DEPOSITS')
  @Put('deposit/:id/approve')
  approveDeposit(@Param('id') id: string) {
    return this.adminService.approveDeposit(id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('VIEW_FINANCE')
  @Get('withdrawals')
  getWithdrawals() {
    return this.adminService.getWithdrawals();
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('MANAGE_WITHDRAWALS')
  @Put('withdrawal/:id/approve')
  approveWithdrawal(@Param('id') id: string) {
    return this.adminService.approveWithdrawal(id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('MANAGE_WITHDRAWALS')
  @Put('withdrawal/:id/reject')
  rejectWithdrawal(@Param('id') id: string) {
    return this.adminService.rejectWithdrawal(id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('MANAGE_SECURITY')
  @Put('wallet/:id/freeze')
  freezeWallet(@Param('id') id: string) {
    return this.adminService.freezeWallet(id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('MANAGE_USERS')
  @Put('user/:id/approve-leader')
  approveLeader(@Param('id') id: string) {
    return this.adminService.approveLeader(id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('VIEW_DASHBOARD')
  @Get('alerts/high-loss')
  getHighLossAlerts() {
    return this.adminService.getHighLossAlerts();
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('VIEW_DASHBOARD')
  @Get('alerts/api-downtime')
  getApiDowntimeAlerts() {
    return this.adminService.getApiDowntimeAlerts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @Delete('users/:userId')
  async deleteUser(@Param('userId') userId: string) {
    return this.adminService.deleteUser(userId);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('VIEW_USERS')
  @Get('users')
  async getUsers(
    @Query() query: {
      email?: string;
      phone?: string;
      userId?: string;
      kycStatus?: string;
      accountStatus?: string;
      referralSource?: string;
      page?: string;
      limit?: string;
    },
  ) {
    return this.adminService.getUsers(query);
  }

  /**
   * Get single user profile (full details)
   */
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('VIEW_USERS')
  @Get('users/:id')
  async getUserProfile(@Param('id') id: string) {
    return this.adminService.getUserProfile(id);
  }

  /**
   * Update user profile (name, email, phone, etc.)
   */
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('MANAGE_USERS')
  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() updates: any) {
    return this.adminService.updateUser(id, updates);
  }

  /**
   * Block / Unblock user account
   */
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('BLOCK_USERS')
  @Post('users/:id/block')
  async blockUnblockUser(@Param('id') id: string, @Body('block') block: boolean, @Body('reason') reason?: string) {
    return this.adminService.blockUnblockUser(id, block, reason);
  }

  /**
   * Reset user password (send new random password via email)
   */
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('MANAGE_USERS')
  @Post('users/:id/reset-password')
  async resetPassword(@Param('id') id: string) {
    return this.adminService.resetPassword(id);
  }

  /**
   * Manual balance adjustment (realBalance) with audit log
   */
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('ADJUST_BALANCE')
  @Post('users/:id/balance-adjust')
  async adjustBalance(@Param('id') id: string, @Body('amount') amount: number, @Body('reason') reason: string) {
    return this.adminService.adjustBalance(id, amount, reason);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('VIEW_SECURITY')
  @Get('security/logins')
  async getLoginLogs(
    @Query() query: {
      userId?: string;
      email?: string;
      ip?: string;
      status?: string;
      page?: string;
      limit?: string;
    },
  ) {
    return this.adminService.getLoginLogs(query);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'superadmin')
  @Permissions('MANAGE_SECURITY')
  @Post('security/force-logout')
  async forceLogout(@Body() body: { userId: string; reason?: string }) {
    return this.adminService.forceLogout(body.userId, body.reason);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @Put('permissions/:adminId')
  async updateAdminPermissions(@Param('adminId') adminId: string, @Body('permissions') permissions: string[]) {
    return this.adminService.updateAdminPermissions(adminId, permissions);
  }

  // ────────────────────────────────────────────────
  // DYNAMIC ROLE & PERMISSION MANAGEMENT (SUPER ADMIN)
  // ────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @Get('permissions/list')
  async getAllPermissions() {
    return this.adminService.getAllPermissions();
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @Post('permissions')
  async createPermission(@Body() dto: { name: string; slug: string; module: string; description?: string }) {
    return this.adminService.createPermission(dto);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @Delete('permissions/:id')
  async deletePermission(@Param('id') id: string) {
    return this.adminService.deletePermission(id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @Get('roles')
  async getAllRoles() {
    return this.adminService.getAllRoles();
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @Post('roles')
  async createRole(@Body() dto: { name: string; permissions: string[]; description?: string }) {
    return this.adminService.createRole(dto);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @Put('roles/:id')
  async updateRole(@Param('id') id: string, @Body() dto: { name?: string; permissions?: string[]; description?: string }) {
    return this.adminService.updateRole(id, dto);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @Delete('roles/:id')
  async deleteRole(@Param('id') id: string) {
    return this.adminService.deleteRole(id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @Post('users/:id/assign-roles')
  async assignRoles(
    @Param('id') id: string,
    @Body('roleIds') roleIds: string[],
    @Body('customPermissions') customPermissions?: string[],
  ) {
    return this.adminService.assignRolesToAdmin(id, roleIds, customPermissions);
  }
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  // @Delete(':userId')
  // async deleteKyc(@Param('userId') userId: string) {
  //   return this.adminService.deleteKyc(userId);
  // }

  // @UseGuards(JwtAuthGuard)
  // @Delete('my')
  // async deleteMyKyc(@Req() req) {
  //   return this.adminService.deleteKyc(req.user.userId);
  // }
}