# P0.7 - CHECKLIST KIỂM CHỨNG BẰNG TAY

> **Các mục trong file này KHÔNG THỂ kiểm bằng test tĩnh.**
> Cần người chạy app thật trên Expo và nhìn màn hình.
>
> Lý do: `jest-expo` không render được cây component đầy đủ (Google Fonts,
> react-navigation, expo-linear-gradient, video... đều cần native runtime).
> Test pass KHÔNG đồng nghĩa với app chạy được - đây chính là cái bẫy
> mà cam kết mục 0 đã cảnh báo: *"Màn hình chạy được với mock ≠ đã xong"*.

**Ngày lập:** 21/10/2026
**Trạng thái:** 🟡 CHỜ KIỂM CHỨNG (đã sửa lỗi P0.7.1 import AppGradients)

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

- [ ] App khởi động, không crash trắng màn hình
- [ ] Splash → Login hiện đúng
- [ ] Đăng nhập bằng tài khoản mock hoạt động
- [ ] Home hiện: Greeting, FridgeSummary (2 card), Premium banner, Weekly stats, Cooking suggestions
- [ ] Mở được: Tủ lạnh / Công thức / Thông báo / Hồ sơ (4 tab dưới)
- [ ] **Không có màn hình trắng** ở bất kỳ tab nào
- [ ] **Không có lỗi `Cannot read property 'getBackground' of undefined` trong log** (đã sửa ở P0.7.1)
- [ ] Console không có lỗi đỏ

> **Đây là mục quan trọng nhất.** 212 test pass KHÔNG bảo đảm mục này.

### C11 — Sau khi sửa P0.7.1 (AppGradients import), test lại 3 tab dùng gradient

- [ ] Tab "Tủ lạnh" (`FridgeInventoryScreen`) - render được, có data
- [ ] Tab "Hồ sơ" (`UserProfileScreen`) - render được, có data
- [ ] Home (`HomeScreen`) - render được (đã verify ở C, nhưng giờ chắc chắn)

> Nếu 3 tab này còn crash, có thể còn file khác cùng lỗi. Báo tôi.

### C12 — UI không bị lỗi hiển thị (sửa P0.7.2: bỏ gradient, dùng nền theme)

**Bằng chứng lỗi UI 21/10 từ 3 ảnh:** gradient khiến ranh giới với header trắng bị rỗng/rách, status bar trắng mất cân, header pill kẹt dưới tai thỏ.

- [ ] Background 3 màn hình (Home, Tủ lạnh, Hồ sơ) là **màu đơn theo theme** (xanh nhạt light / xanh đậm dark), KHÔNG còn gradient
- [ ] Không còn viền ranh giới giữa header và thân màn hình
- [ ] Status bar / tai thỏ có chừa chỗ (header không bị che)
- [ ] Bấm Đăng xuất ở Hồ sơ → quay lại Login **KHÔNG CÒN warning** `The action 'RESET' ... was not handled by any navigator` (sửa ở RootNavigator + UserProfileScreen)

---

## C. Mục 2 — Bật `USE_MOCKS=true` → SQLite có dữ liệu seed

**Cách kiểm:** đổi `.env` → `EXPO_PUBLIC_USE_MOCKS=true`, restart app.

- [ ] App khởi động, seed chạy không lỗi
- [ ] Tủ lạnh hiện **nhiều món** (không phải EmptyState)
- [ ] Công thức hiện danh sách món ăn
- [ ] Thông báo hiện dữ liệu mẫu
- [ ] Dữ liệu **giống nhau sau mỗi lần mở app** (đọc từ SQLite, không phải random mỗi render)

> **Sau khi xong:** đổi lại `EXPO_PUBLIC_USE_MOCKS=false`.

---

## D. Mục 3 — `USE_MOCKS=false` → tự fallback mock, app vẫn chạy

**Cách kiểm:** `.env` về `false` (mặc định), restart app.

- [ ] App chạy bình thường, **không trắng màn hình** dù chưa có Real*Service nào
- [ ] Mọi màn hình có dữ liệu mock (đúng như mục B)
- [ ] Đây là bằng chứng `resolveServices` tự fallback (đã có 29 test nhưng cần xác nhận trên máy)

### B11 / D11 — Sau onboarding survey, Home hiện đủ (sửa lỗi P0.7.1)

**Bằng chứng runtime đã thấy 21/10 trước khi sửa:** app chạy đến Home → crash với `getBackground`. Sau khi sửa P0.7.1 cần test lại:

- [ ] Hoàn thành onboarding survey (chọn vài option → bấm Tiếp tục)
- [ ] Sau onboarding, tự động vào Home
- [ ] Home hiện: greeting, summary cards, banner premium, weekly stats, cooking suggestions
- [ ] **Không có lỗi `getBackground of undefined`** (nếu app còn lưu state cũ, cần reload từ đầu)

---

## E. Mục 4 — BE tắt / sai URL → app vẫn hiện mock data

**Cách kiểm:** sửa `.env` → `EXPO_PUBLIC_API_BASE_URL=http://localhost:9999/api/v1` (port không có gì), restart.

- [ ] **KHÔNG** trắng màn hình
- [ ] **KHÔNG** hiện màn hình lỗi chiếm hết UI
- [ ] Vẫn thấy dữ liệu mock
- [ ] Console có log cảnh báo (OK — đó là fallback đang hoạt động)

> Đây là kiểm chứng thật của P0.6b. 41 test SafeService chỉ chứng minh logic,
> mục này chứng minh nó hoạt động trên thiết bị.

**Sau khi xong:** trả `.env` về `https://api.friggy.io.vn/api/v1`.

---

## F. Mục 5 — Toggle runtime không cần rebuild (P0.6e)

**Cách kiểm:** gắn `<ServiceDebugCard />` vào 1 screen tạm, `USE_MOCKS=false`, chạy app.

- [ ] Card hiện `Mode: REAL (theo env)`
- [ ] Bấm **"Bật mock"** → đổi thành `Mode: MOCK (đã toggle)` **ngay, không reload app**
- [ ] Bấm **"Dùng thật"** → về `Mode: REAL (đã toggle)`
- [ ] Dữ liệu trên màn hình đổi theo (nếu có real service đăng ký)
- [ ] Test Services hiện số liệu không lỗi

> ⚠️ Ở production build nút này **phải biến mất** (19 test đã khoá hành vi này).
> Chưa cần verify bằng build thật ở Phase 0 - test đã đảm bảo.

---

## G. Xác nhận cuối

- [ ] Mục B → B11 → C → C11 → C12 → D → D11 → E → F chạy đúng thứ tự (đổi .env giữa mỗi mục)
- [ ] `.env` đã trả về đúng trạng thái ban đầu
- [ ] Không có file nào bị sửa ngoài danh sách cho phép

---

## Khi nào Phase 0 coi là XONG?

Đủ **Cả 2** điều kiện:

1. ✅ **Tất cả test pass** — **214 test** (200 + 12 P0.7.1 + 2 P0.7.2), `npx jest`
2. ✅ **Checklist này được tick hết** (mục B, B11, C, C11, C12, D, D11, E, F)

Nếu thiếu 1 trong 2 → **Phase 0 chưa xong**, chưa được bắt đầu Sprint A1/B1.

> Lý do: Sprint A1 thay auth mock bằng BE thật. Nếu P0.6b/P0.6c + P0.7.1 chưa được
> kiểm chứng trên máy thật, lỗi sẽ lộ ra giữa sprint — đúng cái bài học
> đã nêu ở cam kết mục 0. **P0.7.1 chứng minh điều đó**: 200 test xanh
> nhưng app vẫn crash runtime — chỉ người chạy app mới phát hiện.

---

**Người kiểm:** ____________  **Ngày:** ____________
**Kết quả:** ☐ Đạt   ☐ Không đạt — mô tả: ____________________