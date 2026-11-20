# Hướng dẫn dự án

- Các phase được làm theo thứ tự. Trước khi sửa, đối chiếu yêu cầu của phase đang triển khai với Test Contract. Ghi giả định cho phần đề bài để mở.
- Giữ luồng headless và giao diện dùng chung luật trong `src/game.mjs`. Nếu thay đổi thông số, sửa `game.contract.json` rồi cập nhật bằng chứng liên quan.
- Mô phỏng ở 60 tick/giây. Dùng RNG theo seed và lưu ý quy ước input tick k tạo sự kiện tick k+1.
- Dùng `npm run build` để đóng gói và `npm start` để chơi. Trên Windows dùng `npm.cmd` nếu PowerShell chặn npm.ps1.
- Trước khi kết thúc thay đổi, chạy `npm run verify`. Nếu test không đạt, xác định nguyên nhân và ghi trạng thái thực tế. Xem cách lưu bằng chứng trong `.github/skills/verify-phase/SKILL.md`.
- Để người chấm tái lập, chỉ dùng bằng chứng từ lệnh thật trên mã tương ứng và ghi lý do khi một luật mới thay thế bài kiểm tra cũ.
