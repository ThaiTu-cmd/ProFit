#  Dự Án ProFit (E-commerce & Fitness Platform)

File README này chứa tất cả các hướng dẫn và quy tắc để team có thể code cùng nhau một cách trơn tru, hạn chế tối đa các lỗi xung đột (conflict) do khác biệt môi trường.

---

##  1. Cấu Trúc Dự Án
Dự án được chia làm 2 phần độc lập, chung một repository:
```text
ProFit/
├── backend/       # Spring Boot (Java 17+, Maven)
├── frontend/      # ReactJS (Vite, npm)
├── .gitignore     # File ignore chung của root (chặn các file rác đẩy lên git)
└── README.md      # Hướng dẫn này
```

** QUY TẮC QUAN TRỌNG NHẤT:**
- **Tuyệt đối KHÔNG** chạy `npm install` hay `mvn clean install` ở ngay thư mục gốc `ProFit/`.
- Khi làm việc với Frontend: Hãy `cd frontend` trước.
- Khi làm việc với Backend: Hãy `cd backend` trước.

---

##  2. Hướng Dẫn Cài Đặt Môi Trường (Setup & Environment)

Mỗi thành viên có mật khẩu database và cấu hình máy tính khác nhau. Để không ai bị lỗi khi chạy chung code, chúng ta sẽ **KHÔNG ĐỔI trực tiếp vào file cấu hình chung của team**, mà sẽ tạo file môi trường riêng biệt (các file này đã được loại bỏ khỏi Git để không ảnh hưởng người khác).

### A. Đối với Backend (Spring Boot)
1. Mở IDE (IntelliJ / Eclipse / VSCode) -> Chọn **Open Folder** và trỏ đúng vào thư mục `backend/` (KHÔNG trỏ vào thư mục gốc `ProFit/`). Làm vậy để IDE nhận diện đúng đây là dự án Maven.
2. Đảm bảo bạn đã cài MySQL và tạo database tên là `ProFitSuppsDB`.
3. **Cấu hình Database cá nhân (Quan trọng):**
   - Vào thư mục `backend/src/main/resources/`.
   - Copy file `application-local.yaml.example` thành file mới tên là **`application-local.yaml`**.
   - Mở file `application-local.yaml` và sửa lại `username` và `password` cho khớp với CSDL MySQL trên máy bạn.
   - Để Spring Boot nhận file này, bạn cần thêm cờ `--spring.profiles.active=local` khi chạy, hoặc trong IntelliJ vào Edit Configurations -> Environment Variables thêm `SPRING_PROFILES_ACTIVE=local`.
4. Chạy backend bằng lệnh (nếu dùng terminal):
   ```bash
   cd backend
   .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
   ```

### B. Đối với Frontend (React/Vite)
1. Mở terminal, di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
2. Cài đặt các thư viện (chỉ chạy 1 lần đầu hoặc khi có người mới thêm thư viện):
   ```bash
   npm install
   ```
3. **Cấu hình môi trường (Quan trọng):**
   - Tìm file `frontend/.env.example`, **copy** và đổi tên thành `.env` (file này đã được ẩn khỏi git).
   - Kiểm tra trong file `.env` vừa tạo xem biến `VITE_API_BASE_URL` đã đúng với URL backend của bạn chưa (mặc định là `http://localhost:8080/ProFitSuppsDB`).
4. Khởi chạy server phát triển:
   ```bash
   npm run dev
   ```

---

## 3. Quy Tắc Tránh Xung Đột Code (Git Workflow)

Hiện tại nhánh chính thống nhất của team để phát triển là nhánh **`develop`**. Bạn không nên code trực tiếp vào nhánh này. Hãy làm theo quy trình:

1. **Luôn kiểm tra nhánh trước khi bắt đầu:**
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. **Tạo nhánh riêng cho công việc của bạn:**
   *(Ví dụ: bạn được giao nhiệm vụ viết API hiển thị sản phẩm)*
   ```bash
   git checkout -b feature/hien-thi-san-pham
   ```
3. **Trong quá trình làm việc:**
   - Dùng lệnh `git status` trước khi add để đảm bảo không dính file rác (như file `.idea`, `.vscode`). (Nếu bạn đã setup đúng file gốc `.gitignore`, chúng sẽ bị chặn tự động).
   - Commit code:
     ```bash
     git add .
     git commit -m "feat: mo ta chuc nang ban vua hoan thanh"
     ```
4. **Khi hoàn thành:**
   ```bash
   git push origin feature/hien-thi-san-pham
   ```
5. Truy cập Github/Gitlab và tạo Pull Request (PR) để gộp nhánh của bạn vào nhánh `develop`. Team sẽ review và merge.

---

Chúc team code vui vẻ và không bao giờ gặp conflict! 🎉
