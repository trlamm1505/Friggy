# FRIGGY — Docker Command Reference

> Tất cả lệnh chạy từ thư mục root: `D:\Friggy\`
> `.env.docker` được khai báo trong từng service — không cần flag `--env-file`

---

## 🚀 Build & Run

### Toàn bộ stack (lần đầu hoặc sau khi thay đổi code)
```bash
docker compose up -d --build
```

### Toàn bộ stack (không build lại, chỉ start)
```bash
docker compose up -d
```

### Build từng service riêng lẻ
```bash
# BE (Main Backend)
docker compose up -d --build be

# AI Service
docker compose up -d --build ai-service

# Email Service
docker compose up -d --build email-service
```

### Chỉ build image (không start container)
```bash
docker compose build be
docker compose build ai-service
docker compose build email-service

# Build tất cả cùng lúc
docker compose build
```

---

## 🛑 Stop & Remove

### Dừng tất cả container
```bash
docker compose stop
```

### Dừng và xóa container (giữ volumes)
```bash
docker compose down
```

### Dừng, xóa container + xóa volumes (⚠️ mất data DB)
```bash
docker compose down -v
```

---

## 🔄 Restart

### Restart toàn bộ
```bash
docker compose restart
```

### Restart từng service
```bash
docker compose restart be
docker compose restart ai-service
docker compose restart email-service
```

---

## 📋 Logs

### Xem log toàn bộ (real-time)
```bash
docker compose logs -f
```

### Xem log từng service
```bash
docker compose logs -f be
docker compose logs -f ai-service
docker compose logs -f email-service
docker compose logs -f mysql
docker compose logs -f rabbitmq
```

### Xem 100 dòng log gần nhất
```bash
docker compose logs --tail=100 be
```

---

## 🔍 Kiểm tra trạng thái

### Xem status tất cả container
```bash
docker compose ps
```

### Xem tài nguyên CPU/RAM
```bash
docker stats
```

---

## 🔧 Truy cập container

### Vào shell trong container
```bash
docker exec -it con-friggy-be sh
docker exec -it con-friggy-ai sh
docker exec -it con-friggy-email sh
docker exec -it con-friggy-mysql sh
```

### Chạy Prisma migrate thủ công trong BE
```bash
docker exec -it con-friggy-be node_modules/.bin/prisma migrate deploy
```

### Chạy seed SQL thủ công
```bash
docker exec -i con-friggy-mysql mysql -u root -pYOUR_PASSWORD Friggy < ./be/prisma/seed.sql
```

---

## 🧹 Dọn dẹp

### Xóa image không dùng
```bash
docker image prune -f
```

### Xóa toàn bộ (container + image + volume không dùng)
```bash
docker system prune -a --volumes
```

---

## 📌 Lưu ý

- **Lần đầu deploy:** MySQL cần ~30 giây để khởi động trước khi BE connect được
- **Sau khi sửa schema Prisma:** Build lại BE (`docker compose up -d --build be`) để apply migration
- **File upload:** Lưu tại `./be/public/` trên host, mount vào `/app/public` trong container
- **RabbitMQ UI:** Truy cập tại `http://localhost:15673` (user/pass từ `.env.docker`)
