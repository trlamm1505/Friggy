# P0.7 - CHECKLIST KIỂM CHỨNG BẰNG TAY

> **Các mục trong file này KHÔNG THỂ kiểm bằng test tĩnh.**
> Cần người chạy app thật trên Expo và nhìn màn hình.
>
> Lý do: `jest-expo` không render được cây component đầy đủ (Google Fonts,
> react-navigation, expo-linear-gradient, video... đều cần native runtime).
> Test pass KHÔNG đồng nghĩa với app chạy được - đây chính là cái bẫy
> mà cam kết mục 0 đã cảnh báo: *"Màn hình chạy được với mock ≠ đã xong"*.

**Ngày cập nhật:** 22/10/2026
**Trạng thái:** 🟡 SỬA LỖI P0.8 — cần user xác nhận lại sau khi reload

## Kết quả kiểm chứng 22/10

User chạy app thật và báo 3 lỗi còn lại (ngoài các mục đã đạt):

### P0.8.1 — Bấm "Xem công thức" chỉ hiện tên + số người, không hiện công thức

**Nguyên nhân (2 tầng):**

1. `src/shared/mocks/cooking-suggestions.json` có id `s1`–`s4`, còn
   `src/shared/mocks/recipes.json` có id `r1`–`r3` → `MockRecipeService.getRecipeById('s1')`
   luôn trả `null`. Detail rơi về `FALLBACK_RECIPE` hoặc render rỗng.
2. `RecipeDetailScreen` ưu tiên `routeRecipe` (chỉ là object suggestion, **không có**
   `ingredients`/`steps`) hơn `fetchedRecipe` → `recipe.steps.map()` / `recipe.ingredients.map()`
   gọi trên `undefined` → *"Cannot read property 'map' of undefined"* (log dòng 202).

**Đã sửa:**

- `cooking-suggestions.json`: đổi id sang `r1`–`r4`, thêm `servings` + `cooked`.
- `recipes.json`: thêm `r4` (Salad cà chua), đổi tên `r3` cho khớp suggestion.
- `RecipeDetailScreen.jsx`: đảo thứ tự ưu tiên — `fetchedRecipe` > `routeRecipe` (chỉ khi có
  `ingredients`) > `FALLBACK_RECIPE`. Đồng bộ điều kiện `loading`/`error` theo `recipe.ingredients`.

### P0.8.2 — Warning "Each child in a list should have a unique key prop" (SegmentedControl)

**Nguyên nhân:** `SegmentedControl` dùng `key={opt.value}` + so sánh `selected === opt.value`,
nhưng `RecipeDetailScreen` và `IngredientStatisticsScreen` truyền options dạng `{ key, label }`
với props `selectedKey`/`onSelect` → `opt.value` là `undefined` cho mọi item → React không
lấy được key → cảnh báo.

**Đã sửa:** `SegmentedControl` đổi API chuẩn hoá sang `key`/`selectedKey`/`onSelect`
(fallback index nếu option không có `key`). Cập nhật 3 call site dùng API cũ:
`AppSettingsScreen` (theme + language), `PersonalInfoScreen` (gender).

### P0.8.3 — Warning "The action 'RESET' ... was not handled by any navigator"

**Nguyên nhân:** `OnboardingSurveyScreen` gọi `navigation.reset({ routes: [{ name: 'MainFlow' }] })`
ngay sau `completeOnboarding()`. `completeOnboarding()` set `isOnboarded` trong `useAuthStore` →
`RootNavigator` re-render thay `OnboardingFlow` bằng `MainFlow` → action RESET bay vào stack
đã bị thay nên không có navigator nào xử lý.

**Đã sửa:** bỏ cả 2 `navigation.reset` (ở `handleNext` và `handleSkip`), giữ nguyên logic store.
Dọn luôn import `useNavigation` không còn dùng.

**Lưu ý:** warning `GO_BACK was not handled by any navigator` cũng xuất hiện trong log.
Nguyên nhân là bấm nút back ở màn hình gốc của 1 tab (đã có guard ở `FridgeInventoryScreen`).
Cần xác minh lại sau khi reload — nếu còn thì báo tôi để truy đúng màn.

**Kết quả test sau khi sửa:** 222/222 pass, eslint sạch.

---

## Kết quả kiểm chứng 21/10

### Mục C: App chạy UI đủ — đã đăng nhập + onboarding xong → **PHÁT HIỆN LỖI**

App chạy được đến Home, gặp 2 lỗi:

1. `RESET action not handled by any navigator` — warning, không chặn app
2. **`TypeError: Cannot read property 'getBackground' of undefined`** — crash

Nguyên nhân: 3 file import `AppGradients` từ `theme/colors` (sai) thay vì `theme/gradients`:

- `src/presentation/screens/home/HomeScreen.jsx`
- `src/presentation/screens/fridge/FridgeInventoryScreen.jsx`
- `src/presentation/screens/profile/UserProfileScreen.jsx`

**Đã sửa + viết test** (`P071ImportContracts.test.js`, 12 case). Phase 0 hiện 212/212 pass.

### NGUYÊN TẮC — đã chứng minh bằng log

200 test pass KHÔNG đồng nghĩa runtime đúng. `jest-expo` không render được cây component có LinearGradient, SafeAreaInsets, react-navigation. Chỉ khi người dùng chạy app thật mới lộ.

---

## A. Điều kiện trước khi bắt đầu

- [ ] Node + Expo CLI hoạt động (`node -v`)
- [ ] `.env` có `EXPO_PUBLIC_USE_MOCKS=false` (mặc định hiện tại)
- [ ] Chạy `npm test` → **212 test pass** (200 + 12 P0.7.1)

---

## B. Mục 1 — App chạy, UI hiện đủ, không lỗi

**Cách kiểm:** `npx expo start` → mở app, xem qua các màn hình.

- [x] App khởi động, không crash trắng màn hình
- [x] Splash → Login hiện đúng
- [x] Đăng nhập bằng tài khoản mock hoạt động
- [x] Home hiện: Greeting, FridgeSummary (2 card), Premium banner, Weekly stats, Cooking suggestions
- [ ] Bấm "Xem công thức" ở Home → mở `RecipeDetailScreen` **hiện đầy đủ nguyên liệu + các bước** (P0.8.1 — trước đó chỉ hiện tên + số người)
- [ ] Mở Công thức qua tab → bấm 1 món → cũng hiện đầy đủ công thức
- [ ] Console **KHÔNG CÒN** lỗi `Cannot read property 'map'/'length' of undefined` (P0.8.1)
- [ ] Console **KHÔNG CÒN** warning `Each child in a list should have a unique "key" prop` (P0.8.2)
- [ ] Console **KHÔNG CÒN** warning `The action 'RESET' ... was not handled by any navigator` (P0.8.3)
- [ ] Tab công thức: đổi 4 tab (Nguyên liệu / Cách nấu / Dinh dưỡng / Mẹo) → **tab đang chọn phải được tô đậm**, không phải tab nào cũng sáng (P0.8.2)
- [x] **Không có màn hình trắng** ở bất kỳ tab nào
- [x] **Không có lỗi `Cannot read property 'getBackground' of undefined` trong log** (đã sửa ở P0.7.1)
- [ ] **Console không có lỗi đỏ** — còn 3 lỗi, đã sửa ở P0.8 (dòng 202: `map of undefined`,
      `length of undefined`, `unique key prop`, `RESET not handled`) — **cần reload xác nhận lại**

> **Đây là mục quan trọng nhất.** 222 test pass KHÔNG bảo đảm mục này.

### C11 — Sau khi sửa P0.7.1 (AppGradients import), test lại 3 tab dùng gradient

- [ ] Tab "Tủ lạnh" (`FridgeInventoryScreen`) - render được, có data
- [ ] Tab "Hồ sơ" (`UserProfileScreen`) - render được, có data
- [ ] Home (`HomeScreen`) - render được (đã verify ở C, nhưng giờ chắc chắn)

> Nếu 3 tab này còn crash, có thể còn file khác cùng lỗi. Báo tôi.

### C12 — UI không bị lỗi hiển thị (sửa P0.7.2: bỏ gradient, dùng nền theme)

**Bằng chứng lỗi UI 21/10 từ 3 ảnh:** gradient khiến ranh giới với header trắng bị rỗng/rách, status bar trắng mất cân, header pill kẹt dưới tai thỏ.

- [x] Background 3 màn hình (Home, Tủ lạnh, Hồ sơ) là **màu đơn theo theme** (xanh nhạt light / xanh đậm dark), KHÔNG còn gradient
- [x] Không còn viền ranh giới giữa header và thân màn hình
- [x] Status bar / tai thỏ có chừa chỗ (header không bị che)
- [x] Bấm Đăng xuất ở Hồ sơ → quay lại Login **KHÔNG CÒN warning** `The action 'RESET' ... was not handled by any navigator` (sửa ở RootNavigator + UserProfileScreen)

---

## C. Mục 2 — Bật `USE_MOCKS=true` → SQLite có dữ liệu seed

**Cách kiểm:** đổi `.env` → `EXPO_PUBLIC_USE_MOCKS=true`, restart app.

- [x] App khởi động, seed chạy không lỗi
- [x] Tủ lạnh hiện **nhiều món** (không phải EmptyState)
- [x] Công thức hiện danh sách món ăn
- [x] Thông báo hiện dữ liệu mẫu
- [x] Dữ liệu **giống nhau sau mỗi lần mở app** (đọc từ SQLite, không phải random mỗi render)

> **Sau khi xong:** đổi lại `EXPO_PUBLIC_USE_MOCKS=false`.

---

## D. Mục 3 — `USE_MOCKS=false` → tự fallback mock, app vẫn chạy

**Cách kiểm:** `.env` về `false` (mặc định), restart app.

- [x] App chạy bình thường, **không trắng màn hình** dù chưa có Real*Service nào
- [x] Mọi màn hình có dữ liệu mock (đúng như mục B)
- [x] Đây là bằng chứng `resolveServices` tự fallback (đã có 29 test nhưng cần xác nhận trên máy)

### B11 / D11 — Sau onboarding survey, Home hiện đủ (sửa lỗi P0.7.1)

**Bằng chứng runtime đã thấy 21/10 trước khi sửa:** app chạy đến Home → crash với `getBackground`. Sau khi sửa P0.7.1 cần test lại:

- [x] Hoàn thành onboarding survey (chọn vài option → bấm Tiếp tục)
- [x] Sau onboarding, tự động vào Home
- [x] Home hiện: greeting, summary cards, banner premium, weekly stats, cooking suggestions
- [x] **Không có lỗi `getBackground of undefined`** (nếu app còn lưu state cũ, cần reload từ đầu)

---

## E. Mục 4 — BE tắt / sai URL → app vẫn hiện mock data

**Cách kiểm:** sửa `.env` → `EXPO_PUBLIC_API_BASE_URL=http://localhost:9999/api/v1` (port không có gì), restart.

- [x] **KHÔNG** trắng màn hình
- [x] **KHÔNG** hiện màn hình lỗi chiếm hết UI
- [x] Vẫn thấy dữ liệu mock
- [x] Console có log cảnh báo (OK — đó là fallback đang hoạt động)

> Đây là kiểm chứng thật của P0.6b. 41 test SafeService chỉ chứng minh logic,
> mục này chứng minh nó hoạt động trên thiết bị.

**Sau khi xong:** trả `.env` về `https://api.friggy.io.vn/api/v1`.

---

## F. Mục 5 — Toggle runtime không cần rebuild (P0.6e)

**Cách kiểm:** gắn `<ServiceDebugCard />` vào 1 screen tạm, `USE_MOCKS=false`, chạy app.

- [x] Card hiện `Mode: REAL (theo env)`
- [x] Bấm **"Bật mock"** → đổi thành `Mode: MOCK (đã toggle)` **ngay, không reload app**
- [x] Bấm **"Dùng thật"** → về `Mode: REAL (đã toggle)`
- [x] Dữ liệu trên màn hình đổi theo (nếu có real service đăng ký)
- [x] Test Services hiện số liệu không lỗi

> ⚠️ Ở production build nút này **phải biến mất** (19 test đã khoá hành vi này).
> Chưa cần verify bằng build thật ở Phase 0 - test đã đảm bảo.

---

## G. Xác nhận cuối

- [ ] Mục B → B11 → C → C11 → C12 → D → D11 → E → F chạy đúng thứ tự (đổi .env giữa mỗi mục)
- [x] `.env` đã trả về đúng trạng thái ban đầu
- [x] Không có file nào bị sửa ngoài danh sách cho phép

---

## Khi nào Phase 0 coi là XONG?

Đủ **Cả 2** điều kiện:

1. ✅ **Tất cả test pass** — **222 test** (200 + 12 P0.7.1 + 2 P0.7.2 + 8 P0.8), `npx jest`
2. ⬜ **Checklist này được tick hết** — còn lại **mục B** (7 ô chưa tick, trong đó 5 ô là của
   P0.8 cần reload xác nhận lại)

Nếu thiếu 1 trong 2 → **Phase 0 chưa xong**, chưa được bắt đầu Sprint A1/B1.

> Lý do: Sprint A1 thay auth mock bằng BE thật. Nếu P0.6b/P0.6c + P0.7.1 + P0.8 chưa được
> kiểm chứng trên máy thật, lỗi sẽ lộ ra giữa sprint — đúng cái bài học
> đã nêu ở cam kết mục 0. **P0.7.1 và P0.8 chứng minh điều đó**: 222 test xanh
> nhưng app vẫn lỗi runtime — chỉ người chạy app mới phát hiện.

---

**Người kiểm:** ____________  **Ngày:** ____________
**Kết quả:** ☐ Đạt   ☐ Không đạt — mô tả: ____________________

---

## File đã sửa ở P0.8

| File | Sửa gì |
|---|---|
| `src/shared/mocks/cooking-suggestions.json` | id `s1`-`s4` → `r1`-`r4` (khớp `recipes.json`), thêm `servings`, `cooked` |
| `src/shared/mocks/recipes.json` | thêm `r4`, đổi tên `r3` cho khớp suggestion |
| `src/presentation/screens/recipe/RecipeDetailScreen.jsx` | ưu tiên `fetchedRecipe` hơn `routeRecipe`; đồng bộ guard `loading`/`error` |
| `src/presentation/components/common/SegmentedControl.jsx` | API chuẩn hoá `key`/`selectedKey`/`onSelect` (fallback index) |
| `src/presentation/screens/profile/AppSettingsScreen.jsx` | `themeOptions`/`languageOptions`: `value` → `key`; props mới |
| `src/presentation/screens/profile/PersonalInfoScreen.jsx` | `genderOptions`: `value` → `key`; props mới |
| `src/presentation/screens/onboarding/OnboardingSurveyScreen.jsx` | bỏ 2 `navigation.reset`, dọn import `useNavigation` |

> **Lưu ý khi nối API thật (B3):** `SegmentedControl` không liên quan API. Còn mock id `r1`-`r4`
> chỉ là dữ liệu giả — khi dùng `RealRecipeService`, id sẽ là UUID thật từ BE.