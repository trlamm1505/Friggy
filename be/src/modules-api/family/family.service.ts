/**
 * FamilyService — Nghiệp vụ Gói Gia Đình
 *
 * Quy tắc:
 * - 1 user chỉ sở hữu 1 FamilyGroup (ownerId UNIQUE)
 * - Tối đa 5 thành viên active (không tính pending/rejected/removed)
 * - Chỉ owner mới có quyền: invite, remove, dissolve
 * - Invite token UUID, hết hạn 48h
 * - Thành viên giữ gói riêng — hưởng quyền lợi max(gói riêng, Family)
 * - Khi dissolve → tất cả member status=removed + notify
 */
import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import type { InviteMemberDto, FamilyGroupDto, FamilyRoleDto } from './dto/family.dto';

const MAX_MEMBERS = 5;
const INVITE_EXPIRE_HOURS = 48;

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('EMAIL_SERVICE') private readonly emailClient: ClientProxy,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Tạo FamilyGroup (gọi từ webhook khi activate Family plan)
  // ─────────────────────────────────────────────────────────

  async createGroupForOwner(ownerId: string): Promise<void> {
    const existing = await this.prisma.familyGroup.findUnique({ where: { ownerId } });
    if (existing) {
      if (existing.status === 'dissolved') {
        await this.prisma.familyGroup.update({
          where: { id: existing.id },
          data: { status: 'active', deletedAt: null },
        });
        this.logger.log(`[Family] Reactivated FamilyGroup for ownerId=${ownerId}`);
      }
      return;
    }
    await this.prisma.familyGroup.create({
      data: { id: uuid(), ownerId, status: 'active' },
    });
    this.logger.log(`[Family] Created FamilyGroup for ownerId=${ownerId}`);
  }

  // ─────────────────────────────────────────────────────────
  // GET /family/me
  // ─────────────────────────────────────────────────────────

  async getMyFamily(userId: string): Promise<FamilyRoleDto> {
    const profileSelect = { select: { displayName: true, avatarPath: true } };

    // Kiểm tra là owner
    const owned = await this.prisma.familyGroup.findUnique({
      where: { ownerId: userId },
      include: {
        owner: { select: { id: true, profile: profileSelect } },
        members: {
          where: { status: { not: 'removed' } },
          include: { user: { select: { id: true, profile: profileSelect } } },
          orderBy: { invitedAt: 'asc' },
        },
      },
    });
    if (owned && owned.status === 'active') return { role: 'owner', group: this.mapGroup(owned) };

    // Kiểm tra là member
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, status: 'active' },
      include: {
        familyGroup: {
          include: {
            owner: { select: { id: true, profile: profileSelect } },
            members: {
              where: { status: { not: 'removed' } },
              include: { user: { select: { id: true, profile: profileSelect } } },
              orderBy: { invitedAt: 'asc' },
            },
          },
        },
      },
    });
    if (membership) return { role: 'member', group: this.mapGroup(membership.familyGroup) };

    return { role: 'none', group: null };
  }

  // ─────────────────────────────────────────────────────────
  // POST /family/invite — Mời thành viên (Owner only)
  // ─────────────────────────────────────────────────────────

  async inviteMember(ownerId: string, dto: InviteMemberDto): Promise<{ message: string }> {
    const group = await this.requireActiveGroup(ownerId);

    const activeCount = await this.prisma.familyMember.count({
      where: { familyGroupId: group.id, status: 'active' },
    });
    if (activeCount >= MAX_MEMBERS) {
      throw new BadRequestException(`Đã đạt giới hạn ${MAX_MEMBERS} thành viên`);
    }

    const owner = await this.prisma.user.findUnique({ where: { id: ownerId }, select: { email: true, name: true } });
    if (owner?.email === dto.email) throw new BadRequestException('Không thể mời chính mình');

    // Kiểm tra đã mời chưa
    const existing = await this.prisma.familyMember.findUnique({
      where: { familyGroupId_invitedEmail: { familyGroupId: group.id, invitedEmail: dto.email } },
    });
    if (existing) {
      if (existing.status === 'active') throw new ConflictException('Email này đã là thành viên');
      if (existing.status === 'pending') {
        const elapsed = Date.now() - new Date(existing.invitedAt).getTime();
        if (elapsed < INVITE_EXPIRE_HOURS * 60 * 60 * 1000) {
          throw new ConflictException('Đã gửi lời mời cho email này, chưa hết hạn');
        }
      }
      // pending hết hạn | rejected | removed → cho phép re-invite, xóa bản ghi cũ
      await this.prisma.familyMember.delete({ where: { id: existing.id } });
    }

    const inviteToken = uuid();
    const member = await this.prisma.familyMember.create({
      data: {
        id: uuid(),
        familyGroupId: group.id,
        invitedEmail: dto.email,
        status: 'pending',
        inviteToken,
        updatedAt: new Date(),
      },
    });

    // Gắn userId + kiểm tra user đã trong gia đình khác chưa
    const invitedUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
      select: { id: true, name: true },
    });
    if (invitedUser) {
      // Edge case: user đã active trong gia đình khác
      const alreadyInFamily = await this.prisma.familyMember.findFirst({
        where: { userId: invitedUser.id, status: 'active' },
      });
      if (alreadyInFamily) {
        throw new ConflictException('Người dùng này đã là thành viên của một gia đình khác');
      }

      await this.prisma.familyMember.update({ where: { id: member.id }, data: { userId: invitedUser.id } });
      await this.createNotification(
        invitedUser.id,
        'family_invite',
        '🏠 Lời mời tham gia Gia đình Friggy',
        `${owner?.name ?? owner?.email ?? 'Ai đó'} đã mời bạn tham gia gia đình Friggy. Kiểm tra email để xác nhận.`,
        { inviteToken, familyGroupId: group.id },
      );
    }

    // Gửi email qua RabbitMQ → email_queue (fire-and-forget, không await)
    this.publishEmail('family_invite', dto.email, {
      ownerName: owner?.name ?? 'Chủ gia đình',
      inviteToken,
      memberName: invitedUser?.name ?? null,
    });

    this.logger.log(`[Family] Invited ${dto.email} to group ${group.id}`);
    return { message: `Đã gửi lời mời đến ${dto.email}` };
  }

  // ─────────────────────────────────────────────────────────
  // POST /family/accept
  // ─────────────────────────────────────────────────────────

  async acceptInvite(token: string, userId?: string): Promise<{ message: string }> {
    const member = await this.prisma.familyMember.findUnique({
      where: { inviteToken: token },
      include: { familyGroup: true },
    });
    if (!member) throw new NotFoundException('Token không hợp lệ hoặc đã hết hạn');
    if (member.status !== 'pending') {
      throw new BadRequestException(`Lời mời đã được ${member.status === 'active' ? 'chấp nhận' : 'xử lý'}`);
    }

    const elapsed = Date.now() - new Date(member.invitedAt).getTime();
    if (elapsed > INVITE_EXPIRE_HOURS * 60 * 60 * 1000) {
      throw new BadRequestException('Lời mời đã hết hạn (48 giờ). Vui lòng yêu cầu lời mời mới.');
    }

    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user?.email !== member.invitedEmail) {
        throw new ForbiddenException('Email tài khoản không khớp với lời mời');
      }
    }

    // Atomic: count + update trong transaction → tránh race condition
    await this.prisma.$transaction(async (tx) => {
      const activeCount = await tx.familyMember.count({
        where: { familyGroupId: member.familyGroupId, status: 'active' },
      });
      if (activeCount >= MAX_MEMBERS) {
        throw new BadRequestException('Gia đình đã đầy (tối đa 5 thành viên)');
      }
      await tx.familyMember.update({
        where: { id: member.id },
        data: { status: 'active', joinedAt: new Date(), userId: userId ?? member.userId },
      });
    });

    await this.createNotification(
      member.familyGroup.ownerId,
      'family_joined',
      '✅ Thành viên mới đã tham gia',
      `${member.invitedEmail} đã chấp nhận lời mời tham gia gia đình.`,
      { memberId: member.id, email: member.invitedEmail },
    );

    this.logger.log(`[Family] ${member.invitedEmail} accepted invite for group ${member.familyGroupId}`);
    return { message: 'Đã tham gia gia đình thành công!' };
  }

  // ─────────────────────────────────────────────────────────
  // POST /family/reject
  // ─────────────────────────────────────────────────────────

  async rejectInvite(token: string): Promise<{ message: string }> {
    const member = await this.prisma.familyMember.findUnique({
      where: { inviteToken: token },
      include: { familyGroup: true },
    });
    if (!member) throw new NotFoundException('Token không hợp lệ');
    if (member.status !== 'pending') throw new BadRequestException('Lời mời đã được xử lý');

    await this.prisma.familyMember.update({ where: { id: member.id }, data: { status: 'rejected' } });

    await this.createNotification(
      member.familyGroup.ownerId,
      'family_rejected',
      '❌ Lời mời bị từ chối',
      `${member.invitedEmail} đã từ chối lời mời tham gia gia đình.`,
      { email: member.invitedEmail },
    );

    this.logger.log(`[Family] ${member.invitedEmail} rejected invite for group ${member.familyGroupId}`);
    return { message: 'Đã từ chối lời mời' };
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /family/members/:memberId
  // ─────────────────────────────────────────────────────────

  async removeMember(ownerId: string, memberId: string): Promise<{ message: string }> {
    const group = await this.requireActiveGroup(ownerId);
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyGroupId: group.id },
    });
    if (!member) throw new NotFoundException('Không tìm thấy thành viên');
    if (member.status === 'removed') throw new BadRequestException('Thành viên đã bị xóa trước đó');

    await this.prisma.familyMember.update({ where: { id: memberId }, data: { status: 'removed' } });

    if (member.userId) {
      await this.createNotification(
        member.userId,
        'family_removed',
        '👋 Bạn đã bị xóa khỏi gia đình',
        'Chủ gia đình đã xóa bạn khỏi nhóm Friggy.',
        { familyGroupId: group.id },
      );
    }
    await this.publishEmail('family_removed', member.invitedEmail, {});

    this.logger.log(`[Family] Owner ${ownerId} removed member ${memberId}`);
    return { message: 'Đã xóa thành viên khỏi gia đình' };
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /family/groups — Giải tán
  // ─────────────────────────────────────────────────────────

  async dissolveGroup(ownerId: string): Promise<{ message: string }> {
    const group = await this.requireActiveGroup(ownerId);

    const activeMembers = await this.prisma.familyMember.findMany({
      where: { familyGroupId: group.id, status: 'active' },
    });

    await this.prisma.familyMember.updateMany({
      where: { familyGroupId: group.id, status: { in: ['pending', 'active'] } },
      data: { status: 'removed' },
    });
    await this.prisma.familyGroup.update({
      where: { id: group.id },
      data: { status: 'dissolved', deletedAt: new Date() },
    });

    for (const member of activeMembers) {
      if (member.userId) {
        await this.createNotification(
          member.userId,
          'family_dissolved',
          '🏚️ Gia đình đã bị giải tán',
          'Chủ gia đình đã giải tán nhóm Friggy. Bạn vẫn giữ gói dịch vụ cá nhân của mình.',
          { familyGroupId: group.id },
        );
      }
      await this.publishEmail('family_dissolved', member.invitedEmail, {});
    }

    this.logger.log(`[Family] Owner ${ownerId} dissolved group ${group.id} with ${activeMembers.length} members`);
    return { message: 'Đã giải tán gia đình. Thành viên đã được thông báo.' };
  }

  // ─────────────────────────────────────────────────────────
  // Cron: Auto-dissolve khi owner hết hạn gói Family
  // ─────────────────────────────────────────────────────────

  async autoDissolveExpired(): Promise<number> {
    const activeGroups = await this.prisma.familyGroup.findMany({
      where: { status: 'active' },
      include: {
        owner: {
          include: {
            subscription: { include: { plan: true } },
          },
        },
        members: { where: { status: 'active' } },
      },
    });

    let dissolved = 0;
    for (const group of activeGroups) {
      const sub = group.owner.subscription;
      const isOwnerActive = sub && sub.status === 'active' && sub.plan.name === 'family';
      if (isOwnerActive) continue;

      await this.prisma.familyMember.updateMany({
        where: { familyGroupId: group.id, status: { in: ['pending', 'active'] } },
        data: { status: 'removed' },
      });
      await this.prisma.familyGroup.update({
        where: { id: group.id },
        data: { status: 'dissolved', deletedAt: new Date() },
      });

      for (const member of group.members) {
        if (member.userId) {
          await this.createNotification(
            member.userId,
            'family_dissolved',
            '🏚️ Gia đình đã hết hạn',
            'Gói Family của chủ gia đình đã hết hạn. Bạn vẫn giữ gói dịch vụ cá nhân.',
            { familyGroupId: group.id },
          );
        }
        await this.publishEmail('family_dissolved', member.invitedEmail, {});
      }

      this.logger.log(`[Family] Auto-dissolved group ${group.id} (owner ${group.ownerId} plan expired)`);
      dissolved++;
    }
    return dissolved;
  }

  // ─────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────

  private async requireActiveGroup(ownerId: string) {
    const group = await this.prisma.familyGroup.findUnique({ where: { ownerId } });
    if (!group || group.status !== 'active') {
      throw new NotFoundException('Bạn chưa có nhóm gia đình hoặc nhóm đã bị giải tán');
    }
    return group;
  }

  private async createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    metadata: Record<string, any> = {},
  ) {
    try {
      await this.prisma.notification.create({
        data: { userId, type: type as any, title, body, metadata },
      });
    } catch (err) {
      this.logger.warn(`[Family] Failed to create notification for ${userId}: ${err}`);
    }
  }

  private publishEmail(type: string, to: string, data: Record<string, any>) {
    // Dùng .emit() — fire-and-forget, không await
    this.emailClient.emit('email.send', { type, to, data });
    this.logger.log(`[Family] Email queued: type=${type} | to=${to}`);
  }

  private mapGroup(group: any): FamilyGroupDto {
    return {
      id: group.id,
      status: group.status,
      owner: {
        id: group.owner.id,
        name: group.owner.profile?.displayName ?? null,
        avatar: group.owner.profile?.avatarPath ?? null,
      },
      members: (group.members ?? []).map((m: any) => ({
        id: m.id,
        invitedEmail: m.invitedEmail,
        memberName: m.user?.profile?.displayName ?? null,
        memberAvatar: m.user?.profile?.avatarPath ?? null,
        status: m.status,
        invitedAt: m.invitedAt.toISOString(),
        joinedAt: m.joinedAt?.toISOString() ?? null,
      })),
      activeCount: (group.members ?? []).filter((m: any) => m.status === 'active').length,
      maxMembers: MAX_MEMBERS,
      createdAt: group.createdAt.toISOString(),
    };
  }
}
