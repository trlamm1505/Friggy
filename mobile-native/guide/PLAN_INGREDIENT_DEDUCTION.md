# Kế hoạch: Fix / Cải thiện logic trừ nguyên liệu theo công thức (RN + BE)

> **Trạng thái**: Phase 0 ✅ · Phase 1 ✅ · Phase 2-9 ⏳ (chưa làm)
> Cập nhật: 2026-11-11

> Phạm vi: mọi thao tác **trừ nguyên liệu khỏi tủ lạnh dựa trên công thức đã nấu**.
> Hiện tại toàn bộ quyết định "trừ bao nhiêu / trừ món nào / theo thứ tự nào" nằm ở **BE**
> (`meal-planning.service.ts` → `consumeIngredientsForSlot`). RN chỉ gọi API và hiển thị kết quả.
> => Kế hoạch này chia 2 nhánh: **sửa contract BE** và **sửa/xây lại phía RN**.

---

## 0. Bản đồ hiện trạng (để các bước sau không phải đọc lại code)

```
RN: RecipeDetailScreen.jsx  ──┐
                             ├──> PATCH /meal-planning/slots/{slotId} { completed: true }
RN: CookingSuggestionsSection ┘
                                     │
                                     ▼
        BE meal-planning.service.ts -> updateSlot()
            ├─ set slot.completedAt = now
            ├─ IDEMPOTENT GUARD: chỉ lần đầu (slot.completedAt === null) mới trừ
            ├─ consumeIngredientsForSlot()   [transaction]
            │     ├─ scale = slot.servings / recipe.servings
            │     ├─ normalizeToBaseUnit()    -> g / ml / unit đếm
            │     ├─ lấy FridgeItem FIFO (expiresAt asc, createdAt asc)
            │     ├─ trừ dần: hết -> consumedAt + quantity=0 | dư -> giảm quantity
            │     ├─ bỎ QUA nếu base unit không tương thích (canCompare)
            │     └─ thiếu -> chỉ logger.warn, KHÔNG chặn
            ├─ emit socket 'meal:slot_completed' (chỉ family)
            └─ trả { id, completedAt, consumedIngredients[] }
                                     │
                                     ▼
        RN: RealRecipeService.updateSlot() -> map consumedIngredients
        RN: toast "Đã trừ N nguyên liệu" -> navigate back
```

---

## 1. Danh sách vấn đề đã xác nhận (kèm hạng mức)

| # | Vấn đề | Mức | Nơi |
|---|--------|-----|-----|
| V1 | RN **không gửi `servings`** đã chỉnh ở Stepper -> BE trừ theo `slot.servings` cũ -> trừ **sai lượng** | **P0** | `RecipeDetailScreen.jsx:110,632,358` |
| V2 | RN **không subscribe** `meal:slot_completed` (và cả `fridge:*`) -> tủ lạnh thành viên family khác không cập nhật. `socket.io-client` chưa có trong `package.json` | **P0** | `mobile-native/package.json` |
| V3 | `consumedIngredients` trả **lượng công thức** (`scaledQty`) chứ không phải lượng **thực sự bị trừ** -> toast "đã trừ 5 món" dù tủ chỉ còn 2 | **P1** | `meal-planning.service.ts:1248-1257` |
| V4 | Thiếu nguyên liệu vẫn cho tick "đã nấu", không cảnh báo user trước | **P1** | `meal-planning.service.ts:1258-1264` |
| V5 | Không có **undo** khi tick nhầm: bỏ tick (`completed:false`) **không hoàn lại** nguyên liệu | **P1** | `meal-planning.service.ts:305-311` |
| V6 | `PATCH /fridge/items/:id/consume` chỉ lọc theo `userId` -> **không dùng được với tủ lạnh chung của family** (khác hàm `updateItem`/`removeItem` cùng file) | **P1** | `fridge.service.ts:318-322` |
| V7 | Sau khi nấu, cache tủ lạnh ở RN **không được invalidate** -> mở màn tủ lạnh vẫn thấy số lượng cũ | **P1** | `useServiceHooks.js:64`, `RecipeDetailScreen.jsx:104` |
| V8 | Offline queue `SLOT_COMPLETE` **không lưu `servings`** -> khi sync lại có thể khác lượng đã hiển thị | **P2** | `MutationHandlers.js:219-225`, `SyncEngine.js:292-297` |
| V9 | Mock service **không trừ thật** vào tủ lạnh mock, không mô phỏng thiếu -> UI mock lệch hành vi thật | **P2** | `MockRecipeService.js:499-507` |
| V10 | `canCompare` quá cứng: công thức cần `200g` mà tủ chỉ có `2 miếng` -> **không trừ được**, coi như thiếu | **P2** | `unit.util.ts:138-142` |
| V11 | BE thiếu **response DTO chính thức** cho `consumedIngredients` (đang trả object ad-hoc) -> dễ lệch contract | **P2** | `meal-planning-response.dto.ts` |

---

## 2. Phase 0 — Chốt contract BE ↔ RN (BLOCKER cho mọi phase sau)

> Không làm phase này thì các phase sau sẽ phải sửa lại 2 lần.

### T0.1 — BE: mở rộng payload `PATCH /meal-planning/slots/:id`

**File:** `be/src/modules-api/meal-planning/meal-planning.service.ts` (vùng `consumeIngredientsForSlot`, ~L1248)

Đổi `consumedIngredients` từ `{ name, quantity, unit }` → `{ ingredientId, name, requiredQuantity, requiredUnit, deductedQuantity, deductedUnit, shortage, isOptional }`

- `requiredQuantity` = lượng công thức đã scale (giữ nguyên semantics hiện tại để không phá client cũ)
- `deductedQuantity` = lượng **thực sự bị trừ** (đã quy đổi về base unit) — đây là con số user cần biết
- `shortage` = `required - deducted` (>= 0)
- `isOptional` = cờ `isOptional` của `recipe_ingredients`

Thêm field mới ở response gốc:

```ts
missingIngredients: Array<{ ingredientId, name, shortage, unit, isOptional }>
```

**File:** `be/src/modules-api/meal-planning/dto/meal-planning-response.dto.ts`
- Thêm `ConsumedIngredientDto` + `MissingIngredientDto`
- Thêm `consumedIngredients` / `missingIngredients` vào DTO của `PATCH /slots/:id`
  (hiện endpoint này trả raw object, cần xem lại `meal-planning.controller.ts` xem có dùng DTO không)

**File:** `be/src/modules-api/meal-planning/meal-planning.service.ts` (vùng `updateSlot`)
- Trả thêm `missingIngredients` ra ngoài cùng `consumedIngredients`
- **Không** để `missingIngredients` làm fail request — vẫn trả 200 như hiện tại

### T0.2 — RN: chốt shape mapping

**File:** `mobile-native/src/data/services/real/RealRecipeService.js` (hàm `updateSlot` ~L621)

Map thêm field mới, giữ nguyên `consumedIngredients` cũ để không phá UI hiện tại:

```js
return {
  id: result?.id ?? slotId,
  completedAt: result?.completedAt ?? null,
  consumedIngredients: [...],   // giữ shape cũ (name/quantity/unit) + field mới
  missingIngredients: Array.isArray(result?.missingIngredients)
    ? result.missingIngredients
    : [],
};
```

### T0.3 — Khóa contract bằng test

**File:** `mobile-native/src/data/api/__tests__/MockServicesContract.test.js`

Thêm case: `MockRecipeService.updateSlot()` và `RealRecipeService.updateSlot()` phải trả **cùng key set** (`id`, `completedAt`, `consumedIngredients`, `missingIngredients`).

**File:** `mobile-native/src/data/services/mock/MockRecipeService.js`
- Tạm thời trả `missingIngredients: []` để không fail test contract trước khi làm V9 (T7.1).

### T0.4 — Kiểm tra BE không vỡ client cũ

`consumedIngredients` giữ nguyên 3 field cũ (`name`, `quantity`, `unit`) và **thêm** field mới -> backward compatible với RN cũ & Flutter (`Mobile/`).

---

## 3. Phase 1 — P0: Sửa lượng trừ sai (servings)

> Đây là bug gây mất thực phẩm trong tủ lạnh — ưu tiên cao nhất.

### T1.1 — RN: gửi `servings` khi tick "đã nấu"

**File:** `mobile-native/src/presentation/screens/recipe/RecipeDetailScreen.jsx` (~L347-374)

```js
const result = await services.recipeService.updateSlot(slotId, {
  completed: true,
  servings,                    // ← THÊM: khẩu phần user vừa chọn ở Stepper
});
```

- `servings` đã có sẵn trong state (L110), Stepper ở L632.
- Chỉ gửi khi `servings` khác `recipe.servings`? **Không** — luôn gửi để BE có nguồn chuẩn duy nhất.

### T1.2 — RN: `CookingSuggestionsSection` không có Stepper

**File:** `mobile-native/src/presentation/components/home/CookingSuggestionsSection.jsx` (~L84-101)

- Không gửi `servings` -> BE dùng `slot.servings` (đúng, vì user không chỉnh được ở màn này).
- **Không đổi gì.** Chỉ cần comment giải thích để người sau không "fix nhầm".

### T1.3 — RN offline: lưu `servings` vào outbox

**File:** `mobile-native/src/data/offline/MutationHandlers.js` (hàm `updateSlot` ~L219)

```js
payload: (args) => {
  const payload = args[1] ?? {};
  return {
    slotId: args[0] ?? null,
    completed: payload.completed,
    servings: payload.servings,      // ← THÊM
  };
},
```

**File:** `mobile-native/src/data/offline/SyncEngine.js` (~L292-297)

```js
case OP_TYPES.SLOT_COMPLETE: {
  const recipe = realService('recipeService');
  if (!recipe) throw new Error('recipeService chưa sẵn sàng');
  await recipe.updateSlot(payload.slotId, {
    completed: payload.completed,
    servings: payload.servings,      // ← THÊM (undefined -> BE bỏ qua, dùng slot.servings)
  });
  return;
}
```

### T1.4 — BE: xác nhận `targetServings` đã ưu tiên `dto.servings`

**File:** `be/src/modules-api/meal-planning/meal-planning.service.ts` (~L324-325)

Hiện đã đúng:
```ts
const targetServings = dto.servings !== undefined ? dto.servings : slot.servings;
```
→ **Không cần sửa code**, chỉ cần test.

### T1.5 — Test

- BE unit test: `updateSlot({ completed: true, servings: 4 })` với `recipe.servings = 2` → lượng trừ **gấp đôi**.
- BE unit test: `updateSlot({ completed: true })` (không servings) → giữ nguyên hành vi `slot.servings`.
- RN test (`mobile-native/src/data/offline/__tests__/OfflineMutationQueue.test.js`): op `SLOT_COMPLETE` có `payload.servings`.

---

## 4. Phase 2 — P0: Realtime cho family (socket)

### T2.1 — Cài dependency

**File:** `mobile-native/package.json`

```
"socket.io-client": "^4.8.1"
```

> Kiểm tra version `socket.io` phía BE trước khi chốt (`be/package.json`) để tránh lệch protocol.

### T2.2 — Tạo client singleton

**File mới:** `mobile-native/src/data/api/FamilySocket.js`

Trách nhiệm:
- Kết nối namespace `/family` (`be/src/modules-system/socket/socket.service.ts` dùng `namespace: '/family'`)
- Auth: `auth: { token }` — BE đọc `client.handshake.auth?.token`
- Reconnect: `reconnection: true`, `reconnectionDelay: 1000`, `reconnectionDelayMax: 10000`
- **Token refresh**: khi BE trả `connect_error` do token hết hạn -> đọc token mới từ `TokenStorage` rồi `socket.auth = { token }` + `socket.connect()`
- API:
  - `connectFamilySocket()`
  - `disconnectFamilySocket()`
  - `onFamilyEvent(eventName, handler)` → trả `unsubscribe`
  - `isFamilySocketConnected()`

Ràng buộc:
- R4 (tầng API không import service khác)
- R5 (token chỉ đọc qua `TokenStorage`)

### T2.3 — Event bus nội bộ

**File mới:** `mobile-native/src/data/api/FamilyEventBus.js`

- Map `eventName -> Set<handler>`
- `emitFamilyEvent(eventName, payload)`
- `subscribeFamilyEvent(eventName, handler) -> unsubscribe`

Dùng để tầng `data/` publish, tầng `presentation/` subscribe (giữ đúng ranh giới tầng của repo).

### T2.4 — Lắp vào App

**File:** `mobile-native/App.jsx`

- Khi user đã đăng nhập (và có family) -> `connectFamilySocket()`
- Khi logout -> `disconnectFamilySocket()`

### T2.5 — Xử lý event trong tầng data

**File mới:** `mobile-native/src/data/realtime/FamilyRealtimeSync.js`

| Event BE | Hành động RN |
|---|---|
| `meal:slot_completed` | Invalidate cache tủ lạnh + refetch meal plan tuần + hiện toast "Thành viên X vừa nấu <món>, đã trừ N nguyên liệu" |
| `fridge:item_added` | Refetch danh sách tủ lạnh |
| `fridge:item_updated` | Refetch danh sách tủ lạnh (hoặc patch tại chỗ theo `itemId` + `version`) |
| `fridge:item_removed` | Refetch danh sách tủ lạnh |
| `shopping:item_toggled` | Refetch shopping list |

> Đơn giả & an toàn: **refetch** thay vì patch tại chỗ (tránh lệch logic optimistic update).

### T2.6 — Vòng đời refetch ở tầng presentation

**File:** `mobile-native/src/presentation/hooks/useServiceHooks.js`

- `useFridgeItems()` hiện là hook độc lập, không tự refetch khi có event.
- Thêm cơ chế: một **store nhỏ** (zustand đã có sẵn trong deps) làm nguồn "phiên bản dữ liệu" cho tủ lạnh.
  - `useFridgeItems()` subscribe store -> khi `fridgeVersion` tăng -> refetch
- Tương tự cho meal plan tuần (`useNextWeekPlan`).

**File mới:** `mobile-native/src/data/state/fridgeStore.js` (zustand)

```js
export const useFridgeStore = create((set) => ({
  fridgeVersion: 0,
  bumpFridge: () => set((s) => ({ fridgeVersion: s.fridgeVersion + 1 })),
}));
```

### T2.7 — Test

- `FamilySocket.test.js`: mock `socket.io-client`, assert connect đúng namespace + auth token; assert reconnect khi `connect_error`.
- `FamilyEventBus.test.js`: subscribe/unsubscribe, nhiều handler, handler throw không chặn handler khác.

---

## 5. Phase 3 — P1: Minh bạch kết quả trừ (UI)

### T3.1 — RN: hook `useCookSlot`

**File mới:** `mobile-native/src/presentation/hooks/useCookSlot.js`

Tách logic `startCooking` đang nằm trong `RecipeDetailScreen` ra hook dùng chung (sẽ dùng lại ở Phase 4/5).

```js
const { cook, cooking, error, result } = useCookSlot();
// cook({ slotId, servings }) -> { consumedIngredients, missingIngredients }
```

### T3.2 — RN: toast chi tiết

**File:** `mobile-native/src/presentation/screens/recipe/RecipeDetailScreen.jsx` + `CookingSuggestionsSection.jsx`

- Nếu `missingIngredients.length === 0`: toast hiện tại (`home.startCookingDone`) — có thể nâng lên "đã trừ N món".
- Nếu có thiếu: toast cảnh báo kèm danh sách thiếu (dùng `showInfo`/`showWarning` nếu có; nếu không thì `showError` với message dài).

### T3.3 — RN: màn chi tiết kết quả trừ

**File mới:** `mobile-native/src/presentation/screens/recipe/CookResultScreen.jsx` (hoặc modal trong RecipeDetailScreen)

Hiển thị bảng:

| Nguyên liệu | Cần | Đã trừ | Thiếu |
|---|---|---|---|
| Thịt bò | 200 g | 200 g | 0 |
| Hành lá | 3 cọng | 1 cọng | 2 cọng |

Route mới trong `mobile-native/src/shared/constants/routes.js`.

### T3.4 — i18n

**Files:** `mobile-native/src/shared/i18n/locales/vi.json` + `en.json`

Key mới (nhóm `home` hoặc nhóm `cook`):

```
cook.done.title        — "Đã trừ nguyên liệu"
cook.done.subtitle     — "{{recipe}} · {{servings}} người"
cook.done.needed       — "Cần"
cook.done.deducted     — "Đã trừ"
cook.done.missing      — "Thiếu"
cook.done.allOk        — "Đủ nguyên liệu, đã trừ {{count}} món khỏi tủ lạnh"
cook.done.partial      — "Đã trừ {{count}} món, nhưng còn thiếu {{missing}} món"
cook.done.none         — "Không tìm thấy nguyên liệu nào trong tủ lạnh"
cook.done.byFamily     — "{{name}} vừa nấu {{recipe}}, đã trừ {{count}} nguyên liệu"
cook.undo              — "Hoàn tác"
```

### T3.5 — RN: invalidate cache tủ lạnh sau khi nấu (V7)

Sau khi `updateSlot` thành công -> `useFridgeStore.getState().bumpFridge()` để `useFridgeItems()` refetch. Với user **không có family**, socket không hoạt động -> **bắt buộc** bump thủ công.

---

## 6. Phase 4 — P1: Cảnh báo thiếu nguyên liệu TRƯỚC khi nấu

### T4.1 — RN: dùng `getSlotDetail` để lấy `summary.missingItems`

**File:** `mobile-native/src/presentation/screens/recipe/RecipeDetailScreen.jsx`

- Khi có `slotId` -> gọi `services.recipeService.getSlotDetail(slotId)` (đã có sẵn trong `RealRecipeService`).
- Hiện banner:
  - "Thiếu 2 nguyên liệu: Hành lá (2 cọng), Gừng (1 miếng)" + nút **"Thêm vào danh sách mua"**.
- Nút "Thêm vào danh sách mua" dùng lại luồng `addMissingToList` đã có ở `NextWeekSuggestionsScreen.jsx` (L671) — tách ra hook dùng chung.

### T4.2 — RN: nút "Bắt đầu nấu" khi thiếu

- Hiện dialog xác nhận: "Bạn còn thiếu N nguyên liệu. Vẫn nấu?" -> `[Vẫn nấu]` / `[Huỷ]`.
- BE vẫn cho phép (giữ nguyên semantics hiện tại), chỉ thêm cảnh báo ở tầng UI.

### T4.3 — BE (tuỳ chọn, P2): trả `missingItems` cùng response `updateSlot`

Hiện BE đã có `getSlotDetail` trả `summary.missingItems` (đã scale + normalize về base unit) -> RN dùng lại được, **không cần đổi BE** cho phần này.

---

## 7. Phase 5 — P1: Hoàn tác (undo)

> Cần BE thay đổi DB -> đặt sau P0/P1 để không chặn tiến độ.

### T5.1 — BE: bảng log trừ

**File:** `be/prisma/schema.prisma` (hoặc module tương ứng)

```prisma
model MealSlotIngredientConsumption {
  id              String   @id @default(uuid())
  mealSlotId      String
  fridgeItemId    String
  ingredientId    Int
  quantityUsed    Float    // số lượng đã trừ, quy về base unit
  baseUnit        String
  createdAt       DateTime @default(now())

  @@index([mealSlotId])
  @@unique([mealSlotId, fridgeItemId])   // 1 item chỉ bị trừ 1 lần cho 1 slot
}
```

Migration: `prisma migrate dev --name add_meal_slot_consumption_log`.

### T5.2 — BE: ghi log khi trừ

**File:** `be/src/modules-api/meal-planning/meal-planning.service.ts` — trong `consumeIngredientsForSlot`, mỗi lần update `fridgeItem` thì `tx.mealSlotIngredientConsumption.create({...})`.

### T5.3 — BE: endpoint hoàn tác

**File:** `be/src/modules-api/meal-planning/meal-planning.service.ts` — thêm `restoreSlotIngredients(userId, slotId)`:

1. Kiểm tra slot thuộc user/family.
2. Đọc log -> với mỗi `fridgeItemId`: `quantity += quantityUsed` (quy ngược về unit gốc của item), `consumedAt = null` nếu trước đó bị set, `version++`.
3. Xoá log (hoặc đánh dấu `restoredAt`).
4. Set `slot.completedAt = null`.

**Thêm endpoint:** `POST /meal-planning/slots/:id/restore` (hoặc mở rộng `PATCH` với `restore: true`).

### T5.4 — BE: `PATCH { completed: false }` — KHÔNG tự hoàn tác

Giữ nguyên semantics hiện tại (bỏ tick chỉ gỡ nhãn "đã nấu", **không** cộng lại nguyên liệu), nhưng **trả kèm** `canRestore: true` + `restoreAvailable` để UI biết có thể undo.

### T5.5 — RN: nút "Hoàn tác"

**Files:**
- `mobile-native/src/presentation/components/home/CookingSuggestionsSection.jsx` — chip "Đã nấu" -> long-press hoặc menu "Hoàn tác"
- `mobile-native/src/presentation/screens/recipe/RecipeDetailScreen.jsx` — nút phụ "Hoàn tác" khi `slotCooked`
- `mobile-native/src/data/services/real/RealRecipeService.js` — thêm `restoreSlot(slotId)`
- `mobile-native/src/data/services/mock/MockRecipeService.js` — mock tương ứng
- i18n: `cook.undo`, `cook.undoConfirm`, `cook.undoDone`, `cook.undoFailed`

---

## 8. Phase 6 — P1: `consumeItem` hỗ trợ family scope

### T6.1 — BE

**File:** `be/src/modules-api/fridge/fridge.service.ts` (hàm `consumeItem` ~L318)

```ts
async consumeItem(userId: string, itemId: string): Promise<FridgeItemResponseDto> {
  const familyGroupId = await this.resolveFamilyGroupId(userId);
  const item = await this.prisma.fridgeItem.findFirst({
    where: familyGroupId
      ? { id: itemId, familyGroupId, deletedAt: null }
      : { id: itemId, userId, familyGroupId: null, deletedAt: null },
  });
  ...
  // Đồng thời set quantity = 0 (đồng bộ với hành vi "dùng hết")
  data: { consumedAt: new Date(), quantity: 0, version: { increment: 1 } },
}
```

> Hiện `consumeItem` set `consumedAt` nhưng **không** set `quantity = 0` -> tồn kho ảo vẫn còn số lượng. Cần kiểm tra `buildFridgeMap` / `getItems` có lọc `consumedAt` không (có: `consumedAt: null`) -> tồn kho logic vẫn đúng, nhưng **set `quantity = 0`** cho nhất quán với luồng trừ theo công thức.

### T6.2 — BE: broadcast socket khi consume

Thêm `this.socketService.emitFridgeItemRemoved(familyGroupId, itemId, name, userName)` để RN family đồng bộ (nếu chưa có).

### T6.3 — RN

`RealFridgeService.markConsumed(id)` — không cần đổi signature. Nhưng cần kiểm tra `MutationHandlers.markConsumed` (`applyCache`) có set `quantity: 0` khớp với BE.

---

## 9. Phase 7 — P2: Offline & Mock

### T7.1 — Mock: trừ thật vào tủ lạnh mock

**File:** `mobile-native/src/data/services/mock/MockRecipeService.js`

- Khi tick lần đầu -> trừ vào `mockFridgeItems` (theo tên/unit, FIFO), trả `consumedIngredients` với **lượng thực trừ** + `missingIngredients` cho phần thiếu.
- Nhất quán với BE để test UI không bị lệch.

**File:** `mobile-native/src/data/services/mock/MockFridgeService.js` — nếu mock tủ lạnh là module-level array thì dùng chung; nếu không, export hàm để `MockRecipeService` gọi.

### T7.2 — Offline: xử lý response idempotent

**File:** `mobile-native/src/data/offline/SyncEngine.js`

- BE trả `consumedIngredients: []` khi slot đã `completedAt` từ trước (idempotent) -> coi như **thành công** (không phải lỗi).
- Hiện `updateSlot` chỉ trả về object, không ném lỗi -> đã ổn. Cần test để chốt.

### T7.3 — Offline: `SLOT_COMPLETE` khi user offline

Hiện đã queue được. Cần bổ sung: sau khi sync thành công -> `bumpFridge()` để UI refresh.

---

## 10. Phase 8 — P2: Đơn vị đếm vs khối lượng

### T8.1 — BE: bảng ước lượng count -> gram

**File:** `be/src/common/utils/unit.util.ts`

Thêm (đánh dấu là **ước tính**, không phải chính xác):

```ts
const COUNT_TO_WEIGHT_ESTIMATE: Record<string, number> = {
  'củ tỏi': 5,    // 1 củ ~ 5g
  'củ hành': 100,
  'quả trứng': 50,
  'cọng hành lá': 3,
  ...
};
```

- `normalizeToBaseUnit` **giữ nguyên** hành vi hiện tại (không đổi hành vi đã có).
- Thêm hàm mới `tryEstimateToBaseUnit(quantity, unit)` -> `{ quantity, baseUnit, estimated: true }`.
- Dùng hàm mới **chỉ trong `consumeIngredientsForSlot`**, và **chỉ khi** không tìm thấy item cùng base unit.
- Response phải đánh dấu `estimated: true` cho phần trừ bằng ước tính -> UI hiện badge "ước tính".

### T8.2 — RN: hiển thị badge "ước tính"

- Icon dấu `~` cạnh số lượng + tooltip "Lượng ước tính theo đơn vị đếm".

---

## 11. Phase 9 — P2: DTO chính thức

**File:** `be/src/modules-api/meal-planning/dto/meal-planning-response.dto.ts`

- Bổ sung `ConsumedIngredientDto`, `MissingIngredientDto`.
- Xem lại `meal-planning.controller.ts` -> nếu `PATCH /slots/:id` chưa khai báo `@ApiOkResponse({ type: ... })` thì thêm, để Swagger mô tả đúng contract mới.

---

## 12. Thứ tự thực hiện đề xuất

```
✅ P0-1  Phase 0.1 - 0.4   Chốt contract BE (consumedIngredients mở rộng + missingIngredients)   [ĐÃ XONG]
✅ P0-2  Phase 1             Fix servings (RN + offline)                ← bug mất thực phẩm       [ĐÃ XONG]
⏳ P0-3  Phase 2.1 - 2.4     socket.io-client + FamilySocket + EventBus
⏳ P0-4  Phase 2.5 - 2.7     realtime sync + invalidate cache tủ lạnh
--- checkpoint: chạy được app, family đồng bộ tủ lạnh, trừ đúng lượng ---
⏳ P1-1  Phase 3             Minh bạch kết quả trừ (UI + i18n)
⏳ P1-2  Phase 4             Cảnh báo thiếu nguyên liệu trước khi nấu
⏳ P1-3  Phase 6             consumeItem hỗ trợ family scope
--- checkpoint: user biết chính xác đã trừ gì, còn thiếu gì ---
⏳ P1-4  Phase 5             Undo (cần migration DB)                    ← việc lớn nhất
--- checkpoint: tick nhầm thì hoàn tác được ---
⏳ P2-1  Phase 7             Mock + offline consistency
⏳ P2-2  Phase 8             Ước lượng đơn vị đếm -> khối lượng
⏳ P2-3  Phase 9             DTO chính thức + Swagger
```

---

## 12b. Nhật ký đã triển khai (Phase 0 + Phase 1)

### Phase 0 — Chốt contract BE ↔ RN ✅

**BE**

| File | Thay đổi |
|---|---|
| `be/src/modules-api/meal-planning/meal-planning.service.ts` | `consumeIngredientsForSlot()` trả `{ consumed, missing }` thay vì mảng. Tính thêm `deductedNorm` (lượng **thực sự** bị trừ) tách khỏi `scaledQty` (lượng công thức yêu cầu). `updateSlot()` trả thêm `missingIngredients`. Thêm 2 interface `ConsumedIngredientResult` / `MissingIngredientResult`. |
| `be/src/modules-api/meal-planning/dto/meal-planning-response.dto.ts` | Thêm `ConsumedIngredientDto`, `MissingIngredientDto`, `UpdateMealSlotResponseDto`. |
| `be/src/modules-api/meal-planning/meal-planning.controller.ts` | `@ApiOkResponse({ type: UpdateMealSlotResponseDto })` cho `PATCH /slots/:id`. |
| `be/src/modules-system/socket/socket.service.ts` | `emitMealSlotCompleted()` nhận shape mới (3 field cũ giữ nguyên) + `missingIngredients`. |

**RN**

| File | Thay đổi |
|---|---|
| `mobile-native/src/data/services/real/RealRecipeService.js` | `updateSlot()` map thêm `missingIngredients` (default `[]` nếu BE cũ). |
| `mobile-native/src/data/services/mock/MockRecipeService.js` | `updateSlot()` trả **cùng key set** + scale `consumedIngredients` theo `servings` (khớp BE). |
| `mobile-native/src/presentation/hooks/useCookSlot.js` (MỚI) | Hook dùng chung cho "Bắt đầu nấu": chuẩn hoá response, toast 3 trạng thái (đủ / thiếu một phần / không trừ được), chống bấm nhiều lần. |
| `mobile-native/src/presentation/screens/recipe/RecipeDetailScreen.jsx` | Dùng `useCookSlot`, **gửi `servings`**. |
| `mobile-native/src/presentation/components/home/CookingSuggestionsSection.jsx` | Toast 3 trạng thái (không gửi `servings` — đúng vì màn này không có Stepper). |
| `mobile-native/src/shared/i18n/locales/{vi,en}.json` | Thêm key `home.startCookingPartial`. |

### Phase 1 — Fix `servings` ✅

| File | Thay đổi |
|---|---|
| `mobile-native/src/presentation/screens/recipe/RecipeDetailScreen.jsx` | `cook({ slotId, servings })` — khẩu phần user chọn ở Stepper được gửi lên BE. |
| `mobile-native/src/data/offline/MutationHandlers.js` | Outbox lưu `servings` trong `payload`. |
| `mobile-native/src/data/offline/SyncEngine.js` | Sync lại truyền `servings` cho BE. |

### Kết quả kiểm thử

- BE: `tsc --noEmit` ✅ · `nest build` ✅ · `jest` 14/14 ✅ · lint **không tăng** (service: 99→99, DTO: 13→13, controller: 55→55, socket: 16→**14**).
- RN: `jest` **902/902** ✅ · `eslint` các file đổi ✅ · `prettier` không phát sinh lỗi mới.

### Hành vi sau thay đổi

| Tình huống | Trước | Sau |
|---|---|---|
| User chỉnh khẩu phần 2→4 rồi bấm "Bắt đầu nấu" | BE trừ theo `slot.servings` (2) → **trừ thiếu 1/2** | BE trừ theo `servings: 4` → **đúng** |
| Tủ lạnh chỉ có 1/2 lượng cần | Toast "đã trừ 5 nguyên liệu" (sai) | Toast "đã trừ 3 nguyên liệu, còn thiếu: Thịt bò (100g), ..." |
| BE cũ (chưa deploy) | — | `missingIngredients` default `[]` → không crash |
| Client Flutter (`Mobile/`) | — | Không vỡ: `consumedIngredients` giữ nguyên 3 field cũ |

### Việc còn lại để test tay

1. Deploy BE → mở app RN → màn chi tiết công thức → chỉnh khẩu phần → bấm "Bắt đầu nấu" → kiểm tra tủ lạnh bị trừ đúng lượng.
2. Test thiếu nguyên liệu: xoá 1 món khỏi tủ lạnh → bấm nấu → toast phải báo còn thiếu.
3. Test offline: tắt mạng → bấm nấu → bật mạng → kiểm tra lượng trừ đúng `servings` đã chọn.


---

## 13. Checklist test cho từng phase

### Phase 0
- [ ] `PATCH /slots/:id` trả `consumedIngredients[]` có `requiredQuantity`, `deductedQuantity`, `shortage`, `isOptional`
- [ ] `PATCH /slots/:id` trả `missingIngredients[]`
- [ ] `RealRecipeService.updateSlot` map đủ field
- [ ] `MockServicesContract.test.js` pass (shape giốa nhau)

### Phase 1
- [ ] BE: `servings: 4` vs `recipe.servings: 2` -> lượng trừ x2
- [ ] BE: không truyền `servings` -> dùng `slot.servings`
- [ ] RN: `RecipeDetailScreen` gửi `servings`
- [ ] RN: outbox `SLOT_COMPLETE` giữ `payload.servings`
- [ ] RN: `SyncEngine` truyền lại `servings`

### Phase 2
- [ ] Socket kết nối đúng namespace `/family`, auth token
- [ ] Token hết hạn -> refresh -> reconnect thành công
- [ ] Nhận `meal:slot_completed` -> tủ lạnh refetch, toast hiện
- [ ] Nhận `fridge:item_updated` -> tủ lạnh refetch
- [ ] Logout -> socket disconnect, không còn handler leak
- [ ] Nhiều màn hình subscribe/unsubscribe đúng (không rò listener)

### Phase 3
- [ ] Toast phân biệt: đủ / thiếu một phần / không có gì trừ được
- [ ] Màn kết quả hiện đúng bảng Cần / Đã trừ / Thiếu
- [ ] i18n vi + en đủ key, không hardcode chuỗi

### Phase 4
- [ ] Banner thiếu nguyên liệu hiện đúng số lượng + đơn vị (base unit)
- [ ] "Thêm vào danh sách mua" hoạt động
- [ ] Dialog xác nhận khi thiếu

### Phase 5
- [ ] Migration chạy được trên DB dev
- [ ] `POST /slots/:id/restore` cộng lại đúng lượng, đúng item
- [ ] Restore 2 lần -> lần 2 không cộng thêm (idempotent)
- [ ] UI có nút Hoàn tác + xác nhận

### Phase 6
- [ ] Family member gọi `consume` item của family -> 200
- [ ] `quantity` = 0 sau khi consume
- [ ] Người ngoài family gọi -> 404

---

## 14. Rủi ro & lưu ý

| Rủi ro | Giảm thiểu |
|---|---|
| Đổi shape `consumedIngredients` làm vỡ `Mobile/` (Flutter) | Giữ nguyên 3 field cũ, chỉ **thêm** field mới |
| `socket.io-client` tăng bundle size | Dùng lazy import trong `FamilySocket.js` |
| Socket reconnect spam khi offline | `reconnectionDelayMax: 10000` + tắt khi app background |
| Undo cộng lại lượng sai (FIFO nhiều item) | Bắt buộc có bảng log `MealSlotIngredientConsumption` |
| Migration DB trên prod | Deploy BE **sau** khi migration đã apply; feature-flag `restore` |
| Offline queue `SLOT_COMPLETE` replay nhiều lần | BE đã idempotent (`slot.completedAt` guard) -> OK |
| `unit.util.ts` đổi -> ảnh hưởng gap analysis | T8 dùng hàm **mới**, không sửa `normalizeToBaseUnit` |

---

## 15. Ước lượng effort

| Phase | Nội dung | BE | RN | Ước lượng |
|---|---|---|---|---|
| 0 | Chốt contract | 0.5-1 ngày | 0.5 ngày | 1-1.5 ngày |
| 1 | Fix servings | 0.5 ngày | 0.5-1 ngày | 1-1.5 ngày |
| 2 | Realtime socket | 0 (đã có) | 2-3 ngày | 2-3 ngày |
| 3 | Minh bạch kết quả | 0.5 ngày | 1-1.5 ngày | 1.5-2 ngày |
| 4 | Cảnh báo thiếu | 0 | 1 ngày | 1 ngày |
| 5 | Undo | 1.5-2 ngày (migration + logic) | 1 ngày | 2.5-3 ngày |
| 6 | consumeItem family | 0.5 ngày | 0.25 ngày | 0.5-1 ngày |
| 7 | Mock/offline | 0 | 1 ngày | 1 ngày |
| 8 | Ước lượng đơn vị | 1 ngày | 0.5 ngày | 1.5 ngày |
| 9 | DTO/Swagger | 0.5 ngày | 0 | 0.5 ngày |
| | | | | **~12-15 ngày công** |

**MVP đề xuất (giá trị cao nhất / effort thấp nhất): Phase 0 + Phase 1 + Phase 3 + Phase 6 → ~5 ngày.**
Phase 2 (realtime) làm sau vì effort lớn nhưng không gây mất dữ liệu.
