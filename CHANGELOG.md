# Changelog

## Phase 3 — Test Contract v1.2

### Thay đổi phá vỡ tương thích

- Thắp hết đèn vẫn tiếp tục chơi. Khi bình minh, thắng nếu còn Ngọn Lửa và giữ đủ 3/5, 4/6 hoặc 5/7 đèn. Lý do thắng đổi từ `all_lit` sang `dawn_survived`. Thời lượng đổi thành 240, 270 và 300 giây.
- Đèn sáng có dầu, có thể châm thêm, cạn dầu và tắt. Đèn từng sáng cần 5 đom đóm để thắp lại. Vùng an toàn chỉ hoạt động từ 30 dầu trở lên.
- Bóng Mực có trạng thái `drain`. Các lần hút đồng thời cộng dồn. Hết choáng trở về `wander`.
- Túi bắt đầu ở 10 và tăng 2 mỗi lần thắp thành công, tối đa 20. Đèn đặt sáng từ scenario không tính vào sức chứa.
- Điểm nạp giảm còn 5 mỗi đom đóm, thắp lại được 40 và làm choáng Bóng đang hút được 15. Thưởng thắng dựa trên số đèn, dầu và Ngọn Lửa còn lại. Bỏ thưởng theo thời gian.
- Snapshot thêm `fuel`, `ever_lit`, `relit_count` cho đèn và `capacity` cho người chơi. Sự kiện `lantern_lit` thêm `relight`. Thêm `lantern_out`, `refuel`, `fuel_drain`. Scenario có thể đặt dầu, lịch sử đèn, số lần thắp và đèn mục tiêu của Bóng Mực.

### Giao diện

- Hiện lượng dầu, ngưỡng đèn khi bình minh và sức chứa hiện tại. Đèn yếu nhấp nháy, đèn tắt có giấy rách và xẹp.
- Cài đặt có tùy chọn lưu bảng màu dễ phân biệt.
