# Bằng chứng Phase 1

Chạy `npm run verify` ở gốc repo để build, chạy lại toàn bộ test và tạo lại JSONL mẫu. Kết quả đã lưu được thu từ Node.js 26.13.1 và Chrome 157 trên Windows.

| Yêu cầu | Cách kiểm chứng và kết quả |
|---|---|
| Cài đặt và chạy | `npm run build` tạo bản web tĩnh. `npm start` phục vụ game tại cổng 4173. Đã tải trang và dựng WebGL trên Chrome. |
| Di chuyển, camera và nhảy | Kiểm tra headless quay yaw 90°, chuẩn hóa đi chéo, giữ input và có độ cao dương sau khi nhảy. |
| Nhặt đom đóm, nạp và thắp đèn | [Scenario](../../../tests/fixtures/last-lantern.scenario.json) và [inputs](../../../tests/fixtures/last-lantern.inputs.json) tạo đúng bốn lần nhặt, rồi nạp và thắp L1 ở tick 61. [JSONL chạy thật](last-lantern.jsonl) kết thúc với 316 điểm. |
| Bóng Mực, pulse, đèn an toàn và luật thua | Test kiểm tra ID khi Bóng Mực xuất hiện, né vùng sáng, pulse đẩy và làm choáng, mất máu và rơi đom đóm, thời gian bất tử và thua khi trời sáng. |
| Test Contract | Test đọc JSONL, đối chiếu tick, thứ tự sự kiện, dòng `end`, mã lỗi 2 và thông báo stderr. Hai lần chạy đoạn có sinh Bóng Mực cho JSONL giống hệt nhau. [Báo cáo test](tests.tap) ghi 8/8 đạt. |
| HUD và chơi lại | Từ [màn mở đầu](start.jpg), bấm Bắt đầu rồi gửi phím di chuyển và nạp đèn trong Chrome. HUD hiển thị [1/5 đèn trong lúc chơi](playing.jpg) và [thắng với 5/5 đèn, 1078 điểm](won.jpg). Đứng yên trong lượt mới để Bóng Mực làm Mây hết ánh lửa, mở [màn thua](lost.jpg). Chơi lại đặt HUD về 0 điểm, 0/5 đèn và 3 ánh lửa sau cả hai kết quả. [Nhật ký Chrome](browser.json). |

Thử nghiệm Chrome điều khiển đồng hồ khung hình và gửi sự kiện phím cho bản web đã build. Có thể lặp lại thủ công bằng các phím trong [README dự án](../../../README.md). Kiểm chứng trực tiếp trên macOS hoặc Linux còn chờ chạy. Workflow Ubuntu trong repo chạy cùng lệnh kiểm chứng headless.
