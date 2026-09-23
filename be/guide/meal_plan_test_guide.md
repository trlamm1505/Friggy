# Meal Planning Enhancement — Test Guide

> Build status: ✅ ai-service (clean) | ✅ be (clean)

---

## Luồng đúng theo thứ tự

```
[A] Tạo plan → [B] Xem slot thiếu gì → [C] Tạo shopping list → [D] Tick mua → [E] Nấu xong
```

---

## Bước 0 — Chuẩn bị

```bash
# Lấy access token
POST /api/v1/auth/login
Body: { "email": "...", "password": "..." }
→ Lưu: TOKEN

# Tạo meal plan (nếu chưa có)
POST /api/v1/meal-planning/plans/generate
Body: { "weekStartDate": "2026-09-29", "householdSize": 2 }
→ Lưu: jobId (chờ AI xử lý xong qua SSE)

# Lấy danh sách plans để lấy weeklyPlanId và slotId
GET /api/v1/meal-planning/plans
→ Lưu: WEEKLY_PLAN_ID, SLOT_ID
```

---

## Bước 1 — GET /slots/:id

**Xem công thức + nguyên liệu cần + trạng thái tủ lạnh**

> Đây là bước đầu tiên khi user bấm vào 1 bữa ăn cụ thể.
> Kết quả **KHÔNG lưu DB** — chỉ là phân tích real-time.

```bash
GET /api/v1/meal-planning/slots/{SLOT_ID}
Authorization: Bearer {TOKEN}
```

### Expected response
```json
{
  "id": "slot-uuid",
  "mealType": "breakfast",
  "servings": 1,
  "completedAt": null,
  "recipe": {
    "title": "Bánh mì ốp la cà chua",
    "cookTimeMinutes": 10,
    "steps": [
      { "stepNumber": 1, "instruction": "Rửa sạch cà chua và thái lát mỏng.", "durationMinutes": 3 },
      { "stepNumber": 2, "instruction": "Đun nóng dầu ăn, đập 2 quả trứng ốp la.", "durationMinutes": 4 }
    ],
    "ingredients": [
      {
        "name": "Trứng gà", "quantityNeeded": 2, "baseUnit": "quả",
        "fridgeStatus": "missing", "fridgeQuantity": 0, "missingQuantity": 2
      },
      {
        "name": "Dầu ăn", "quantityNeeded": 10, "baseUnit": "ml",
        "fridgeStatus": "have", "fridgeQuantity": 50, "missingQuantity": 0
      }
    ]
  },
  "summary": {
    "totalIngredients": 3, "haveCount": 1, "missingCount": 2,
    "fridgeReadyPercent": 33,
    "missingItems": [ ... ]
  }
}
```

### Test cases

| Scenario | Expected |
|---|---|
| Tủ đủ tất cả | `fridgeReadyPercent: 100`, `missingCount: 0` |
| Tủ thiếu một phần | `fridgeStatus: 'partial'` cho item đó |
| Tủ trống | `fridgeReadyPercent: 0`, tất cả `fridgeStatus: 'missing'` |
| Slot chưa có recipe | `recipe: null`, `summary.totalIngredients: 0` |
| Slot không thuộc user | `404 Not Found` |
| 1 kg trong tủ vs 500g cần | So sánh đúng → `fridgeStatus: 'have'` |

---

## Bước 2 — POST /shopping-lists

**Tạo danh sách mua — chỉ chứa nguyên liệu còn thiếu so với tủ lạnh**

> Phải gọi POST này trước, sau đó mới GET được danh sách.
> Scope: tổng hợp **toàn bộ slots trong plan** (không phải 1 slot).

```bash
POST /api/v1/meal-planning/shopping-lists
Authorization: Bearer {TOKEN}
Content-Type: application/json

{ "weeklyPlanId": "{WEEKLY_PLAN_ID}" }
```

### Expected response
```json
{
  "id": "list-uuid",
  "title": "Danh sách mua tuần 4",
  "isSmartFiltered": true,
  "totalEstimatedCost": 45000,
  "items": [
    { "id": 1, "ingredientName": "Trứng gà", "quantity": 2, "unit": "quả", "isPurchased": false },
    { "id": 2, "ingredientName": "Cà chua", "quantity": 1, "unit": "quả", "isPurchased": false }
  ]
}
```

> [!NOTE]
> `isSmartFiltered: true` = danh sách đã được lọc (bỏ những gì tủ đã có).
> `isSmartFiltered: false` = tủ trống hoàn toàn, không lọc gì cả.

### Test cases

| Scenario | Expected |
|---|---|
| Tủ đủ 100% | `items: []`, `isSmartFiltered: true` |
| Tủ trống | `isSmartFiltered: false`, items = tất cả nguyên liệu |
| Tủ thiếu 3/10 | Chỉ 3 items trong list |
| kg trong tủ vs g trong recipe | Tính đúng lượng còn thiếu |
| weeklyPlanId không thuộc user | `404 Not Found` |

---

## Bước 3 — GET /shopping-lists *(optional — xem lại list đã tạo)*

> Đây chỉ là **xem** danh sách đã tạo từ bước 2. Không tự sinh dữ liệu.
> Nếu chưa POST ở bước 2 → trả về `[]` rỗng.

```bash
GET /api/v1/meal-planning/shopping-lists
Authorization: Bearer {TOKEN}
```

---

## Bước 4 — PATCH /shopping-lists/:listId/items/:itemId

**Tick đã mua → auto thêm nguyên liệu vào tủ lạnh**

> Đây là cầu nối giữa "mua ngoài chợ" và "tủ lạnh trong app".
> Khi tick → FridgeItem được tạo tự động, không cần scan lại.

```bash
PATCH /api/v1/meal-planning/shopping-lists/{LIST_ID}/items/{ITEM_ID}
Authorization: Bearer {TOKEN}
```

### Expected response
```json
{ "id": 1, "isPurchased": true, "purchasedAt": "2026-09-24T04:00:00.000Z" }
```

### Verify tủ lạnh đã được thêm
```bash
GET /api/v1/fridge
# → Thấy FridgeItem mới với addedBy: "manual"
```

### Test cases

| Scenario | Expected |
|---|---|
| Tick mua (false → true) | FridgeItem tạo; `isPurchased: true` |
| Bỏ tick (true → false) | `isPurchased: false`; FridgeItem **không bị xóa** |
| Tick lại lần 2 (false → true) | FridgeItem thứ 2 được tạo thêm |
| Item không tồn tại | `404 Not Found` |

---

## Bước 5 — PATCH /slots/:id (completed: true)

**Đánh dấu nấu xong → auto trừ nguyên liệu khỏi tủ (FIFO)**

> FE nên hiển thị **confirm dialog** trước — hành động này không undo được.

```bash
PATCH /api/v1/meal-planning/slots/{SLOT_ID}
Authorization: Bearer {TOKEN}
Content-Type: application/json

{ "completed": true }
```

### Expected response
```json
{
  "id": "slot-uuid",
  "mealType": "breakfast",
  "recipeId": "recipe-uuid",
  "servings": 1,
  "completedAt": "2026-09-24T04:00:00.000Z"
}
```

### Verify fridge đã bị trừ
```bash
GET /api/v1/fridge
# → Item đã dùng hết: consumedAt không null
# → Item dùng một phần: quantity giảm
```

### Test cases

| Scenario | Expected |
|---|---|
| Lần đầu `completed: true` | Fridge bị trừ FIFO + `completedAt` set |
| Lần 2 `completed: true` *(idempotent)* | Fridge **không bị trừ lần 2** |
| `completed: false` (undo) | `completedAt: null`; Fridge **không hoàn lại** |
| Tủ trống (chưa mua) | Vẫn `200 OK`; log warn "thiếu X g"; không throw |
| Slot không có recipe | Skip trừ fridge; trả `200 OK` |

---

## Bước 6 — AI Recipe: Verify steps & ingredients

**Kiểm tra recipe do AI tự tạo có lưu steps + ingredients không**

```bash
# Sau khi generate plan xong, gọi slot detail của bữa AI tự nghĩ
GET /api/v1/meal-planning/slots/{SLOT_ID_AI_RECIPE}

# Expect:
# recipe.steps: [...] không rỗng
# recipe.ingredients: [...] không rỗng (nếu tên match DB)
```

---

## Checklist nhanh theo thứ tự

```
[ ] Bước 0: POST /plans/generate → plan có slots
[ ] Bước 1: GET /slots/:id → trả steps, ingredients, fridgeStatus đúng
[ ] Bước 2: POST /shopping-lists → isSmartFiltered, chỉ missing items
[ ] Bước 3: GET /shopping-lists → thấy list vừa tạo (không rỗng)
[ ] Bước 4: PATCH shopping-list item → isPurchased=true + FridgeItem tạo
[ ] Bước 4b: GET /fridge → thấy item mới addedBy: "manual"
[ ] Bước 5: PATCH /slots/:id completed=true → completedAt set + fridge trừ
[ ] Bước 5b: PATCH lần 2 → fridge KHÔNG bị trừ lần 2 (idempotent)
[ ] Bước 5c: GET /fridge → item consumedAt không null hoặc quantity giảm
[ ] Bước 6: AI recipe → steps + ingredients không rỗng
```
