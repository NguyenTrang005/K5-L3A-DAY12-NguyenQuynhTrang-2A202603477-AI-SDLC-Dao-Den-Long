const TAU = Math.PI * 2;
const EPSILON = 1e-8;
const circle = (x, z, radius) => ({ x, z, radius });
const ring = (x, z, radius, count, offset = 0, y = 0, step = 360 / count) =>
  Array.from({ length: count }, (_, index) => {
    const radians = (offset + index * step) * TAU / 360;
    return [x + radius * Math.cos(radians), y, z + radius * Math.sin(radians)];
  });
const entry = (id, pos) => ({ id, pos });

export const maps = {
  1: {
    name: 'Đảo Bến',
    message: 'Mây à, đèn sẽ cạn dầu theo thời gian. Châm dầu trước khi đèn chớp sáng để giữ Bóng Mực ở ngoài.',
    start: [0, 0, 0], islands: [circle(0, 0, 40)],
    lanterns: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    motes: [...ring(0, 0, 12, 8), ...ring(0, 0, 33, 16)],
    fog: ring(0, 0, 37, 12, 15),
    shadeInterval: 480, shadeCap: 6, pads: [], charms: []
  },
  2: {
    name: 'Đảo Cau',
    message: 'Qua cầu tre để tìm đèn bên kia. Bục nhảy cũng đưa con sang đảo kế bên. Coi chừng Gió Lạc cướp đom đóm.',
    start: [0, 0, 0], islands: [circle(0, 0, 28), circle(70, 0, 28)],
    bridge: { minX: 26, maxX: 44, minZ: -2, maxZ: 2 },
    pads: [{ pos: [20, 0, 18], target: [70, 0, 0], vertical: 14, speed: 24 },
      { pos: [50, 0, -18], target: [0, 0, 0], vertical: 14, speed: 24 }],
    lanterns: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
    motes: [0, 70].flatMap(x => [...ring(x, 0, 10, 4), ...ring(x, 0, 22, 8)]),
    fog: [0, 70].flatMap(x => ring(x, 0, 26, 8, 22.5)),
    shadeInterval: 420, shadeCap: 8, charms: [entry('C1', [35, 0, 0])]
  },
  3: {
    name: 'Đảo Chuông',
    message: 'Con hãy theo dốc lên tầng trên rồi dùng bục nhảy để tới đèn gần tháp chuông. Khi lá bắt đầu bay, gió sắp nổi.',
    start: [0, 0, -10], islands: [circle(0, 0, 45)],
    ramps: [30, 150].map(angle => [Math.cos(angle * TAU / 360), Math.sin(angle * TAU / 360)]),
    tower: { radius: 2, top: 14 },
    pads: [{ pos: [0, 3, 13], target: [0, 3, 0], vertical: 12, speed: 8 }],
    lanterns: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
    motes: [...ring(0, 0, 34, 18), ...ring(0, 0, 18, 8, 20, 3, 20), ...ring(0, 0, 5, 4, 45, 6)],
    fog: ring(0, 0, 43, 16),
    shadeInterval: 360, shadeCap: 10,
    charms: [entry('C1', [30, 0, 25]), entry('C2', [-30, 0, 25])]
  }
};

export function ground(map, x, z) {
  const radius = Math.hypot(x, z);
  if (map.ramps) {
    if (radius <= 8 + EPSILON) return 6;
    if (z > 0 && radius >= 12 - EPSILON && radius <= 24 + EPSILON) return 3;
    for (const [dx, dz] of map.ramps) {
      const along = dx * x + dz * z;
      const across = dx * z - dz * x;
      if (along >= 24 - EPSILON && along <= 30 + EPSILON && Math.abs(across) <= 1.5 + EPSILON) {
        return (30 - along) / 2;
      }
    }
  }
  if (map.islands.some(island => Math.hypot(x - island.x, z - island.z) <= island.radius + EPSILON)) return 0;
  const bridge = map.bridge;
  if (bridge && x >= bridge.minX && x <= bridge.maxX && z >= bridge.minZ && z <= bridge.maxZ) return 0;
  return -Infinity;
}

export function blocked(map, from, x, z, grounded) {
  if (map.tower && Math.hypot(x, z) < map.tower.radius && from[1] < map.tower.top
    && Math.hypot(x, z) <= Math.hypot(from[0], from[2])) return true;
  const step = grounded ? Math.hypot(x - from[0], z - from[2]) * 0.55 : 0;
  const next = ground(map, x, z);
  const current = ground(map, from[0], from[2]);
  // Scenario có thể đặt thực thể dưới mặt tầng, vẫn cho phép đi ra khỏi vùng đó.
  return next > from[1] + step + EPSILON && next > current + EPSILON;
}
