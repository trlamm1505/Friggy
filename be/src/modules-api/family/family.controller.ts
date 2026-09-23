import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FamilyService } from './family.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import {
  InviteMemberDto,
  AcceptInviteDto,
  RejectInviteDto,
  FamilyRoleDto,
} from './dto/family.dto';

@ApiTags('Family')
@ApiBearerAuth('access-token')
@Controller('family')
export class FamilyController {
  constructor(private readonly service: FamilyService) {}

  // ─────────────────────────────────────────────────────────
  // GET /family/me — Thông tin gia đình
  // ─────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({
    summary: 'Thông tin gia đình của tôi',
    description:
      'Trả về role của user trong hệ thống gia đình:\n\n' +
      '- `owner` — là chủ gia đình\n' +
      '- `member` — là thành viên\n' +
      '- `none` — chưa có gia đình',
  })
  @ApiResponse({ status: 200, type: FamilyRoleDto })
  getMyFamily(@CurrentUser() user: JwtPayload): Promise<FamilyRoleDto> {
    return this.service.getMyFamily(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // POST /family/invite — Mời thành viên (Owner only)
  // ─────────────────────────────────────────────────────────

  @Post('invite')
  @ApiOperation({
    summary: '[Owner] Mời thành viên vào gia đình qua email',
    description:
      'Gửi lời mời qua email + notification. Tối đa **5 thành viên** active.\n\n' +
      'Token mời hết hạn sau **48 giờ**.',
  })
  @ApiResponse({ status: 201, description: 'Đã gửi lời mời thành công' })
  @ApiResponse({ status: 400, description: 'Email không hợp lệ hoặc đã đạt giới hạn' })
  @ApiResponse({ status: 409, description: 'Email này đã là thành viên hoặc đã có lời mời còn hạn' })
  inviteMember(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteMemberDto,
  ) {
    return this.service.inviteMember(user.sub, dto);
  }

  // ─────────────────────────────────────────────────────────
  // POST /family/accept — Chấp nhận lời mời (token-based, không cần auth)
  // ─────────────────────────────────────────────────────────

  @Post('accept')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chấp nhận lời mời tham gia gia đình (token từ email)',
    description:
      'Không yêu cầu đăng nhập.\n\n' +
      'Nếu user đã đăng nhập → BE sẽ validate email tài khoản khớp với email được mời.',
  })
  @ApiResponse({ status: 200, description: 'Đã tham gia gia đình thành công' })
  @ApiResponse({ status: 400, description: 'Token hết hạn hoặc đã xử lý' })
  @ApiResponse({ status: 404, description: 'Token không hợp lệ' })
  acceptInvite(@Body() dto: AcceptInviteDto) {
    // userId = undefined vì Public endpoint — FE có thể truyền token header nếu muốn
    return this.service.acceptInvite(dto.token, undefined);
  }

  // ─────────────────────────────────────────────────────────
  // POST /family/reject — Từ chối lời mời (token-based, không cần auth)
  // ─────────────────────────────────────────────────────────

  @Post('reject')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Từ chối lời mời tham gia gia đình (token từ email)' })
  @ApiResponse({ status: 200, description: 'Đã từ chối lời mời' })
  rejectInvite(@Body() dto: RejectInviteDto) {
    return this.service.rejectInvite(dto.token);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /family/members/:memberId — Xóa thành viên (Owner only)
  // ─────────────────────────────────────────────────────────

  @Delete('members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Owner] Xóa thành viên khỏi gia đình' })
  @ApiParam({ name: 'memberId', description: 'ID của FamilyMember' })
  @ApiResponse({ status: 200, description: 'Đã xóa thành viên' })
  @ApiResponse({ status: 403, description: 'Không phải chủ gia đình' })
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
  ) {
    return this.service.removeMember(user.sub, memberId);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /family/groups — Giải tán gia đình (Owner only)
  // ─────────────────────────────────────────────────────────

  @Delete('groups')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Owner] Giải tán gia đình',
    description:
      'Tất cả thành viên sẽ nhận notification + email.\n\n' +
      'Thành viên vẫn giữ gói dịch vụ cá nhân của mình.',
  })
  @ApiResponse({ status: 200, description: 'Đã giải tán gia đình' })
  dissolveGroup(@CurrentUser() user: JwtPayload) {
    return this.service.dissolveGroup(user.sub);
  }
}
