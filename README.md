# Đảo Đèn Lồng

**Đêm 1 · Đảo Bến**. Điều khiển Mây gom đom đóm và thắp lại năm Đèn Lồng Lớn trước bình minh. Ánh đèn đã thắp bảo vệ Mây khỏi Bóng Mực.

## Chạy game

Cần Node.js 20 trở lên và trình duyệt có WebGL. Sau khi clone repo, mở terminal ở thư mục gốc và chạy hai lệnh sau. Trên PowerShell có thể dùng `npm.cmd` nếu `npm` bị chặn.

```sh
npm run build
npm start
```

Mở **http://127.0.0.1:4173/** rồi bấm **Bắt đầu**. Lệnh build tạo bản web tĩnh trong `dist/`.

| Phím | Hành động |
|---|---|
| W A S D | Di chuyển theo hướng camera, tự nhặt đom đóm khi tới gần |
| Space | Nhảy |
| E | Nạp đom đóm vào đèn chưa sáng gần nhất |
| F | Tốn 2 đom đóm để đẩy lùi và làm choáng Bóng Mực trong tầm |
| ← → hoặc kéo chuột trên cảnh | Xoay camera |

Mỗi đèn cần 4 đom đóm và có thể nạp nhiều lần. Mây mang được tối đa 8 đom đóm và bắt đầu với 3 ánh lửa (máu). Mỗi lần bị chạm mất một ánh lửa và rơi một nửa số đom đóm đang mang, làm tròn xuống. Mây thua khi hết ánh lửa hoặc hết 3 phút. Bấm **Chơi lại** để bắt đầu từ đầu sau khi thắng hoặc thua.

### Điểm

Nhặt một đom đóm được **10**, thắp một đèn được **100** và làm choáng một Bóng Mực được **20**. Khi thắng, cộng **2 điểm mỗi giây nguyên còn lại** và **40 điểm mỗi ánh lửa còn lại**. Đảo có biên giữ Mây trong sân chơi, nên `fall_enabled` là `false`.

## Chạy kiểm chứng và headless

```sh
npm run verify
```

Lệnh chạy build, test và ghi bằng chứng mẫu vào `dist/proof/phase-1/`. Để chạy riêng chế độ headless, dùng:

```sh
node src/headless.mjs --seed 7 --night 1 --ticks 100 --out last-lantern.jsonl --scenario tests/fixtures/last-lantern.scenario.json --inputs tests/fixtures/last-lantern.inputs.json
```

Kịch bản trên thắp đèn cuối ở tick 61, kết thúc với 316 điểm. Xem [Test Contract](game.contract.json), [bằng chứng Phase 1](docs/proof/phase-1/README.md) và [ghi chú Phase 1](docs/notes/phase-1.md).

## Sáng tạo của tôi

Biển mây dưới mép đảo và những hạt sáng nhỏ quanh mỗi đom đóm được tạo bằng hình khối 3D trong game. Hai hiệu ứng chỉ thuộc phần hiển thị. Xem [ảnh lúc đang chơi](docs/proof/phase-1/playing.jpg) và [kết quả kiểm tra headless](docs/proof/phase-1/tests.tap).

Tài liệu lab gồm [hướng dẫn](GUIDE.md), [checkpoints](CHECKPOINTS.md), [cách nộp](SUBMISSION.md), [quy định](RULES.md) và [thang điểm](RUBRIC.md). Yêu cầu từng phase được phát hành trên [lab board](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW).
