import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class InviteMemberDto {
  @ApiProperty({ example: 'member@example.com', description: 'Email người được mời' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;
}

export class AcceptInviteDto {
  @ApiProperty({ example: 'uuid-invite-token', description: 'Token từ link email mời' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class RejectInviteDto {
  @ApiProperty({ example: 'uuid-invite-token', description: 'Token từ link email mời' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class FamilyMemberDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'member@example.com' })
  invitedEmail!: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A', nullable: true })
  memberName!: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  memberAvatar!: string | null;

  @ApiProperty({ example: 'active', description: 'pending | active | rejected | removed' })
  status!: string;

  @ApiProperty({ example: '2026-09-24T00:00:00.000Z' })
  invitedAt!: string;

  @ApiPropertyOptional({ example: '2026-09-24T01:00:00.000Z', nullable: true })
  joinedAt!: string | null;
}

export class FamilyGroupDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'active', description: 'active | dissolved' })
  status!: string;

  @ApiProperty({ description: 'Thông tin chủ gia đình' })
  owner!: { id: string; name: string | null; avatar: string | null };

  @ApiProperty({ type: [FamilyMemberDto], description: 'Danh sách thành viên (không bao gồm owner)' })
  members!: FamilyMemberDto[];

  @ApiProperty({ example: 3, description: 'Số thành viên active hiện tại' })
  activeCount!: number;

  @ApiProperty({ example: 5, description: 'Giới hạn thành viên tối đa' })
  maxMembers!: number;

  @ApiProperty({ example: '2026-09-24T00:00:00.000Z' })
  createdAt!: string;
}

export class FamilyRoleDto {
  @ApiProperty({ example: 'owner', description: 'owner | member | none' })
  role!: 'owner' | 'member' | 'none';

  @ApiPropertyOptional({ type: FamilyGroupDto, nullable: true })
  group!: FamilyGroupDto | null;
}
