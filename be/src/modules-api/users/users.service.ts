import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import type {
  UpdateProfileDto,
  UpdatePreferencesDto,
  OnboardingDto,
  AddAllergyDto,
} from './dto/users.dto';
import type {
  MeResponseDto,
  UserPreferenceResponseDto,
  AiUsageResponseDto,
  AllergyResponseDto,
} from './dto/users-response.dto';

const AI_WEEKLY_LIMIT_FREE = 10;
const AI_WEEKLY_LIMIT_PAID = 999;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // GET /me
  // ─────────────────────────────────────────────────────────

  async getMe(userId: string): Promise<MeResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        role: true,
        profile: true,
        preferences: true,
      },
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    return this.mapUserToMeResponse(user);
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /me/profile
  // ─────────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<MeResponseDto> {
    // Cập nhật name trên bảng users
    if (dto.name !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: dto.name },
      });
    }

    // Upsert UserProfile (displayName, dateOfBirth, gender, bio)
    const profileData: any = {};
    if (dto.name !== undefined) profileData.displayName = dto.name;
    if (dto.dateOfBirth !== undefined) profileData.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.gender !== undefined) profileData.gender = dto.gender;
    if (dto.bio !== undefined) profileData.bio = dto.bio;

    if (Object.keys(profileData).length > 0) {
      const existingProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        await this.prisma.userProfile.update({
          where: { userId },
          data: profileData,
        });
      } else {
        await this.prisma.userProfile.create({
          data: {
            id: uuid(),
            userId,
            displayName: dto.name ?? 'Người dùng mới',
            ...profileData,
          },
        });
      }
    }

    return this.getMe(userId);
  }

  // ─────────────────────────────────────────────────────────
  // GET /me/preferences
  // ─────────────────────────────────────────────────────────

  async getPreferences(userId: string): Promise<UserPreferenceResponseDto | null> {
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId },
    });
    if (!pref) return null;
    return this.mapPreferences(pref);
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /me/preferences
  // ─────────────────────────────────────────────────────────

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<UserPreferenceResponseDto> {
    const existing = await this.prisma.userPreference.findUnique({ where: { userId } });

    const data: any = { ...dto };

    let pref;
    if (existing) {
      pref = await this.prisma.userPreference.update({ where: { userId }, data });
    } else {
      pref = await this.prisma.userPreference.create({
        data: { id: uuid(), userId, ...data },
      });
    }

    return this.mapPreferences(pref);
  }

  // ─────────────────────────────────────────────────────────
  // POST /me/onboarding
  // ─────────────────────────────────────────────────────────

  async completeOnboarding(userId: string, dto: OnboardingDto): Promise<MeResponseDto> {
    const existing = await this.prisma.userPreference.findUnique({ where: { userId } });

    const prefData: any = {
      primaryGoal: dto.primaryGoal,
      cookingFrequency: dto.cookingFrequency,
    };
    if (dto.dietaryStyle !== undefined) prefData.dietaryStyle = dto.dietaryStyle;
    if (dto.height !== undefined) prefData.height = dto.height;
    if (dto.weight !== undefined) prefData.weight = dto.weight;
    if (dto.activityLevel !== undefined) prefData.activityLevel = dto.activityLevel;
    if (dto.householdSize !== undefined) prefData.householdSize = dto.householdSize;

    if (existing) {
      await this.prisma.userPreference.update({ where: { userId }, data: prefData });
    } else {
      await this.prisma.userPreference.create({
        data: { id: uuid(), userId, ...prefData },
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnboardingCompleted: true },
    });

    return this.getMe(userId);
  }

  // ─────────────────────────────────────────────────────────
  // GET /me/allergies
  // ─────────────────────────────────────────────────────────

  async getAllergies(userId: string): Promise<AllergyResponseDto[]> {
    const allergies = await this.prisma.userAllergy.findMany({
      where: { userId, deletedAt: null },
      include: { ingredient: true },
      orderBy: { createdAt: 'asc' },
    });

    return allergies.map((a) => ({
      id: String(a.id),
      ingredientId: a.ingredientId,
      ingredientName: a.ingredient.name,
      note: a.note ?? null,
    }));
  }

  // ─────────────────────────────────────────────────────────
  // POST /me/allergies
  // ─────────────────────────────────────────────────────────

  async addAllergy(userId: string, dto: AddAllergyDto): Promise<AllergyResponseDto> {
    // Kiểm tra nguyên liệu tồn tại
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: dto.ingredientId },
    });
    if (!ingredient) throw new NotFoundException('Nguyên liệu không tồn tại');

    // Kiểm tra đã dị ứng chưa
    const existing = await this.prisma.userAllergy.findFirst({
      where: { userId, ingredientId: dto.ingredientId, deletedAt: null },
    });
    if (existing) throw new BadRequestException('Nguyên liệu này đã có trong danh sách dị ứng');

    const allergy = await this.prisma.userAllergy.create({
      data: {
        userId,
        ingredientId: dto.ingredientId,
        severityLevel: 'mild', // default — user có thể cập nhật sau
        note: dto.note ?? null,
      },
      include: { ingredient: true },
    });

    return {
      id: String(allergy.id),
      ingredientId: allergy.ingredientId,
      ingredientName: allergy.ingredient.name,
      note: allergy.note ?? null,
    };
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /me/allergies/:id
  // ─────────────────────────────────────────────────────────

  async removeAllergy(userId: string, allergyId: string): Promise<void> {
    const allergy = await this.prisma.userAllergy.findFirst({
      where: { id: Number(allergyId), userId, deletedAt: null },
    });
    if (!allergy) throw new NotFoundException('Không tìm thấy mục dị ứng');

    await this.prisma.userAllergy.update({
      where: { id: Number(allergyId) },
      data: { deletedAt: new Date() },
    });
  }

  // ─────────────────────────────────────────────────────────
  // GET /me/ai-usage
  // ─────────────────────────────────────────────────────────

  async getAiUsage(userId: string): Promise<AiUsageResponseDto> {
    // Tính đầu tuần hiện tại (Thứ 2 00:00:00) — đồng bộ với AiUsageLimitGuard
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=CN, 1=T2, ..., 6=T7
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const [subscription, usageByFeature] = await Promise.all([
      this.prisma.userSubscription.findFirst({
        where: { userId, status: 'active', deletedAt: null },
        include: { plan: { select: { name: true, aiUsagePerWeek: true } } },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['featureType'],
        where: { userId, usedAt: { gte: startOfWeek } },
        _count: { featureType: true },
      }),
    ]);

    const planName = subscription?.plan?.name ?? 'free';
    // Lấy từ DB — mặc định 2 nếu không có subscription (đồng bộ với guard)
    const limit = subscription?.plan?.aiUsagePerWeek ?? 2;
    const isUnlimited = limit === -1;

    // Tổng usage mọi feature trong 7 ngày
    const totalUsed = usageByFeature.reduce((sum, g) => sum + g._count.featureType, 0);

    // Chi tiết từng feature
    const breakdown: Record<string, number> = {};
    for (const g of usageByFeature) {
      breakdown[g.featureType] = g._count.featureType;
    }

    return {
      used: totalUsed,
      limit: isUnlimited ? -1 : limit,
      remaining: isUnlimited ? -1 : Math.max(0, limit - totalUsed),
      plan: planName,
      breakdown,        // { meal_plan: 1, chat: 3, slot_regenerate: 0, ... }
      windowDays: 7,    // Tuần lịch T2-CN, reset mỗi Thứ 2
    };
  }

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────

  private mapUserToMeResponse(user: any): MeResponseDto {
    return {
      id: user.id,
      name: user.name ?? null,
      phone: user.phone ?? null,
      googleEmail: user.googleEmail ?? null,
      status: user.status,
      role: user.role.name,
      isOnboardingCompleted: user.isOnboardingCompleted,
      profile: user.profile
        ? {
            displayName: user.profile.displayName,
            avatarUrl: user.profile.avatarPath ?? null,
            dateOfBirth: user.profile.dateOfBirth
              ? user.profile.dateOfBirth.toISOString().split('T')[0]
              : null,
            gender: user.profile.gender ?? null,
            bio: user.profile.bio ?? null,
          }
        : null,
      preferences: user.preferences ? this.mapPreferences(user.preferences) : null,
    };
  }

  private mapPreferences(pref: any): UserPreferenceResponseDto {
    return {
      weeklyBudget: pref.weeklyBudget ?? null,
      dailyCalorieTarget: pref.dailyCalorieTarget ?? null,
      dietaryStyle: pref.dietaryStyle ?? null,
      preferSimpleRecipes: pref.preferSimpleRecipes,
      maxCookTimeMinutes: pref.maxCookTimeMinutes ?? null,
      skillLevel: pref.skillLevel,
      householdSize: pref.householdSize,
      aiPersonalityMode: pref.aiPersonalityMode,
      primaryGoal: pref.primaryGoal ?? null,
      cookingFrequency: pref.cookingFrequency ?? null,
      height: pref.height ?? null,
      weight: pref.weight ?? null,
      activityLevel: pref.activityLevel ?? null,
    };
  }
}
