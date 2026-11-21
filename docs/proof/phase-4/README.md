# Bằng chứng Phase 4

Môi trường đo là Windows 10.0.19045, Intel Core i7-10750H, Intel UHD Graphics, RAM 31,6 GiB, chế độ nguồn Balanced, Node.js 26.13.1 và Chrome 157. Số đo dưới đây là kết quả tại máy phát triển.

| Yêu cầu | Bằng chứng |
|---|---|
| Benchmark 1280×720 | 3 giây khởi động, 30 giây đo, 200 Bóng Mực, 100 đom đóm, 3 đèn đầy dầu. Kết quả 449,77 FPS trung bình, 144,79 FPS cho 1% khung hình chậm nhất, tải 639 ms. [JSON kết quả](../../../bench.json) |
| Soak 10 Đêm | 0 crash, RSS từ 37,211 lên 42,910 MiB, tăng khoảng 15,3%. [JSON kết quả](../../../soak.json) |
| Hồi quy Phase 1–3 | Bộ test chạy đủ 34 bài. Sáu replay JSONL chạy lại khớp từng byte với Phase 3. [TAP](tests.tap) · [Dầu](fuel-drain.jsonl) · [Cầu](cau-bridge.jsonl) · [Headless](headless-metrics.json) |
| Bảng xếp hạng | Test tên, giới hạn 10, hòa điểm theo giờ và xuất từ tiến trình khác. Bản giải nén lưu điểm mẫu ở cả lượt thua và Bình Minh rồi hiển thị theo thứ tự. [Bảng điểm](leaderboard.jpg) |
| Dễ tiếp cận | Thử trùng phím, đổi phím nhảy, tải lại, khôi phục mặc định, 18 px và 22,5 px, giảm chuyển động và bốn cảnh báo. [Đổi phím](bindings.jpg) · [Giao diện](preview.jpg) · [Nhật ký](browser.json) |
| Gói | `npm run package` tạo `dist/dao-den-long-v1.0.0.tar.gz`. Thử bằng máy chủ nằm trong gói đã giải nén, với tệp bảng điểm thử riêng. [Hướng dẫn trong gói](../../play-release.md) |

Kiểm chứng chuyển Đêm dùng trạng thái dựng trước bình minh, rồi để game xử lý tick kết thúc thật. Những số FPS của từng cảnh trong nhật ký lấy từ trình duyệt, riêng benchmark dùng cửa sổ chuẩn và chờ công việc WebGL mỗi khung hình hoàn tất.

Lệnh tái lập nằm trong [README](../../../README.md) và [hướng dẫn phát hành](../../release.md). Bộ test ẩn và máy chấm của giảng viên chưa được truy cập.
