# Phase 3 — Đèn cạn dầu

## ADR — Dầu và kết quả bình minh

Ticket-03 đổi mục tiêu thành giữ đủ đèn sáng ở tick bình minh. Giữ một mô phỏng cho bản chơi và headless. Mỗi đèn lưu lượng dầu theo số nguyên đơn vị 1/60, cờ đã từng sáng và số lần thắp lại. Hao tự nhiên là 1 đơn vị nội bộ mỗi tick, mỗi Bóng đang hút trừ thêm 5. Snapshot và sự kiện hiển thị dầu đến một chữ số thập phân. Ngưỡng an toàn và điểm bình minh dùng giá trị nguyên chưa làm tròn.

Mỗi tick mô phỏng trừ dầu trước tương tác. Đèn cạn bị tắt ngay. Sau khi người chơi châm hoặc thắp lại mới xác định lại vùng an toàn. Cách này cho phép cứu Đêm bằng thao tác hợp lệ ngay ở tick bình minh. Nếu mất Ngọn Lửa cuối tại tick đó, kết quả vẫn là `no_flames`. Tạm dừng giữ nguyên dầu, bộ đếm hút và thời gian.

Bóng đang lượn tìm đèn yếu gần nhất, hòa thì chọn ID nhỏ hơn. Nếu chưa có đèn yếu thì tìm đèn tắt. Bóng đang đuổi giữ mục tiêu Mây theo ngưỡng phát hiện và bỏ đuổi cũ. Một Bóng đang hút bị làm choáng quay về `wander` khi kết thúc choáng. Ghi `fuel_drain` mỗi 60 tick hút liên tục theo từng Bóng, sau khi áp dụng tổng hao của tick đó. Đèn được châm phục hồi vùng an toàn sẽ đẩy Bóng ra mép trong 30 tick.

## Hồi quy và tiêu chí nghiệm thu

| Yêu cầu | Kiểm chứng |
|---|---|
| Hao dầu, thắp lại và châm dầu | Đèn hao đúng tick, hết dầu đặt tiến độ về 0, thắp lại bằng 5 đom đóm, châm dầu chọn gần nhất và hòa theo ID. Đèn đầy được bỏ qua nếu vẫn đầy ở bước tương tác. Theo thứ tự cập nhật, một đèn đầy ở đầu tick có thể hao trước bước đó. |
| Hút dầu và vùng sáng | Headless kiểm tra hai Bóng hút đồng thời, ngưỡng 30, tần suất báo, ngắt bằng Tỏa Sáng, đổi sang chase và phục hồi vùng sáng. |
| Bình minh, điểm và sức chứa | Headless kiểm tra cả ba ngưỡng, kết quả khi đèn tắt hoặc được cứu ở tick cuối, hết lửa ưu tiên trước, điểm theo dầu thực và sức chứa tối đa 20. |
| Cài đặt và hình 3D | Kiểm tra giữ cài đặt qua tải lại, cảnh báo trắng có ⚠, mắt/viền xanh, phần giấy đèn tắt xẹp 20% và rách, thanh dầu và nhấp nháy. |

- Test từng chờ thắng ngay khi thắp đủ đèn giờ xác nhận đèn thắp ở tick 91 và thắng đúng tick bình minh 96. Fixture v1.1 vẫn nằm ở tag `phase-2`.
- Assertion thời lượng và điểm trong các test cũ đã cập nhật theo Ticket-03. Các test chuyển động, dash, pause, cầu, bục, Gió Lạc, Bùa Gió và tính tất định tiếp tục chạy. Không có test được skip.
- Tuning giữ khóa `per_second_left` với giá trị 0 để trình đọc tuning cũ vẫn nhận trường này.

## Nhật ký AI

- Codex phân tích thứ tự tick, sửa mô phỏng và renderer, rồi dùng các scenario nhỏ để kiểm tra ngưỡng dầu và kết quả biên. Các phép đo và ảnh trình duyệt được lưu dưới `docs/proof/phase-3/`.
- Dùng dầu nguyên để tránh sai khi so 30, và thử riêng tick cuối để phát hiện sai thứ tự tính toán.
- Ước tính thô 13.000–26.000 token dựa trên nội dung đã đọc, mã và đầu ra kiểm chứng; phiên làm việc thiếu số đo chi phí thực tế.
