class UserProfileModel {
  final String? displayName;
  final String? avatarUrl;
  final String? dateOfBirth;
  final String? gender;
  final String? bio;

  UserProfileModel({
    this.displayName,
    this.avatarUrl,
    this.dateOfBirth,
    this.gender,
    this.bio,
  });

  factory UserProfileModel.fromJson(Map<String, dynamic> json) {
    return UserProfileModel(
      displayName: json['displayName'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      dateOfBirth: json['dateOfBirth'] as String?,
      gender: json['gender'] as String?,
      bio: json['bio'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (displayName != null) 'displayName': displayName,
      if (avatarUrl != null) 'avatarUrl': avatarUrl,
      if (dateOfBirth != null) 'dateOfBirth': dateOfBirth,
      if (gender != null) 'gender': gender,
      if (bio != null) 'bio': bio,
    };
  }
}

class UserPreferenceModel {
  final int? weeklyBudget;
  final int? dailyCalorieTarget;
  final String? dietaryStyle; // omnivore, vegetarian, vegan, keto, halal
  final bool preferSimpleRecipes;
  final int? maxCookTimeMinutes;
  final String skillLevel; // beginner, intermediate, advanced
  final int householdSize;
  final String aiPersonalityMode; // friendly, professional, coach
  final String? primaryGoal; // save_money, reduce_waste, eat_healthy, convenience
  final String? cookingFrequency; // daily, few_times_week, weekends, rarely
  final int? height;
  final int? weight;
  final String? activityLevel; // sedentary, light, moderate, active

  UserPreferenceModel({
    this.weeklyBudget,
    this.dailyCalorieTarget,
    this.dietaryStyle,
    this.preferSimpleRecipes = false,
    this.maxCookTimeMinutes,
    this.skillLevel = 'beginner',
    this.householdSize = 1,
    this.aiPersonalityMode = 'friendly',
    this.primaryGoal,
    this.cookingFrequency,
    this.height,
    this.weight,
    this.activityLevel,
  });

  factory UserPreferenceModel.fromJson(Map<String, dynamic> json) {
    return UserPreferenceModel(
      weeklyBudget: json['weeklyBudget'] as int?,
      dailyCalorieTarget: json['dailyCalorieTarget'] as int?,
      dietaryStyle: json['dietaryStyle'] as String?,
      preferSimpleRecipes: json['preferSimpleRecipes'] as bool? ?? false,
      maxCookTimeMinutes: json['maxCookTimeMinutes'] as int?,
      skillLevel: json['skillLevel'] as String? ?? 'beginner',
      householdSize: json['householdSize'] as int? ?? 1,
      aiPersonalityMode: json['aiPersonalityMode'] as String? ?? 'friendly',
      primaryGoal: json['primaryGoal'] as String?,
      cookingFrequency: json['cookingFrequency'] as String?,
      height: json['height'] as int?,
      weight: json['weight'] as int?,
      activityLevel: json['activityLevel'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (weeklyBudget != null) 'weeklyBudget': weeklyBudget,
      if (dailyCalorieTarget != null) 'dailyCalorieTarget': dailyCalorieTarget,
      if (dietaryStyle != null) 'dietaryStyle': dietaryStyle,
      'preferSimpleRecipes': preferSimpleRecipes,
      if (maxCookTimeMinutes != null) 'maxCookTimeMinutes': maxCookTimeMinutes,
      'skillLevel': skillLevel,
      'householdSize': householdSize,
      'aiPersonalityMode': aiPersonalityMode,
      if (primaryGoal != null) 'primaryGoal': primaryGoal,
      if (cookingFrequency != null) 'cookingFrequency': cookingFrequency,
      if (height != null) 'height': height,
      if (weight != null) 'weight': weight,
      if (activityLevel != null) 'activityLevel': activityLevel,
    };
  }
}

class AllergyModel {
  final String id;
  final int ingredientId;
  final String ingredientName;
  final String? note;

  AllergyModel({
    required this.id,
    required this.ingredientId,
    required this.ingredientName,
    this.note,
  });

  factory AllergyModel.fromJson(Map<String, dynamic> json) {
    return AllergyModel(
      id: json['id'] as String,
      ingredientId: json['ingredientId'] as int,
      ingredientName: json['ingredientName'] as String? ?? 'Nguyên liệu #${json['ingredientId']}',
      note: json['note'] as String?,
    );
  }
}

class MeModel {
  final String id;
  final String? name;
  final String? phone;
  final String? googleEmail;
  final String status;
  final String role;
  final bool isOnboardingCompleted;
  final UserProfileModel? profile;
  final UserPreferenceModel? preferences;

  MeModel({
    required this.id,
    this.name,
    this.phone,
    this.googleEmail,
    required this.status,
    required this.role,
    this.isOnboardingCompleted = false,
    this.profile,
    this.preferences,
  });

  factory MeModel.fromJson(Map<String, dynamic> json) {
    return MeModel(
      id: json['id'] as String,
      name: json['name'] as String?,
      phone: json['phone'] as String?,
      googleEmail: json['googleEmail'] as String?,
      status: json['status'] as String? ?? 'active',
      role: json['role'] as String? ?? 'user',
      isOnboardingCompleted: json['isOnboardingCompleted'] as bool? ?? false,
      profile: json['profile'] != null ? UserProfileModel.fromJson(json['profile']) : null,
      preferences: json['preferences'] != null ? UserPreferenceModel.fromJson(json['preferences']) : null,
    );
  }
}

class AiUsageModel {
  final int used;
  final int limit;
  final int remaining;
  final String plan;

  AiUsageModel({
    required this.used,
    required this.limit,
    required this.remaining,
    required this.plan,
  });

  factory AiUsageModel.fromJson(Map<String, dynamic> json) {
    return AiUsageModel(
      used: json['used'] as int? ?? 0,
      limit: json['limit'] as int? ?? 10,
      remaining: json['remaining'] as int? ?? 10,
      plan: json['plan'] as String? ?? 'free',
    );
  }
}

class NotificationSettingsModel {
  final bool pushNotifications;
  final bool expiryAlert;
  final bool shoppingReminder;

  NotificationSettingsModel({
    this.pushNotifications = true,
    this.expiryAlert = true,
    this.shoppingReminder = false,
  });

  factory NotificationSettingsModel.fromJson(Map<String, dynamic> json) {
    return NotificationSettingsModel(
      pushNotifications: json['pushNotifications'] as bool? ?? true,
      expiryAlert: json['expiryAlert'] as bool? ?? true,
      shoppingReminder: json['shoppingReminder'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'pushNotifications': pushNotifications,
      'expiryAlert': expiryAlert,
      'shoppingReminder': shoppingReminder,
    };
  }
}

class SubscriptionPlanModel {
  final int id;
  final String name;
  final String displayName;
  final int priceVnd;
  final String billingCycle;
  final List<String> features;
  final int aiUsagePerWeek;
  final bool isActive;

  SubscriptionPlanModel({
    required this.id,
    required this.name,
    required this.displayName,
    required this.priceVnd,
    required this.billingCycle,
    required this.features,
    required this.aiUsagePerWeek,
    this.isActive = true,
  });

  factory SubscriptionPlanModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionPlanModel(
      id: json['id'] as int,
      name: json['name'] as String? ?? 'free',
      displayName: json['displayName'] as String? ?? 'Gói Miễn Phí',
      priceVnd: json['priceVnd'] as int? ?? 0,
      billingCycle: json['billingCycle'] as String? ?? 'forever',
      features: json['features'] is List
          ? (json['features'] as List).map((e) => e.toString()).toList()
          : [],
      aiUsagePerWeek: json['aiUsagePerWeek'] as int? ?? 2,
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

class UserSubscriptionModel {
  final String id;
  final String status;
  final String startDate;
  final String? endDate;
  final String? paymentRef;
  final bool autoRenew;
  final String? cancelledAt;
  final SubscriptionPlanModel plan;
  final String createdAt;

  UserSubscriptionModel({
    required this.id,
    required this.status,
    required this.startDate,
    this.endDate,
    this.paymentRef,
    this.autoRenew = true,
    this.cancelledAt,
    required this.plan,
    required this.createdAt,
  });

  factory UserSubscriptionModel.fromJson(Map<String, dynamic> json) {
    return UserSubscriptionModel(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'active',
      startDate: json['startDate'] as String? ?? '',
      endDate: json['endDate'] as String?,
      paymentRef: json['paymentRef'] as String?,
      autoRenew: json['autoRenew'] as bool? ?? true,
      cancelledAt: json['cancelledAt'] as String?,
      plan: SubscriptionPlanModel.fromJson(json['plan'] as Map<String, dynamic>),
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class SubscribeResponseModel {
  final String qrCodeUrl;
  final String paymentRef;
  final int amount;
  final String expireAt;
  final String status;

  SubscribeResponseModel({
    required this.qrCodeUrl,
    required this.paymentRef,
    required this.amount,
    required this.expireAt,
    required this.status,
  });

  factory SubscribeResponseModel.fromJson(Map<String, dynamic> json) {
    return SubscribeResponseModel(
      qrCodeUrl: json['qrCodeUrl'] as String? ?? '',
      paymentRef: json['paymentRef'] as String? ?? '',
      amount: json['amount'] as int? ?? 0,
      expireAt: json['expireAt'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
    );
  }
}

class NotificationModel {
  final String id;
  final String type;
  final String title;
  final String body;
  final bool isRead;
  final String? readAt;
  final dynamic metadata;
  final String createdAt;

  NotificationModel({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.isRead,
    this.readAt,
    this.metadata,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] as String,
      type: json['type'] as String? ?? 'system',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      isRead: json['isRead'] as bool? ?? false,
      readAt: json['readAt'] as String?,
      metadata: json['metadata'],
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}
