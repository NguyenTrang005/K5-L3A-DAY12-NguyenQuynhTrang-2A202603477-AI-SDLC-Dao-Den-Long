# Đảo Đèn Lồng v1.0.0

Cần Node.js 20 trở lên và trình duyệt hỗ trợ WebGL. Giải nén gói rồi mở terminal trong thư mục đã giải nén.

```sh
node scripts/serve.mjs
```

Mở http://127.0.0.1:4173/, bấm **Bắt đầu**. Các phím mặc định gồm **WASD** để đi, **Space** để nhảy, **Shift** để lướt, **E** để nạp đèn, **F** để tỏa sáng và **Esc/P** để tạm dừng. Vào **Cài đặt → Đổi phím** để chỉnh.

Bảng xếp hạng được lưu trên máy. Xuất bằng `node scripts/serve.mjs --export-leaderboard out.json`. Có thể triển khai thư mục `dist/` lên máy chủ tĩnh. Khi chạy trực tiếp từ bản tĩnh, dữ liệu bảng điểm lưu trong trình duyệt. Để chạy test, headless, benchmark và soak, dùng mã nguồn trong repo GitHub.
