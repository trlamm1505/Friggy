/**
 * AdminStatsService — Dashboard Stats
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────
  // GET /admin/stats/overview
  // ─────────────────────────────────────────────────────────
  async getOverview() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      // ── Users ──────────────────────────────────────────
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsersThisMonth,
      activeUserSubscriptions,
      userRevenueThisMonth,
      userTotalRevenue,
      // ── Suppliers ──────────────────────────────────────
      totalSuppliers,
      verifiedSuppliers,
      activeSupplierSubscriptions,
      pendingApplications,
      supplierRevenueThisMonth,
      supplierTotalRevenue,
      pendingIngredients,
    ] = await Promise.all([
      // Users
      this.prisma.user.count({ where: { deletedAt: null, supplierProfile: null } }),
      this.prisma.user.count({ where: { deletedAt: null, status: 'active', supplierProfile: null } }),
      this.prisma.user.count({ where: { deletedAt: null, status: 'suspended', supplierProfile: null } }),
      this.prisma.user.count({ where: { deletedAt: null, createdAt: { gte: monthStart }, supplierProfile: null } }),
      this.prisma.userSubscription.count({
        where: {
          status: 'active',
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: { status: 'paid', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true },
      }),

      // Suppliers
      this.prisma.supplierProfile.count({ where: { deletedAt: null } }),
      this.prisma.supplierProfile.count({ where: { deletedAt: null, isVerified: true } }),
      this.prisma.supplierSubscription.count({
        where: { status: 'active', endDate: { gte: now } },
      }),
      this.prisma.supplierApplication.count({ where: { status: 'pending' } }),
      this.prisma.supplierPaymentTransaction.aggregate({
        where: { status: 'paid', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.supplierPaymentTransaction.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true },
      }),
      this.prisma.supplierIngredient.count({ where: { status: 'pending', deletedAt: null } }),
    ]);

    return {
      users: {
        total:            totalUsers,
        active:           activeUsers,
        suspended:        suspendedUsers,
        newThisMonth:     newUsersThisMonth,
        activeSubscriptions: activeUserSubscriptions,
        revenueThisMonthVnd: userRevenueThisMonth._sum.amount ?? 0,
        totalRevenueVnd:     userTotalRevenue._sum.amount ?? 0,
      },
      suppliers: {
        total:                totalSuppliers,
        verified:             verifiedSuppliers,
        activeSubscriptions:  activeSupplierSubscriptions,
        pendingApplications,
        pendingIngredients,
        revenueThisMonthVnd:  supplierRevenueThisMonth._sum.amount ?? 0,
        totalRevenueVnd:      supplierTotalRevenue._sum.amount ?? 0,
      },
      combined: {
        revenueThisMonthVnd: (userRevenueThisMonth._sum.amount ?? 0) + (supplierRevenueThisMonth._sum.amount ?? 0),
        totalRevenueVnd:     (userTotalRevenue._sum.amount ?? 0) + (supplierTotalRevenue._sum.amount ?? 0),
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // GET /admin/stats/ai-usage?days=7
  // ─────────────────────────────────────────────────────────
  async getAiUsage(days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.prisma.aiUsageLog.groupBy({
      by: ['featureType'],
      where: { usedAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const totalCalls = logs.reduce((sum, l) => sum + l._count.id, 0);

    return {
      period: `${days} ngày gần nhất`,
      totalCalls,
      breakdown: logs.map((l) => ({
        featureType: l.featureType,
        count: l._count.id,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────
  // GET /admin/stats/subscriptions
  // ─────────────────────────────────────────────────────────
  async getSubscriptionBreakdown() {
    const now = new Date();

    const [
      userBreakdown,
      userPlans,
      supplierBreakdown,
      supplierPlans,
    ] = await Promise.all([
      // Phân bố gói user
      this.prisma.userSubscription.groupBy({
        by: ['planId'],
        where: { status: 'active' },
        _count: { id: true },
      }),
      this.prisma.subscriptionPlan.findMany({
        select: { id: true, name: true, displayName: true },
      }),
      // Phân bố gói supplier
      this.prisma.supplierSubscription.groupBy({
        by: ['planId'],
        where: { status: 'active', endDate: { gte: now } },
        _count: { id: true },
      }),
      this.prisma.supplierPlan.findMany({
        select: { id: true, name: true },
      }),
    ]);

    const userPlanMap     = new Map(userPlans.map((p) => [p.id, p]));
    const supplierPlanMap = new Map(supplierPlans.map((p) => [p.id, p]));

    return {
      users: userBreakdown.map((b) => ({
        plan:              userPlanMap.get(b.planId) ?? { id: b.planId, name: 'Unknown' },
        activeSubscribers: b._count.id,
      })),
      suppliers: supplierBreakdown.map((b) => ({
        plan:              supplierPlanMap.get(b.planId) ?? { id: b.planId, name: 'Unknown' },
        activeSubscribers: b._count.id,
      })),
    };
  }
}
