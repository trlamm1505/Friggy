/**
 * SingleAgentService — Lõi AI của Friggy (Cấp độ 1 — MVP)
 *
 * Đây là trái tim của toàn bộ hệ thống AI. Một AI duy nhất xử lý mọi yêu cầu
 * bằng cách kết hợp 2 kỹ thuật:
 *
 * 1. Function Calling (Gọi hàm):
 *    AI tự quyết định khi nào cần lấy dữ liệu thực tế (tủ lạnh, công thức, sở thích...)
 *    và gọi đúng tool phù hợp. Không hardcode logic — AI tự suy luận.
 *
 * 2. SSE Stream (Server-Sent Events):
 *    Thay vì chờ AI xử lý xong mới trả kết quả (có thể mất 10-30 giây),
 *    hệ thống stream từng chunk về FE ngay khi có — trải nghiệm mượt mà hơn nhiều.
 *
 * Luồng xử lý (Agentic Loop):
 *   [Kiểm tra quota]
 *     → [Lấy system prompt + LLM client]
 *     → [Gửi message cho AI]
 *     → [AI quyết định: gọi tool hay trả lời?]
 *         • Gọi tool → NestJS thực thi → feed kết quả lại cho AI → lặp lại
 *         • Trả lời → stream text về FE
 *     → [AI hoàn thành (finish_reason = stop)]
 *     → [Ghi nhận lượt dùng]
 *     → [Emit event 'done']
 *
 * Cấu trúc SSE events được emit:
 *   { event: 'tool_call',   data: 'get_fridge_items' }   — AI đang gọi tool nào
 *   { event: 'tool_result', data: '{...}' }               — Kết quả trả về từ tool
 *   { event: 'chunk',       data: 'Hôm nay bạn có...' }  — Đoạn text AI đang viết
 *   { event: 'done',        data: '{"tokensUsed":420}' }  — Hoàn thành
 *   { event: 'error',       data: 'Lỗi...' }              — Có lỗi xảy ra
 *
 * Giới hạn an toàn: Vòng lặp tối đa 10 lần để tránh AI bị kẹt vô hạn.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { AiProviderService } from './ai-provider.service';
import { PromptService } from './prompt.service';
import { RateLimitService, AiFeatureType } from './rate-limit.service';
import { FridgeTools } from './tools/fridge.tools';
import { UserTools } from './tools/user.tools';
import { RecipeTools } from './tools/recipe.tools';
import { MealPlanTools } from './tools/meal-plan.tools';
import { MealPlanGraphService } from './meal-plan-graph.service';
import { v4 as uuid } from 'uuid';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import {
  buildHardenedSystemPrompt,
  isResponseOffTopic,
} from './guards/prompt-sanitizer';

/**
 * Cấu trúc event được emit qua SSE stream
 * FE lắng nghe từng event để cập nhật UI theo thời gian thực
 */
export interface SseEvent {
  event: 'tool_call' | 'tool_result' | 'chunk' | 'done' | 'error';
  data: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Định nghĩa 16 Function Calling Tools — đăng ký với AI để nó biết gọi khi nào
//
// Mỗi tool cần có:
// - name: Tên hàm AI sẽ gọi (phải khớp với switch-case trong executeTool)
// - description: Mô tả BẰNG TIẾNG VIỆT để AI hiểu đúng mục đích
// - parameters: Schema JSON của tham số đầu vào
// ─────────────────────────────────────────────────────────────────────────────
const TOOLS: ChatCompletionTool[] = [
  // ── Nhóm công cụ Tủ lạnh ─────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_fridge_items',
      description:
        'Lấy danh sách nguyên liệu đang có trong tủ lạnh của người dùng',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description:
              'Vị trí lưu trữ: freezer (ngăn đông) | fridge (ngăn mát) | pantry (tủ khô). Bỏ trống để lấy tất cả.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_expiring_items',
      description:
        'Lấy danh sách nguyên liệu sắp hết hạn sử dụng trong N ngày tới',
      parameters: {
        type: 'object',
        properties: {
          withinDays: {
            type: 'number',
            description:
              'Số ngày muốn kiểm tra (ví dụ: 3 = lấy đồ hết hạn trong 3 ngày tới)',
          },
        },
        required: ['withinDays'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_ingredients',
      description:
        'Lấy danh sách tên nguyên liệu hiện đang có trong tủ lạnh (không kèm số lượng)',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_fridge_stats',
      description:
        'Lấy thống kê tổng quan về tủ lạnh: tổng số items, số đồ sắp hết hạn, tỷ lệ lãng phí',
      parameters: { type: 'object', properties: {} },
    },
  },

  // ── Nhóm công cụ Người dùng ──────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_user_preferences',
      description:
        'Lấy sở thích và mục tiêu nấu ăn của người dùng: ngân sách tuần, calo mục tiêu, phong cách ăn uống, trình độ nấu',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_allergies',
      description:
        'Lấy danh sách nguyên liệu/thực phẩm mà người dùng bị dị ứng',
      parameters: { type: 'object', properties: {} },
    },
  },

  // ── Nhóm công cụ Công thức ───────────────────────────────
  {
    type: 'function',
    function: {
      name: 'search_recipes',
      description:
        'Tìm kiếm công thức nấu ăn phù hợp với danh sách nguyên liệu và điều kiện',
      parameters: {
        type: 'object',
        properties: {
          ingredientNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Danh sách nguyên liệu muốn dùng để nấu',
          },
          mealType: {
            type: 'string',
            description:
              'Loại bữa ăn: breakfast (sáng) | lunch (trưa) | dinner (tối) | snack (phụ)',
          },
          maxCost: {
            type: 'number',
            description: 'Chi phí tối đa cho món ăn (đơn vị: VND)',
          },
        },
        required: ['ingredientNames'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recipe_detail',
      description:
        'Lấy thông tin chi tiết của 1 công thức: danh sách nguyên liệu đầy đủ và các bước thực hiện',
      parameters: {
        type: 'object',
        properties: {
          recipeId: { type: 'string', description: 'ID công thức' },
        },
        required: ['recipeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_recipe_cost',
      description: 'Tính chi phí ước tính của một công thức theo số khẩu phần',
      parameters: {
        type: 'object',
        properties: {
          recipeId: { type: 'string' },
          servings: { type: 'number', description: 'Số người ăn' },
        },
        required: ['recipeId', 'servings'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_match_score',
      description:
        'Tính điểm phù hợp (%) giữa nguyên liệu trong tủ và nguyên liệu cần thiết của công thức',
      parameters: {
        type: 'object',
        properties: {
          recipeId: {
            type: 'string',
            description: 'ID công thức cần kiểm tra',
          },
        },
        required: ['recipeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_from_expiring',
      description:
        'Gợi ý công thức ưu tiên sử dụng nguyên liệu sắp hết hạn trong tủ để tránh lãng phí',
      parameters: { type: 'object', properties: {} },
    },
  },

  // ── Nhóm công cụ Thực đơn tuần ──────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_weekly_plan',
      description: 'Lấy thực đơn tuần đã được lưu theo ngày bắt đầu tuần',
      parameters: {
        type: 'object',
        properties: {
          weekStartDate: {
            type: 'string',
            description: 'Ngày đầu tuần (Thứ 2) theo định dạng YYYY-MM-DD',
          },
        },
        required: ['weekStartDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_weekly_plan',
      description:
        'Lưu thực đơn tuần đã được lập vào database để người dùng xem lại',
      parameters: {
        type: 'object',
        properties: {
          weekStartDate: {
            type: 'string',
            description: 'Ngày đầu tuần YYYY-MM-DD',
          },
          totalBudget: {
            type: 'number',
            description: 'Tổng ngân sách tuần (VND)',
          },
          slots: {
            type: 'array',
            description: 'Danh sách các slot bữa ăn trong tuần',
            items: {
              type: 'object',
              properties: {
                dayOfWeek: {
                  type: 'number',
                  description: '1 = Thứ 2, 2 = Thứ 3, ..., 7 = Chủ nhật',
                },
                mealType: {
                  type: 'string',
                  description: 'breakfast | lunch | dinner | snack',
                },
                recipeId: {
                  type: 'string',
                  description: 'ID công thức được chọn',
                },
              },
              required: ['dayOfWeek', 'mealType', 'recipeId'],
            },
          },
        },
        required: ['weekStartDate', 'slots'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_plan_budget',
      description:
        'Kiểm tra xem tổng chi phí của thực đơn tuần có vượt quá ngân sách người dùng không',
      parameters: {
        type: 'object',
        properties: {
          slots: {
            type: 'array',
            items: { type: 'object' },
            description: 'Danh sách slot bữa ăn',
          },
          budget: { type: 'number', description: 'Ngân sách tối đa (VND)' },
        },
        required: ['slots', 'budget'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_allergy_conflict',
      description:
        'Kiểm tra thực đơn có chứa nguyên liệu gây dị ứng cho người dùng không',
      parameters: {
        type: 'object',
        properties: {
          slots: {
            type: 'array',
            items: { type: 'object' },
            description: 'Danh sách slot bữa ăn cần kiểm tra',
          },
          allergies: {
            type: 'array',
            items: { type: 'string' },
            description: 'Danh sách tên nguyên liệu gây dị ứng',
          },
        },
        required: ['slots', 'allergies'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_nutrition_summary',
      description: 'Ước tính tổng lượng calo từ danh sách nguyên liệu',
      parameters: {
        type: 'object',
        properties: {
          ingredientNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Danh sách tên nguyên liệu',
          },
        },
        required: ['ingredientNames'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_weekly_meal_plan',
      description:
        'Lập thực đơn tuần đầy đủ (7 ngày × 3 bữa) cho người dùng. Gọi tool này khi user yêu cầu lập thực đơn, kế hoạch ăn uống cả tuần.',
      parameters: {
        type: 'object',
        properties: {
          budget: {
            type: 'number',
            description:
              'Ngân sách thực phẩm cả tuần (VND). Mặc định 700000 nếu user không nêu rõ.',
          },
        },
        required: [],
      },
    },
  },
];

@Injectable()
export class SingleAgentService {
  private readonly logger = new Logger(SingleAgentService.name);

  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly promptService: PromptService,
    private readonly rateLimitService: RateLimitService,
    // Các tool service — AI sẽ gọi qua executeTool()
    private readonly fridgeTools: FridgeTools,
    private readonly userTools: UserTools,
    private readonly recipeTools: RecipeTools,
    private readonly mealPlanTools: MealPlanTools,
    private readonly mealPlanGraph: MealPlanGraphService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Public API — Điểm vào duy nhất từ bên ngoài
  // ─────────────────────────────────────────────────────────

  /**
   * Khởi chạy AI agent và trả về Observable<SseEvent> để stream về FE.
   *
   * Controller đăng ký lắng nghe Observable này và pipe từng event
   * thành SSE response (text/event-stream).
   *
   * @param params.userId       - ID người dùng đang chat
   * @param params.featureType  - Loại tính năng để kiểm tra quota
   * @param params.message      - Tin nhắn từ người dùng
   * @param params.history      - Lịch sử chat trước đó (tối đa N tin)
   * @param params.imageBase64  - Ảnh đính kèm (nếu người dùng gửi ảnh)
   */
  run(params: {
    userId: string;
    featureType: AiFeatureType;
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    imageBase64?: string;
  }): Observable<SseEvent> {
    // Dùng Subject để có thể emit event bất đồng bộ
    const subject = new Subject<SseEvent>();

    // Chạy async — lỗi không được throw lên trực tiếp mà emit qua subject
    this.execute(params, subject).catch((err) => {
      this.logger.error(
        `❌ Lỗi nghiêm trọng trong SingleAgent: ${err?.message ?? err}`,
      );
      subject.next({
        event: 'error',
        data: err?.message ?? 'Đã xảy ra lỗi trong quá trình xử lý AI',
      });
      subject.complete();
    });

    return subject.asObservable();
  }

  // ─────────────────────────────────────────────────────────
  // Vòng lặp agentic chính (Agentic Loop)
  // ─────────────────────────────────────────────────────────

  /**
   * Thực thi vòng lặp AI:
   * Gửi tin → AI quyết định gọi tool hay trả lời → feed kết quả tool → lặp lại → done
   */
  private async execute(
    params: {
      userId: string;
      featureType: AiFeatureType;
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      imageBase64?: string;
    },
    subject: Subject<SseEvent>,
  ): Promise<void> {
    const { userId, featureType, message, history = [], imageBase64 } = params;

    // ── Bước 1: Kiểm tra quota — throw nếu hết hạn mức ──
    await this.rateLimitService.checkLimit(userId, featureType);

    // ── Bước 2: Lấy LLM client và system prompt song song ──
    const [llmClient, basePrompt] = await Promise.all([
      this.aiProvider.getActiveClient(),
      this.promptService.getActivePrompt('supervisor'),
    ]);

    // Bọc system prompt với immutable header chống injection
    const systemPrompt = buildHardenedSystemPrompt(basePrompt);

    this.logger.log(
      `🚀 Bắt đầu xử lý AI: userId=${userId} | model=${llmClient.modelName} | tính năng=${featureType}`,
    );

    // ── Bước 3: Xây dựng danh sách message gửi lên AI ──
    const messages: ChatCompletionMessageParam[] = [
      // System prompt — định hình nhân cách và hành vi của AI
      { role: 'system', content: systemPrompt },
      // Lịch sử chat trước đó để AI có context
      ...history.map(
        (h) =>
          ({ role: h.role, content: h.content }) as ChatCompletionMessageParam,
      ),
    ];

    // Tin nhắn hiện tại của người dùng (có thể kèm ảnh)
    if (imageBase64) {
      // Người dùng gửi kèm ảnh — dùng vision mode
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    // ── Bước 4: Vòng lặp agentic (tối đa 10 lần để tránh infinite loop) ──
    let tokensUsed = 0;
    let remainingIterations = 10; // Giới hạn số vòng lặp
    let fullText = ''; // Tích lũy toàn bộ response để check off-topic

    while (remainingIterations-- > 0) {
      // Gửi message lên AI và chờ phản hồi
      const response = await llmClient.client.chat.completions.create({
        model: llmClient.modelName,
        messages,
        tools: TOOLS,
        tool_choice: 'auto', // AI tự quyết định gọi tool hay trả lời trực tiếp
        temperature: llmClient.temperature,
        max_tokens: llmClient.maxTokens,
      });

      const choice = response.choices[0];
      if (!choice) break; // Không có kết quả — thoát vòng lặp

      // Cộng dồn số token đã dùng (để ghi log và báo cáo)
      if (response.usage?.total_tokens) {
        tokensUsed += response.usage.total_tokens;
      }

      const assistantMessage = choice.message;

      // Thêm message của AI vào lịch sử để lần gọi tiếp theo có context
      messages.push(assistantMessage as ChatCompletionMessageParam);

      // Stream text content về FE ngay khi có (không chờ hết)
      if (assistantMessage.content) {
        subject.next({ event: 'chunk', data: assistantMessage.content });
        fullText += assistantMessage.content;
      }

      // Kiểm tra AI có gọi tool không
      const toolCalls = assistantMessage.tool_calls ?? [];

      // Không có tool call hoặc AI đã hoàn thành → thoát vòng lặp
      if (toolCalls.length === 0 || choice.finish_reason === 'stop') {
        this.logger.debug(
          `✅ AI hoàn thành sau ${10 - remainingIterations} vòng lặp`,
        );
        break;
      }

      // ── Bước 4a: Thực thi từng tool call mà AI yêu cầu ──
      for (const toolCall of toolCalls) {
        const tc = toolCall as any; // Workaround cho union type của OpenAI SDK
        const toolName = tc.function?.name as string;

        // Parse tham số đầu vào từ JSON string (AI gửi args dưới dạng JSON)
        let toolArgs: any = {};
        try {
          toolArgs = JSON.parse(tc.function?.arguments || '{}');
        } catch {
          toolArgs = {};
        }

        this.logger.log(
          `🔧 AI đang gọi tool: ${toolName} | args=${JSON.stringify(toolArgs)}`,
        );

        // Thông báo cho FE biết AI đang gọi tool nào
        subject.next({ event: 'tool_call', data: toolName });

        // Thực thi tool và lấy kết quả
        let toolResult: any;
        try {
          toolResult = await this.executeTool(toolName, toolArgs, userId);
        } catch (err: any) {
          // Tool thất bại — trả về thông báo lỗi để AI xử lý tiếp (không crash)
          toolResult = {
            error: err?.message ?? 'Không thể thực thi công cụ này',
          };
          this.logger.warn(`⚠️ Tool [${toolName}] thất bại: ${err?.message}`);
        }

        // Gửi kết quả tool về FE (rút gọn nếu quá dài)
        const resultStr = JSON.stringify(toolResult);
        subject.next({
          event: 'tool_result',
          data:
            resultStr.length > 500
              ? resultStr.substring(0, 500) + '... (đã rút gọn)'
              : resultStr,
        });

        // Feed kết quả tool lại cho AI để tiếp tục suy luận
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    // ── Bước 5: Ghi nhận lượt dùng sau khi hoàn thành ──
    await this.rateLimitService.recordUsage(userId, featureType, tokensUsed);

    this.logger.log(
      `🏁 AI xử lý hoàn tất: userId=${userId} | tổng token=${tokensUsed}`,
    );

    // ── Off-topic guard: log warning nếu AI bị jailbreak ──
    if (isResponseOffTopic(fullText)) {
      this.logger.warn(
        `⚠️ [PromptGuard] Off-topic response detected | userId=${userId} | preview: ${fullText.slice(0, 100)}`,
      );
    }

    // ── Bước 6: Thông báo hoàn thành cho FE ──
    subject.next({ event: 'done', data: JSON.stringify({ tokensUsed }) });
    subject.complete();
  }

  // ─────────────────────────────────────────────────────────
  // Điều phối tool call đến đúng service
  // ─────────────────────────────────────────────────────────

  /**
   * Nhận tên tool từ AI và dispatch đến service tương ứng.
   * Đây là "bảng điều phối" — mỗi case tương ứng với 1 trong 16 tools đã khai báo.
   *
   * @param name   - Tên tool AI muốn gọi (phải khớp với name trong TOOLS[])
   * @param args   - Tham số do AI truyền vào (đã được parse từ JSON)
   * @param userId - ID người dùng để lọc dữ liệu đúng tủ lạnh
   */
  private async executeTool(
    name: string,
    args: any,
    userId: string,
  ): Promise<any> {
    switch (name) {
      // ── Công cụ tủ lạnh ──────────────────────────────────
      case 'get_fridge_items':
        return this.fridgeTools.getFridgeItems(userId, args.location);

      case 'get_expiring_items':
        // Mặc định 3 ngày nếu AI không truyền withinDays
        return this.fridgeTools.getExpiringItems(userId, args.withinDays ?? 3);

      case 'get_available_ingredients':
        return this.fridgeTools.getAvailableIngredients(userId);

      case 'get_fridge_stats':
        return this.fridgeTools.getFridgeStats(userId);

      // ── Công cụ người dùng ───────────────────────────────
      case 'get_user_preferences':
        return this.userTools.getUserPreferences(userId);

      case 'get_user_allergies':
        return this.userTools.getUserAllergies(userId);

      // ── Công cụ công thức ────────────────────────────────
      case 'search_recipes':
        return this.recipeTools.searchRecipes(args);

      case 'get_recipe_detail':
        return this.recipeTools.getRecipeDetail(args.recipeId);

      case 'calculate_recipe_cost':
        // Mặc định 2 người ăn nếu AI không truyền servings
        return this.recipeTools.calculateRecipeCost(
          args.recipeId,
          args.servings ?? 2,
        );

      case 'calculate_match_score':
        return this.recipeTools.calculateMatchScore(args.recipeId, userId);

      case 'suggest_from_expiring':
        return this.recipeTools.suggestFromExpiring(userId);

      // ── Công cụ thực đơn tuần ────────────────────────────
      case 'get_weekly_plan':
        return this.mealPlanTools.getWeeklyPlan(userId, args.weekStartDate);

      case 'save_weekly_plan':
        // Merge userId vào args vì AI không biết userId của người dùng hiện tại
        return this.mealPlanTools.saveWeeklyPlan({ userId, ...args });

      case 'validate_plan_budget':
        return this.mealPlanTools.validatePlanBudget(args);

      case 'check_allergy_conflict':
        return this.mealPlanTools.checkAllergyConflict(args);

      case 'get_nutrition_summary':
        return this.mealPlanTools.getNutritionSummary(
          args.ingredientNames ?? [],
        );

      // ── Tool tạo thực đơn tuần (AI Chat) ──────────────────────────────────
      case 'generate_weekly_meal_plan': {
        const budget = Number(args.budget ?? 700_000);
        // Tuần tiếp theo (Thứ 2)
        const today = new Date();
        const daysUntilMonday = today.getDay() === 0 ? 1 : 8 - today.getDay();
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + daysUntilMonday);
        const weekStartDate = nextMonday.toISOString().split('T')[0];

        this.logger.log(
          `🍽️ [SingleAgent] Tạo thực đơn tuần: userId=${userId} | ngân sách=${budget} | tuần=${weekStartDate}`,
        );

        const result = await this.mealPlanGraph.run({
          jobId: uuid(),
          userId,
          weekStartDate,
          budget,
        });

        return {
          success: true,
          weekStartDate,
          summary: `Đã lập thực đơn tuần từ ${weekStartDate} với ngân sách ${budget.toLocaleString('vi-VN')}đ`,
          totalEstimatedCost: result.totalEstimatedCost,
          planSummary: result.summary,
          slots: result.slots?.slice(0, 6).map((s: any) => ({
            date: s.date,
            mealType: s.mealType,
            recipeName: s.recipeName,
            estimatedCost: s.estimatedCost,
          })),
        };
      }

      // ── Tool không xác định ──────────────────────────────────────────
      default:
        throw new Error(`Không tìm thấy tool: ${name}`);
    }
  }
}
