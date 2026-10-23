# PROMPT BÀN GIAO — DEV B

> **File này dành cho DEV B (2 người trong team).**
> DEV A (người gửi file này) làm song song 3 sprint A1 / A2 / A3.
> Bạn là DEV B — làm 4 sprint B1 / B2 / B3 / B4.
>
> Các chỗ ghi `[Điền]` / `[XÁC NHẬN]` là chỗ user (DEV A) hoặc chính bạn cần điền sau.
> **Không bắt đầu viết code cho đến khi đã đọc hết Mục 0 và Mục 1.**

---

## 0. BẮT ĐẦU THẾ NÀO

### Bước 1 — Kiểm tra môi trường (chạy trước tiên)

```powershell
cd C:\Users\Admin\Desktop\Project\Friggy
git log --oneline -5
git status
```

Báo lại kết quả cho DEV A. Mục đích: xác nhận bạn đang ở đúng branch và đã có
đủ hạ tầng Phase 0.

**Điều kiện bắt buộc để bắt đầu:**

| Điều kiện | Làm sao biết | Nếu KHÔNG đạt |
|---|---|---|
| Branch `feat/mobile-be-devB` đã tạo từ `main` sau khi Phase 0 merge | `git log` thấy commit Phase 0 | Dừng, báo DEV A |
| Có hạ tầng Phase 0 trong `mobile-native/src/data/api/` | Thấy `ApiClient.js`, `SafeService.js`, `ServiceRegistry.jsx` | Dừng, báo DEV A |
| Phase 0 test pass | `cd mobile-native; npx jest` → 200/200 pass | Dừng, báo DEV A |
| Đã merge 26 file fix P0.7/P0.8 | `git log` thấy các commit fix | Dừng, báo DEV A |
| Cùng trỏ 1 BE dev | So `EXPO_PUBLIC_API_BASE_URL` với DEV A | Hỏi DEV A lấy URL + tài khoản test |

> **Tại sao dừng chứ không làm tiếp:** nếu 26 file fix đó chưa có trên branch của bạn,
> bạn sẽ build từ code cũ, gặp đúng những lỗi đã được sửa, rồi tự sửa theo cách riêng →
> 2 bên hiểu code khác nhau. Đây là bài học đã mắc phải 1 lần.

### Bước 2 — Đọc plan

File: `C:\Users\Admin\.cursor\plans\kế_hoạch_nối_mobile-native_với_be_1287bf77.plan.md` (1803 dòng)

Đọc TẤT CẢ. Bắt buộc đọc kỹ các mục sau:

| Mục | Dòng | Nội dung |
|---|---|---|
| 0 | 31–123 | Quy trình ra quyết định 4 bước + **CAM KẾT PHẠM VI** (ràng buộc bắt buộc) |
| 1 | 124–156 | Kết luận thiết kế quan trọng nhất — tránh xung đột file |
| 3 | 204–746 | Phase 0 — đã xong, đọc để hiểu hạ tầng bạn sẽ dùng |
| **5** | **938–1291** | **4 sprint của bạn — đọc kỹ nhất** |
| 6 | 1292–1412 | Bảng phân công + danh sách file xung đột + luật build artifact |
| 7 | 1413–1426 | 9 quy tắc merge |
| 8 | 1428–1510 | Q1–Q4 đã chốt (đọc để không hỏi lại) |
| 9b | 1573–1671 | 8 quy tắc code + test bắt buộc |

### Bước 3 — Đọc hạ tầng đã có (đừng đoán)

```
mobile-native/src/data/api/ApiClient.js          # gọi HTTP, refresh token, unwrap envelope
mobile-native/src/data/api/ApiException.js       # lỗi có cấu trúc
mobile-native/src/data/api/SafeService.js        # withFallback — chống demo block
mobile-native/src/data/api/ServiceRegistry.jsx   # registerService / useServices
mobile-native/src/data/storage/TokenStorage.js   # 6 keys, KHÔNG import useAuthStore
mobile-native/src/shared/config/appConfig.js     # getImageUrl(), TIMEOUT_MS, USE_MOCKS
mobile-native/src/data/interfaces/I*.js          # contract — đọc trước khi implement
mobile-native/src/data/services/mock/Mock*.js    # nguồn shape đầu ra mong muốn
```

Đọc file thật trước khi viết dòng code đầu tiên. Mỗi lần kế hoạch có nói "dùng ApiClient",
"qua getImageUrl", "reuse `_computeStatus` từ mock" — đó là chỉ dẫn cụ thể, hãy làm đúng.

---

## 1. PHẠM VI CỦA BẠN — 4 SPRINT

### B1 — Fridge CRUD đầy đủ

**File TAO mới**
- `src/data/services/real/RealFridgeService.js`

**File SUA**
- `src/presentation/screens/fridge/FridgeInventoryScreen.jsx`
- `src/presentation/screens/fridge/ManualAddIngredientScreen.jsx`
- `src/presentation/screens/fridge/AllAvailableItemsScreen.jsx`
- `src/presentation/screens/fridge/AllExpiredItemsScreen.jsx`
- `src/presentation/screens/fridge/MyFridgesScreen.jsx`
- `src/presentation/components/fridge/FridgeItem.jsx`
- `src/presentation/components/fridge/FridgeCard.jsx`
- `src/presentation/components/home/FridgeSummaryCards.jsx`

**TEST bắt buộc**: `src/data/services/real/__tests__/RealFridgeService.test.js` — tối thiểu **4 test**

| Tính năng | Endpoint (đã verify từ Swagger production) |
|---|---|
| List | `GET /fridge?storageLocation=&expiringSoon=` |
| Expiring | `GET /fridge/expiring?days=3` |
| Summary | `GET /fridge/stats` |
| Chart | `GET /fridge/stats/chart?period=week\|month` |
| Add | `POST /fridge/items` |
| Update | `PATCH /fridge/items/{id}` |
| Delete | `DELETE /fridge/items/{id}` |
| Consume | `PATCH /fridge/items/{id}/consume` |

### B2 — Scan Image / Receipt / Barcode

**File TAO mới**
- `src/data/services/real/RealScanService.js`
- `src/presentation/components/scan/ScanResultReviewModal.jsx` *(verify đã tồn tại chưa)*

**File SUA**
- `src/presentation/screens/scan/ScanFoodPhotoScreen.jsx`
- `src/presentation/screens/scan/ScanReceiptScreen.jsx`
- `src/presentation/screens/scan/ScanBarcodeScreen.jsx`
- `src/presentation/screens/scan/CameraPreviewScreen.jsx`

**TEST bắt buộc**: `RealScanService.test.js` — tối thiểu **3 test** (có upload file)

| Tính năng | Endpoint |
|---|---|
| Scan ảnh | `POST /fridge/scan/image` (multipart `file`) |
| Scan hoá đơn | `POST /fridge/scan/receipt` |
| Scan barcode | `POST /fridge/scan/barcode` |
| Poll | `GET /fridge/scan/{scanId}` (poll 2s) |
| Confirm | `POST /fridge/scan/{scanId}/confirm` |
| History | `GET /fridge/scan/history` |

### B3 — Recipes + Detail + Bookmark

**File TAO mới**
- `src/data/services/real/RealRecipeService.js` *(chỉ phần recipes, chưa có meal-planning)*

**File SUA**
- `src/data/interfaces/IRecipeService.js` ← **contract file, bạn được sửa**
- `src/data/services/mock/MockRecipeService.js` ← **sửa cho khớp typedef mới**
- `src/presentation/screens/recipe/RecipeSuggestionsScreen.jsx`
- `src/presentation/screens/recipe/RecipeDetailScreen.jsx`
- `src/presentation/components/recipe/RecipeCard.jsx` *(verify path)*
- `src/presentation/components/recipe/RecipeListItem.jsx`
- `src/presentation/components/home/CookingSuggestionsSection.jsx`

**TEST bắt buộc**: `RealRecipeService.test.js` — tối thiểu **3 test**

| Tính năng | Endpoint |
|---|---|
| List | `GET /recipes?search=&mealType=&difficulty=&tagIds=&maxCookTime=` |
| Detail | `GET /recipes/{id}` (có `inFridge` analysis) |
| Suggestions | `GET /recipes/suggestions` (có `matchScore`) |
| Bookmarked | `GET /recipes/bookmarked` |
| Bookmark | `POST /recipes/{id}/bookmark` / `DELETE /recipes/{id}/bookmark` |

### B4 — Meal Planning + Shopping List + AI Chat

**File TAO mới**
- `src/data/services/real/RealAiChatService.js`
- `src/data/api/SseClient.js` ← **bạn là người duy nhất được tạo file này**

**File SUA**
- `src/data/services/real/RealRecipeService.js` ← **sửa lại file đã tạo ở B3**, KHÔNG tạo `RealMealPlanningService.js`
- `src/presentation/screens/recipe/NextWeekSuggestionsScreen.jsx`
- `src/presentation/screens/recipe/ShoppingReminderScreen.jsx`
- `src/presentation/screens/recipe/IngredientStatisticsScreen.jsx`
- `src/presentation/screens/ai/AiChatScreen.jsx`
- `src/presentation/components/recipe/DayPlanCard.jsx`
- `src/presentation/components/chat/MessageBubble.jsx`
- `src/presentation/components/home/WeeklyStatisticsSection.jsx`

**TEST bắt buộc**: bổ sung `RealRecipeService.test.js` + `RealAiChatService.test.js` — **3 + 3 test**

| Tính năng | Endpoint |
|---|---|
| Generate plan | `POST /meal-planning/plans/generate` (202 + `jobId`) |
| SSE plan | `GET /meal-planning/plans/generate/{jobId}/stream` |
| Plans list | `GET /meal-planning/plans` |
| Plan detail | `GET /meal-planning/plans/{id}` |
| Update plan | `PATCH /meal-planning/plans/{id}` |
| Slot detail / update | `GET\|PATCH /meal-planning/slots/{id}` |
| Regenerate slot | `POST /meal-planning/slots/{id}/regenerate` + SSE stream |
| From expiring | `POST /meal-planning/plans/generate-from-expiring` + SSE |
| Shopping lists | `GET\|POST /meal-planning/shopping-lists` |
| Toggle shopping | `PATCH /meal-planning/shopping-lists/{listId}/items/{itemId}` |
| AI sessions | `GET\|POST /ai-chat/sessions` |
| Send message | `POST /ai-chat/sessions/{id}/messages` (202) |
| AI SSE | `GET /ai-chat/sessions/{id}/stream` |

---

## 2. PHẠM VI CẤM SỬA

### 2.1 File đã đóng băng từ Phase 0

| File | Tình trạng |
|---|---|
| `App.jsx` | Chỉ sửa 1 lần ở Phase 0 → **đóng băng** |
| `src/data/ServiceProvider.jsx` | Chỉ sửa 1 lần ở Phase 0 → **đóng băng** |
| `src/presentation/hooks/useServiceHooks.js` | **KHÔNG đổi bao giờ** |

### 2.2 File thuộc DEV A — KHÔNG sửa

```
src/presentation/screens/profile/*.jsx
src/presentation/screens/onboarding/*
src/presentation/screens/auth/*.jsx
src/presentation/components/home/PremiumBanner.jsx
src/shared/stores/useAuthStore.js
```

### 2.3 File tranh chấp đã được giải quyết

| File | Ai sửa | Ghi chú |
|---|---|---|
| `src/presentation/screens/home/HomeScreen.jsx` | **CHỈ DEV A** | File duy nhất gọi hook từ 3 domain khác nhau. **Bạn KHÔNG được sửa.** Cần đổi widget → báo DEV A. |
| `src/data/interfaces/IRecipeService.js` | **DEV B (bạn)** | Nhưng phải **thông báo DEV A trước** vì `useServiceHooks.js` đang dùng nó |
| `src/data/services/real/RealRecipeService.js` | **DEV B (bạn)** | B3 tạo, B4 sửa tiếp — cùng người, không xung đột |

### 2.4 Quy tắc bất di bất dịch

1. **Gặp bug ở file của DEV A → BÁO LẠI, KHÔNG TỰ SỬA.** Đã commit rồi cũng vậy.
2. **Không tạo file ngoài danh sách** ở Mục 1 để "chuẩn hoá cho gọn".
3. **Không refactor** file không nằm trong phạm vi sprint hiện tại.
4. **Không làm 2 sprint cùng lúc** — 1 sprint = 1 PR.
5. **Không có file test → không merge được** (quy tắc merge số 9).

---

## 3. 8 QUY TẮC CODE BẮT BUỘC

```
R1. Mapper phải có test — cùng input, cùng output shape với Mock service
R2. Ảnh/avatar/URL không dùng trực tiếp từ BE — luôn qua appConfig.getImageUrl()
R3. Lỗi mạng và lỗi server tách biệt — UI hiển thị khác nhau
R4. Services không import lẫn nhau — chỉ giao tiếp qua ApiClient
R5. Token chỉ đọc qua TokenStorage — KHÔNG import useAuthStore
R6. Mỗi Real*Service phải registerService() — không sửa file dùng chung
R7. Comment và message UI bằng tiếng Việt
R8. prettier --check và ESLint phải pass trước khi commit
```

### R1 là quan trọng nhất — giải thích vì sao

Khi bạn viết `RealFridgeService` và có test chứng minh mapper cho ra đúng shape,
DEV A sẽ tin rằng data đúng shape và build tiếp mà không cần chạy app.
**Không có test → phải chạy app mới biết → 2 người phải debug lại nhau.**

Test bắt buộc cho mỗi `Real*Service`:

```javascript
// src/data/services/real/__tests__/RealFridgeService.test.js
// 1. Mapper: BE response -> shape UI. Cùng input, cùng output với MockFridgeService
// 2. Error mapping: BE trả 400/403/404/500 -> ApiException đúng message
// 3. Image mapping: BE trả imageUrl -> phải qua getImageUrl()
```

### R2 — `getImageUrl()` không có thì ảnh không hiện mà không có lỗi nào hiện ra

BE dùng **2 host khác nhau**: API ở `api.friggy.io.vn`, file ở `file.friggy.io.vn`.
Bỏ qua bước này là bug khó tìm nhất trong toàn bộ đợt nối BE.

```javascript
// Sai — ảnh tương đối, không host được
image: item.ingredientImagePath

// Đúng
image: appConfig.getImageUrl(item.ingredientImagePath)
```

### R5 — tránh vòng lặp import

```javascript
// SAI — gây circular import
import { useAuthStore } from '../../shared/stores/useAuthStore';

// ĐÚNG
import { TokenStorage } from '../storage/TokenStorage';
```

---

## 4. MẪU BẮT BUỘC

```javascript
import { ApiClient } from '../../api/ApiClient';
import { registerService } from '../../api/ServiceRegistry';
import { appConfig } from '../../../shared/config/appConfig';

export class RealFridgeService {
  constructor() {
    // ApiClient là object export sẵn (đã cấu hình baseURL + interceptor),
    // KHÔNG phải class — không `new ApiClient(...)`.
    this.client = ApiClient;
  }

  /** Map 1 item từ BE sang shape UI — tên field khác hoàn toàn */
  _toFridgeItem(dto) {
    return {
      id: dto.id,
      name: dto.ingredientName,
      image: appConfig.getImageUrl(dto.ingredientImagePath) ?? null,
      quantity: dto.quantity,
      unit: dto.unit,
      // UI đã dùng đúng tên enum của BE cho compartment
      compartment: dto.storageLocation,
      // BE KHÔNG trả `status`, NHƯNG có trả `daysUntilExpiry` đã tính sẵn
      // => ưu tiên giá trị BE, chỉ tự tính khi BE không trả.
      status:
        this._statusFromDays(dto.daysUntilExpiry) ?? this._statusFromExpiryDate(dto.expiresAt),
      expiryDate: dto.expiresAt ?? null,
      daysUntilExpiry: dto.daysUntilExpiry ?? null,
    };
  }

  // ...
}

// Side-effect đăng ký — 1 dòng, không sửa file dùng chung
registerService('fridgeService', new RealFridgeService());
```

**Đăng ký bằng key đúng** — `resolveServices()` duyệt theo key trong `defaultServices`
của `src/data/ServiceProvider.jsx` (file đóng băng). Đăng ký sai key => domain đó
**không bao giờ** chuyển sang thật, vẫn fallback mock mà không báo lỗi nào.

⚠️ **Mẫu cũ ghi `'fridge'` là SAI** (đã sửa 23/10). Key phải khớp `ServiceProvider.jsx`:

| Service | Key đăng ký |
|---|---|
| `RealFridgeService` | `'fridgeService'` |
| `RealScanService` | `'scanService'` |
| `RealRecipeService` | `'recipeService'` *(gồm cả meal-planning — xem Q5)* |
| `RealAiChatService` | `'aiChatService'` |

> Tên file cũng đã chốt: đặt tên `Real<Domain>Service.js` và tự `registerService()`
> trong chính file đó — KHÔNG tách file `real<Domain>.register.js` riêng như
> comment cũ trong `App.jsx` gợi ý (xem `App.jsx:46-47`).

---

## 5. CÁC BẪY ĐÃ BIẾT — ĐỪNG PHÁT HIỆN LẠI

### 5.1 B1 — Filter server-side chỉ có 2 loại (đã verify trực tiếp DTO BE)

`ListFridgeQueryDto` **chỉ nhận** `storageLocation` + `expiringSoon`.
BE **không có** `search`, `sortBy`, `sortDir`, `category`.

| Kế hoạch cũ ghi | BE thực tế | Làm thế nào |
|---|---|---|
| `?search=` | ❌ Không có | **Client-side** trong list đã load |
| `?location=` | ❌ Tên thật là `?storageLocation=` | Enum: `fridge` / `freezer` / `pantry` |
| `?sortBy=` / `?sortDir=` | ❌ Không có | BE hardcode `expiresAt asc, createdAt desc` → sort **client-side** |
| `?expiringSoon=` | ✅ Có | Dùng server-side cho filter "sắp hết hạn" |
| Response `categoryId` | ❌ BE **không trả** | BE trả `ingredientId` + `ingredientName` + `ingredientImagePath` |
| Response `location` | ✅ Tên thật `storageLocation` | Map sang `compartment` của UI |

Quy tắc mapping:

- `compartment`: giữ nguyên enum của BE (`fridge`/`freezer`/`pantry`). UI hiển thị nhãn tiếng Việt
  qua `compartmentLabel`: `fridge`→"Ngăn mát", `freezer`→"Ngăn đông", `pantry`→"Tủ khô"
  (theo nhãn Flutter dùng ở `fridge_inventory_screen.dart:990-993`)
- `status`: BE **không trả `status`** nhưng **có trả `daysUntilExpiry`** đã tính sẵn
  → ưu tiên map từ `daysUntilExpiry`, chỉ tự tính từ `expiresAt` khi BE không trả
- `expired` = client-side lọc `daysUntilExpiry < 0`
- `expiring` = server-side `?expiringSoon=true` (đây là filter server-side duy nhất có sẵn)
- **Search debounce 300ms** — list đã nằm trong RAM, không gọi API mới
- Chỉ gọi lại API khi `storageLocation` / `expiringSoon` đổi
- ✅ **ĐÃ CHỐT 23/10: BỎ chip filter category** — thay bằng 4 pill storage như Flutter.
  Lý do: BE không trả category theo item, phải gọi thêm `/ingredients/categories` + gom hết
  `/ingredients` (2-3 request) rồi join client-side, thêm bảng mapping cứng phân 5 nhóm
  trong khi BE chia nhỏ hơn nhiều. `FridgeItem.jsx` fallback về icon `other`.
- **BE tự tính `expiresAt`** nếu FE không gửi → UI **không bắt buộc** cho nhập hạn dùng
- **UI nên cho chọn `storageLocation`** — 3 pill "Ngăn mát / Ngăn đông / Tủ khô" trong `ManualAddIngredientScreen`.
  State: `const [storageLocation, setStorageLocation] = useState('fridge');`
- **`ManualAddIngredientScreen` cần ingredient picker** — `AddFridgeItemDto` có cả `ingredientId` lẫn `name`
  đều optional, nhưng `fridge.service.ts:141` throw BadRequest nếu không resolve được nguyên liệu
  trong danh mục → UI hiện tại cho nhập tên tự do sẽ lỗi 400. Thêm search theo `GET /ingredients`.
- **`MyFridgesScreen`: BE không có endpoint multi-fridge.** Q3 đã chốt **FOLLOW FLUTTER** —
  giữ 3 tủ giả lập, chỉ gọi thật cho "Tủ Lạnh Gia Đình" (`GET /fridge/stats` + `/family/me`),
  2 tủ còn lại là UI tĩnh. **Đừng** simplify thành 1 tủ như ghi chú cũ trong plan.
- ⚠️ `SafeService.withFallback` chỉ bọc method có trong prototype của `MockFridgeService`.
  Method mới thêm vào real (vd `getFridgeStats` cho B4) sẽ KHÔNG đi qua proxy →
  phải bổ sung vào mock trước khi dùng qua `useServices()`.

### 5.2 B1 — Filter category: ✅ ĐÃ CHỐT 23/10 — BỎ

Đã hỏi DEV A, quyết định cuối: **BỎ chip filter category**, thay bằng 4 pill storage
(Tất cả / Ngăn mát / Ngăn đông / Tủ khô) đúng như Flutter production.

Lý do chọn phương án này cho 1 user thật trên production:
- **0 request thêm** — `storageLocation` BE đã trả sẵn trong `GET /fridge`
- Không cần bảng mapping cứng 5 nhóm (BE chia nhỏ hơn nhiều: "Rau lá xanh", "Củ & Quả",
  "Nấm", "Thịt heo"...; admin đổi tên category là chip đếm sai ngay)
- Flutter đang chạy production cũng chỉ có 4 pill này, dùng `item.storageArea`
- Thông tin vị trí bảo quản hữu ích hơn category: người dùng quan tâm "thịt còn mấy ngày
  nếu để ngăn đông" — và đó đúng là điều BE tính hạn dùng theo (commit `ca5501c`)

Hệ quả: `FridgeItem.jsx` không có `category` → tự fallback về icon `other` (đã viết sẵn ở
`CATEGORY_ICON`/`CATEGORY_COLOR` với key `other` → `Leaf`). **Không cần sửa file đó.**

### 5.3 B3 — ĐỪNG PHÁ `RecipeDetailScreen`

`CookingSuggestionsSection` truyền `routeRecipe` sang detail bằng **object suggestion**,
mà object đó **không có** `ingredients` / `steps` / `description`.

Nếu chỉ đọc từ route param → màn hình chỉ hiện tên món, không hiện công thức.
**Phải fetch full recipe bằng `id`** qua `GET /recipes/{id}`.

Sửa sai chỗ này = quay lại đúng lỗi P0.8 đã mắc phải.

### 5.4 B3 — Mapping lệch shape giữa BE và UI

| BE trả | UI cần |
|---|---|
| `title` | `name` |
| `cookTimeMinutes` | `cookTime` |
| `difficultyLevel` | `difficulty` |
| `matchScore` | `matchPercent` |

Viết mapper `toRecipe()` / `toSuggestion()` để **UI không phải đổi**.

Ngoài ra:
- `GET /recipes` trả **paginated** `{ items, meta }` → service phải trả **flat array** cho UI, giữ `meta` riêng cho phân trang vô hạn
- Difficulty enum BE có thể là `EASY/MEDIUM/HARD` (uppercase) → map sang lowercase cho UI
- Cook-time filter `<15` / `15-30` / `>30` → BE có `maxCookTime` → **gửi lên server**, đừng lọc client
- Detail có `inFridge` / `summary.missingItems` → badge "Có trong tủ" / "Cần mua" cho từng nguyên liệu
- Bookmark: optimistic update + **rollback** nếu API fail

### 5.5 B3 — `CookingSuggestionsSection` KHÔNG dùng `/recipes/suggestions`

Đây là điểm dễ sai nhất. Nguồn dữ liệu là **meal-planning slots**, không phải `/recipes/suggestions`.

Luồng lấy dữ liệu (theo Flutter đang chạy production):

```
GET /meal-planning/plans          → plan đầu tiên
GET /meal-planning/plans/{id}     → dailyPlans[] → lọc dayOfWeek = hôm nay
                                   → mealSlots[]
```

- `MealSlotResponseDto` trả: `{ id, dayOfWeek, mealType, recipeId, recipeName, servings, estimatedCost, note, completedAt }`
- **Sort** `mealSlots` theo `{ breakfast:0, lunch:1, dinner:2, snack:3 }` rồi `.take(3)`
- **`completedAt != null` → badge "Đã nấu"**
- Toggle = `PATCH /meal-planning/slots/{id}` với `{ completed: true }` (optimistic + rollback)
- **`servings` lấy thẳng từ slot** — không cần gọi thêm `/recipes/suggestions` để enrich

⚠️ **Không được lấy nhãn bữa theo `MEAL_SLOTS[index]`** — BE trả theo `dayOfWeek`,
thứ tự không đản bảo là bữa nào. Phải dùng `MEAL_TYPE_BY_KEY[recipe.mealType]`.

`cookTime` **không có trong slot**. Flutter hardcode theo bữa (`breakfast` 15, `lunch` 25, `dinner` 20).
Làm y hệt Flutter, hoặc lấy `cookTimeMinutes` từ `GET /recipes/{id}` nếu không muốn hardcode.

**Q5 đã chốt: giữ chung key `recipe`.** Hook `useRecipeSuggestions` → `recipeService.getSuggestions()`,
mà `useServiceHooks.js` **KHÔNG ĐƯỢC SỬA**. Nên:
- `RealRecipeService` (tạo ở B3) sửa lại ở B4 để thêm `getSuggestions()` đọc meal-planning slots
- **KHÔNG tạo `RealMealPlanningService.js`**

**Sửa typedef `IRecipeService.js` (contract file — bạn được sửa, nhưng phải báo DEV A trước):**

- `RecipeSuggestion`: thêm `mealType` (`'breakfast'|'lunch'|'dinner'|'snack'`), `servings` (number), `cooked` (boolean), `recipeId` (string). Giữ `matchPercent` cho màn hình khác dùng chung.
- `WeeklyStats`: đổi thành `{ mealsCooked, expiringSoonCount, totalSpentThisMonth, wastePercent, totalItems }` — bỏ `week` / `data` / `total` / `previousWeek`.
- Ghi comment trỏ về endpoint thật: `getSuggestions()` → meal-planning slots, `getWeeklyStats()` → `GET /fridge/stats`.
- **Sửa `MockRecipeService.js` cùng lúc** cho khớp typedef, không thì app vỡ ở chế độ mock.

### 5.6 B4 — SSE dùng `fetch` streaming thuần (Q2 đã chốt, KHÔNG dùng `react-native-sse`)

**Lý do kỹ thuất quan trọng nhất của sprint này:** `EventSource` native **không cho set custom header**,
mà endpoint SSE cần `Authorization: Bearer`. Thư viện `react-native-sse` không cần dùng.

React Native 0.86 + Expo 57 có `fetch` streaming. `SseClient.js` dùng `fetch` + `ReadableStream` reader:

```javascript
// Nguyên tắc, khung tương tự Flutter `Mobile/lib/data/services/ai_chat_service.dart`
const response = await fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'text/event-stream',
  },
});
// Parse từng dòng, bỏ qua comment ':' và event rỗng
```

Bắt buộc:

1. **Phải giữ logic `_normalizeSsePayload`** — BE có NestJS interceptor bọc `{ statusCode, message, data }`, phải unwrap **2 cấp**
2. Kết thúc stream khi `event === 'done' || event === 'error'`
3. `fetch()` trong RN **cho phép set header `Authorization`** — giải quyết triệt để vấn đề của EventSource

### 5.7 B4 — Các điểm còn lại

- **`WeeklyStatisticsSection` dùng `GET /fridge/stats`, KHÔNG phải `/fridge/stats/chart`.**
  BE trả `FridgeStatsResponseDto`: `{ totalSpentThisMonth, wastePercent, mealsCooked, expiringSoonCount, totalItems }`.
  UI hiện tại dùng 2 stat card: `cookedCount` ← `mealsCooked`, `attentionCount` ← `expiringSoonCount`.
  `RealFridgeService.getFridgeStats()` (viết ở B1) trả đúng shape này — không cần mapper phức tạp.
  Chỉ cần đổi typedef `WeeklyStats` trong `IRecipeService.js`.
- **Component đọc `mealType` từ `MealSlot`, đã bỏ `MEAL_SLOTS[index]` ở B3.**
- **AI chat flow 2 bước**: `POST /ai-chat/sessions/{id}/messages` (202) → mở SSE `/stream` → nhận token → render streaming.
  Quản lý `sessionId` trong state, kiểm tra **429** (AI usage limit).
- **`MessageBubble`** hiển thị typed states: `sending` / `streaming` / `done` / `error`, có token đang đến.
- **`DayPlanCard`** hiển thị 7 ngày × 3 bữa. Tap slot → `GET /meal-planning/slots/{id}` chi tiết + phân tích tủ lạnh.
- **Đóng màn hình giữa chừng thì SSE phải đóng**, không memory leak — áp dụng cho cả B2 (poll) và B4 (stream).
- **Poll B2** phải có **exponential backoff**, max 60s, xử lý 3 trạng thái `processing` / `done` / `failed`.
- **Confirm scan** cần `ingredientId` — nếu AI không match ingredient catalog thì cho user chọn từ `GET /ingredients`.
- **UI trạng thái AI limit (429)**: hiện thành "bạn đã dùng hết lượt AI tuần này".

---

## 6. AN TOÀN DEMO

Phase 0 đã bọc `SafeService.withFallback()` cho mọi real service. Nguyên tắc bạn phải nhớ:

| Tình huống | Hành vi |
|---|---|
| BE trả **5xx** hoặc lỗi mạng | **Fallback mock** — app vẫn chạy, có `console.warn` kèm label |
| BE trả **4xx** (400/401/403/422) | **KHÔNG fallback** — phải ném lên để UI hiện lỗi thật cho user |
| BE trả **data rỗng** | **KHÔNG fallback** — data rỗng là trạng thái hợp lệ, phải hiện `EmptyState` |
| Token hết hạn | `ApiClient` xử lý refresh; không refresh được → emit session-expired |

Suy ra từ đó:
- **Đừng** để `SafeService` fallback khi lỗi do người dùng — sẽ hiện dữ liệu giả thành công
- Tắt fallback để debug lỗi thật: `EXPO_PUBLIC_SAFE_FALLBACK=false`
- Bật toàn bộ mock: `EXPO_PUBLIC_USE_MOCKS=true`

---

## 7. NGUỒN SỰ THẬT KHI MÂU THUẪN

Khi plan, Swagger và code BE không khớp nhau, theo thứ tự ưu tiên này:

1. **BE thực tế thắng** — đọc `be/src/modules-api/<module>/dto/*.dto.ts` là nguồn chân lý
2. **Swagger production** xác nhận: `https://api.io.vn/api/docs-json`
3. **Flutter đã chạy production** làm mẫu UX — `Mobile/lib/...`
4. **Plan** — nếu sai so với 1–2 thì plan cần sửa

Nếu không chắc chắn → **`AskQuestion` hỏi DEV A, không tự quyết.**
Quy tắc đã chốt không cần hỏi lại: Q1 (Google Sign-In), Q2 (SSE fetch), Q3 (multi-fridge theo Flutter), Q4 (giữ `USE_MOCKS`), Q5 (chung key `recipe`).

---

## 8. QUY TRÌNH LÀM VIỆC

### 8.1 Trước khi code

- Xác nhận 5 điều kiện ở **Bước 1**
- Đọc hạ tầng ở **Bước 3**
- Nếu gặp điểm chưa chốt trong plan → hỏi DEV A, **chưa code**

### 8.2 Trong lúc code

- 1 sprint tại 1 thời điểm
- `AskQuestion` khi phát hiện plan sai — **sửa plan trước rồi mới tiếp tục code**
- Không tự thêm hạng mục ngoài plan
- Comment và message UI bằng tiếng Việt

### 8.3 Trước khi mở PR

```powershell
cd mobile-native
npx prettier --check "src/**/*.{js,jsx}"
npm run lint
npx jest
```

Ghi kèm vào PR:
- [ ] Test mục 9b.4 của sprint đã chạy, số lượng đạt yêu cầu
- [ ] Checklist của sprint đã tick, **có ảnh chụp màn hình**
- [ ] Kết quả `prettier --check` + `lint` + `jest`
- [ ] Danh sách endpoint đã nối, đối chiếu với Swagger
- [ ] Mọi điểm lệch so với plan đã được báo trước và được DEV A đồng ý

### 8.4 Quy tắc merge (9 điểm)

1. Branch riêng: `feat/mobile-be-devA` và `feat/mobile-be-devB`
2. Phase 0 merge vào `main` **trước**, bắt buộc — mỗi người pull về branch mình
3. Mỗi sprint: 1 PR, **không làm 2 sprint cùng lúc**
4. Conflict ở 2 file immutable → `git checkout --ours/--theirs`, **không merge thủ công**
5. Mỗi sprint xong: **hỏi DEV A xác nhận** trước khi bắt đầu sprint sau
6. Mỗi sprint phải có test checklist **đã chạy thử** kèm ảnh chụp màn hình
7. Cả hai chạy app với `EXPO_PUBLIC_API_BASE_URL` trỏ cùng BE dev → kiểm tra cross-feature
8. **Không refactor file người khác đang sửa. Gặp bug ở file người khác → báo lại, không tự sửa**
9. PR không có file test tương ứng → không merge được

### 8.5 Báo cáo trung thực

| Tình huống | Cách báo |
|---|---|
| Bước **chưa xong** | Nói "chưa xong" — **KHÔNG** nói "xong phần lớn" |
| Gặp khó khăn | Báo **ngay** để chỉnh effort — **KHÔNG** tự giảm quy mô cho vừa |
| Phát hiện plan sai | Báo ra, **sửa plan trước** rồi mới code tiếp |

Tiến độ được tính trên **checklist đã chốt trong plan**, không tự chọn tiêu chí.

### 8.6 Những thứ KHÔNG cần test (để tiết kiệm thời gian)

Theo mục 9b.5 — đọc để không viết thừa. Nguyên tắc: **chỉ test mapper, error mapping, image mapping**.
Không test component render, không test navigation, không test style.

---

## 9. NHẮC NHỞ VỀ `prettier` VÀ `ESLint` (NỢ ĐANG TồN TẠI)

Trước khi Phase 0, repo có **124 file chưa format** và **104 lỗi lint** — tất cả đều là
code có sẵn từ trước, không phải do Phase 0 tạo ra.

Đây là quyết định còn treo, DEV A cần chốt trước khi bạn bắt đầu:

| Phương án | Ưu | Nhược |
|---|---|---|
| (a) Format cả 124 file ngay | `--check` pass ngay | Diff khổng lồ, khó review |
| (b) Mỗi sprint format file của mình trước khi làm | Cân bằng | `--check` vẫn đỏ vì file người khác |
| (c) Bỏ qua, chấp nhận không đạt | Nhanh nhất | R8 không bao giờ pass |

⚠️ **Cảnh báo thực tế:** nếu 2 người chạy prettier trên cùng file chưa format,
`git` sẽ conflict ngay trên file đang sửa. Đây là rủi ro thực tế của phương án (c).

**✅ DEV A đã chốt: (b)** — mỗi sprint format file trong phạm vi mình trước khi làm.
Khi đó `git status` của bạn chỉ hiện file của bạn đang sửa.

---

## 10. NHỮNG THỨ CHƯA CHỐT — CẦN DEV A TRẢ LỜI

| # | Câu hỏi | Ảnh hưởng | Trạng thái |
|---|---|---|---|
| 1 | B1: giữ hay bỏ nút filter category? | +1 request khi load | ✅ **ĐÃ CHỐT: BỎ** (xem Mục 5.2) |
| 2 | Tài khoản test đăng nhập | Không test được end-to-end | `[Chờ]` |
| 3 | `EXPO_PUBLIC_API_BASE_URL` của BE dev dùng chung | Quy tắc merge số 7 | ✅ **ĐÃ CHỐT: dùng production** `https://api.friggy.io.vn/api/v1` |
| 4 | Prettier: phương án (a) / (b) / (c)? | Mục 9 | ✅ **ĐÃ CHỐT: (b)** |
| 5 | Thứ tự sprint: B1 → B2 → B3 → B4? | Thứ tự commit | `[Chờ]` |

### Ghi nhận thêm 23/10 (do DEV B phát hiện khi đọc code thật)

| # | Phát hiện | Xử lý |
|---|---|---|
| 6 | Mục 4 mẫu `registerService('fridge', ...)` — **SAI**, phải là `'fridgeService'` (khớp `defaultServices` trong `ServiceProvider.jsx`) | ✅ Đã sửa Mục 4 |
| 7 | Mẫu `new ApiClient(appConfig.API_BASE_URL)` — `ApiClient` là **object export sẵn**, không phải class | ✅ Đã sửa Mục 4 |
| 8 | `App.jsx:46-47` gợi ý tách file `real<Domain>.register.js` — không cần, tự `registerService()` trong file service là đủ | ✅ Đã sửa Mục 4 |
| 9 | Mục 5.1 nói BE "không tính sẵn status → reuse `_computeStatus` từ mock" — thực tế BE **có trả `daysUntilExpiry` đã tính sẵn** | ✅ Đã sửa Mục 5.1, ưu tiên giá trị BE |
| 10 | `SafeService` chỉ bọc method có trong prototype của mock → method mới trong real sẽ không qua proxy | ✅ Ghi chú ở Mục 5.1 |

---

## 11. NHÁNH LỆNH THAM KHẢO

```powershell
# Xem trạng thái
cd C:\Users\Admin\Desktop\Project\Friggy
git status
git log --oneline -5

# Chạy test
cd mobile-native
npx jest
npx jest src/data/services/real          # chỉ test real service

# Chạy app
npx expo start

# Bật mock toàn bộ
$env:EXPO_PUBLIC_USE_MOCKS="true"

# Tắt fallback để thấy lỗi thật
$env:EXPO_PUBLIC_SAFE_FALLBACK="false"

# Đọc Swagger
# https://api.friggy.io.vn/api/docs
# https://api.friggy.io.vn/api/docs-json
```

---

## 12. CÁCH BẮT ĐẦU NGAY

Sau khi đọc hết Mục 0–11 và nhận đủ 5 câu trả lời ở **Mục 10**:

1. Xác nhận 5 điều kiện ở **Bước 1**
2. Bắt đầu **B1** — đọc lại Mục 5.1 và Mục 5.2 trước khi code
3. Dừng lại sau mỗi sprint, hỏi DEV A xác nhận (quy tắc merge số 5)

**Báo lại cho DEV A khi bắt đầu và khi kết thúc mỗi sprint.**

 NGHIÊM CẤM KHÔNG SỬ DỤNG CÁC LỆNH LIÊN QUAN ĐẾN COMMIT ADD HAY PUSH, CHỈ ĐƯỢC SỬ DỤNG CÁC LỆNH GIT ĐỂ CHECK/KIỂM TRA, ĐỌC, QUÁ TRÌNH ADD/COMMIT/CHECKOUT HAY PÚH SẼ DO USER TỰ LÀM