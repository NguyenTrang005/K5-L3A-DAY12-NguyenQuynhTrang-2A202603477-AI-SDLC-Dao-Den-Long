import { ground } from '../src/maps.mjs';

const TAU = Math.PI * 2;
const INSTANCE_WIDTH = 13;
const INSTANCE_FIELDS = [[4, 0], [3, 4], [3, 7], [3, 10]];
const vertexSource = `
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec4 a_pose;
attribute vec3 a_scale;
attribute vec3 a_color;
attribute vec3 a_effects;
uniform mat4 u_viewProjection;
uniform vec3 u_eye;
uniform vec3 u_lanterns[7];
uniform float u_ambient;
uniform vec3 u_rimColor;
varying mediump vec3 v_color;
void main() {
  float c = cos(a_pose.w), s = sin(a_pose.w);
  mat3 rotation = mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
  vec4 world = vec4(rotation * (a_position * a_scale) + a_pose.xyz, 1.0);
  vec3 normal = normalize(rotation * (a_normal / a_scale));
  float sunlight = max(dot(normal, vec3(-0.481, 0.819, -0.307)), 0.0);
  float lanternLight = 0.0;
  for (int i = 0; i < 7; i++) {
    vec3 lantern = u_lanterns[i];
    if (lantern.z > 0.0) lanternLight += lantern.z * (1.0 - smoothstep(0.0, 10.0, length(world.xz - lantern.xy)));
  }
  vec3 base = a_color * (0.42 + 0.35 * sunlight + u_ambient);
  if (a_effects.y > 0.0) {
    float grass = sin(world.x * 0.48 + sin(world.z * 0.35)) * cos(world.z * 0.21);
    base += grass * 0.028;
  }
  base += lanternLight * vec3(0.32, 0.18, 0.045) * (0.55 + 0.45 * sunlight);
  if (a_effects.z > 0.0) {
    float rim = pow(1.0 - max(dot(normal, normalize(u_eye - world.xyz)), 0.0), 3.0);
    base = mix(base, u_rimColor, rim * a_effects.z);
  }
  base = mix(base, a_color, a_effects.x);
  float fog = smoothstep(25.0, 112.0, distance(u_eye, world.xyz));
  v_color = mix(base, vec3(0.106, 0.137, 0.314), fog * (1.0 - a_effects.x * 0.5));
  gl_Position = u_viewProjection * world;
}
`;
const fragmentSource = `
precision mediump float;
varying mediump vec3 v_color;
void main() { gl_FragColor = vec4(v_color, 1.0); }
`;

function cylinder(top, bottom, sides = 16, offset = 0, bands = 1) {
  const vertices = [];
  const vertex = (point, normal) => vertices.push(...point, ...normal);
  for (let index = 0; index < sides; index++) {
    const a = index / sides * TAU + offset;
    const b = (index + 1) / sides * TAU + offset;
    const point = (angle, y, radius) => [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
    const upperA = point(a, 0.5, top);
    const upperB = point(b, 0.5, top);
    const lowerA = point(a, -0.5, bottom);
    const lowerB = point(b, -0.5, bottom);
    const n = [Math.cos((a + b) / 2), bottom - top, Math.sin((a + b) / 2)];
    for (const p of [upperA, lowerA, upperB, upperB, lowerA, lowerB]) vertex(p, n);
    for (let band = 0; band < bands; band++) {
      const min = top * band / bands, max = top * (band + 1) / bands;
      const innerA = point(a, .5, min), innerB = point(b, .5, min);
      const outerA = point(a, .5, max), outerB = point(b, .5, max);
      for (const p of [innerA, outerA, outerB]) vertex(p, [0, 1, 0]);
      if (band > 0) for (const p of [innerA, outerB, innerB]) vertex(p, [0, 1, 0]);
    }
    for (const p of [[0, -0.5, 0], lowerA, lowerB]) vertex(p, [0, -1, 0]);
  }
  return vertices;
}

function sphere(segments = 12, rings = 8) {
  const vertices = [];
  function vertex(row, col) {
    const lat = Math.PI * row / rings;
    const lon = TAU * col / segments;
    const normal = [Math.cos(lon) * Math.sin(lat), Math.cos(lat), Math.sin(lon) * Math.sin(lat)];
    vertices.push(...normal.map(value => value / 2), ...normal);
  }
  for (let row = 0; row < rings; row++) {
    for (let col = 0; col < segments; col++) {
      vertex(row, col);
      vertex(row + 1, col);
      vertex(row, col + 1);
      vertex(row, col + 1);
      vertex(row + 1, col);
      vertex(row + 1, col + 1);
    }
  }
  return vertices;
}

function ring() {
  const vertices = [];
  for (let step = 0; step < 48; step++) {
    const a = TAU * step / 48;
    const b = TAU * (step + 1) / 48;
    for (const [angle, radius] of [[a, 0.48], [a, 0.5], [b, 0.48], [b, 0.48], [a, 0.5], [b, 0.5]]) {
      vertices.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius, 0, 1, 0);
    }
  }
  return vertices;
}

function terrace() {
  const vertices = [];
  const vertex = (p, n) => vertices.push(...p, ...n);
  const edge = (angle, r, y) => [r * Math.cos(angle), y, r * Math.sin(angle)];
  function wall(a, b, normal) {
    const base = p => [p[0], 0, p[2]];
    for (const point of [a, b, base(a), b, base(b), base(a)]) vertex(point, normal);
  }
  for (let index = 0; index < 48; index++) {
    const a = index * Math.PI / 48;
    const b = (index + 1) * Math.PI / 48;
    const innerA = edge(a, 12, 3), innerB = edge(b, 12, 3);
    const outerA = edge(a, 24, 3), outerB = edge(b, 24, 3);
    for (const point of [innerA, outerA, outerB, innerA, outerB, innerB]) vertex(point, [0, 1, 0]);
    const middle = (a + b) / 2;
    wall(outerA, outerB, [Math.cos(middle), 0, Math.sin(middle)]);
    wall(innerA, innerB, [-Math.cos(middle), 0, -Math.sin(middle)]);
  }
  wall([12, 3, 0], [24, 3, 0], [0, 0, -1]);
  wall([-12, 3, 0], [-24, 3, 0], [0, 0, -1]);
  return vertices;
}

function ramp() {
  const vertices = [];
  const a = [-3, 3, -1.5], b = [-3, 3, 1.5], c = [3, 0, 1.5], d = [3, 0, -1.5];
  for (const point of [a, b, c, a, c, d]) vertices.push(...point, .447, .894, 0);
  for (const point of [a, d, [-3, 0, -1.5]]) vertices.push(...point, 0, 0, -1);
  for (const point of [b, c, [-3, 0, 1.5]]) vertices.push(...point, 0, 0, 1);
  return vertices;
}

function tornPaper() {
  return [[-.22, .16], [.09, .09], [-.06, -.04], [-.06, -.04], [.09, .09], [.22, -.23],
    [-.06, -.04], [.22, -.23], [.02, -.36]].flatMap(([x, y]) => [x, y, 0, 0, 0, 1]);
}

const normalize = vector => {
  const length = Math.hypot(...vector);
  return vector.map(value => value / length);
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function viewProjection(eye, target, ratio) {
  const back = normalize(eye.map((value, index) => value - target[index]));
  const right = normalize(cross([0, 1, 0], back));
  const up = cross(back, right);
  const view = [...right.map((value, i) => [value, up[i], back[i], 0]),
    [-dot(right, eye), -dot(up, eye), -dot(back, eye), 1]];
  const focal = 1 / Math.tan(Math.PI / 6);
  const near = 0.12;
  const far = 175;
  return view.flatMap(([x, y, z, w]) => [
    x * focal / ratio,
    y * focal,
    z * (far + near) / (near - far) + w * 2 * far * near / (near - far),
    -z
  ]);
}

function cameraRig(map, x, y, z, yaw) {
  const cameraHeight = Math.max(y, -2);
  const theta = yaw * Math.PI / 180;
  const forwardX = Math.sin(theta), forwardZ = Math.cos(theta);
  let distance = 1;
  if (map.tower) {
    // Test từ vai Mây đi ngược về camera để tháp và vách tầng luôn ở sau camera.
    for (let step = 1; step <= 24; step++) {
      const portion = step / 24;
      const cx = x - forwardX * 8.7 * portion;
      const cz = z - forwardZ * 8.7 * portion;
      const cy = cameraHeight + 1.65 + 4.15 * portion;
      const wall = Math.hypot(cx, cz) <= map.tower.radius + .33 && cy >= 5.8 && cy < map.tower.top + .35;
      if (wall || cy < ground(map, cx, cz) + .34) {
        distance = Math.max(1 / 24, (step - 1) / 24);
        break;
      }
    }
  }
  const lookAhead = 3.1 + 2.5 * distance;
  return {
    height: cameraHeight,
    eye: [x - forwardX * 8.7 * distance, cameraHeight + 1.65 + 4.15 * distance, z - forwardZ * 8.7 * distance],
    target: [x + forwardX * lookAhead, cameraHeight + 1.1, z + forwardZ * lookAhead]
  };
}

function createProgram(gl) {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  return program;
}

function buildIslandScenery(map, benchmark) {
  const scenery = [];
  const add = (kind, pos, size, color, yaw = 0, glow = 0, terrain = 0) => {
    scenery.push({ kind, pos, size, color, yaw, glow, terrain });
  };
  for (const { x: cx, z: cz, radius } of map.islands) {
    const diameter = radius * 2;
    add('cliff', [cx, -3.6, cz], [diameter, 7, diameter], '#463b5b');
    add('grass', [cx, -0.72, cz], [diameter, 1.44, diameter], '#2F5D50', 0, 0, 1);
    add('cliff', [cx, -8, cz], [diameter * .68, 4.2, diameter * .68], '#322842');
    for (let index = 0; index < 12; index++) {
      const angle = (index + .3) * TAU / 12;
      const x = cx + Math.cos(angle) * (radius - 4);
      const z = cz + Math.sin(angle) * (radius - 4);
      const height = 3 + (index % 4) * 0.6;
      add('hex', [x, height * 0.28, z], [0.55, height * .56, 0.55], '#6B4A2F', angle);
      add('tree', [x, height * .63, z], [3.1, height * .95, 3.1], '#254b51', angle);
      add('tree', [x, height, z], [2.4, height * .8, 2.4], '#437269', angle);
    }
    for (let index = 0; index < 19; index++) {
      const angle = index * 2.39996;
      const r = radius * (.5 + (index % 6) / 14);
      const x = cx + Math.cos(angle) * r;
      const z = cz + Math.sin(angle) * r;
      add('hex', [x, 0.12, z], [1.2, 0.35, 0.94], '#69716b', angle);
    }
  }
  add('disc', [map.start[0], .025, map.start[2]], [7, .05, 7], '#C9B48A');
  if (map.bridge) {
    for (let index = 0; index < 18; index++) {
      add('box', [26.5 + index, -.13, 0], [.97, .26, 4], index % 2 ? '#6B4A2F' : '#7A5839');
    }
    for (const z of [-1.72, 1.72]) add('box', [35, -.35, z], [18, .22, .2], '#6B4A2F');
  }
  if (map.ramps) {
    add('terrace', [0, 0, 0], [1, 1, 1], '#2F5D50', 0, 0, 1);
    add('grass', [0, 3, 0], [16, 6, 16], '#2F5D50');
    for (const [dx, dz] of map.ramps) add('ramp', [dx * 27, 0, dz * 27], [1, 1, 1], '#C9B48A', -Math.atan2(dz, dx));
    add('disc', [0, 9.5, 0], [4, 7, 4], '#6B4A2F');
    add('hat', [0, 13.5, 0], [4.5, 1, 4.5], '#74404a');
    add('hex', [0, 12, 0], [4.2, .18, 4.2], '#F2C14E', 0, .25);
  }
  for (const { pos: [x, y, z] } of map.pads) {
    add('disc', [x, y + .075, z], [2, .15, 2], '#6B4A2F');
    add('ring', [x, y + .16, z], [1.65, 1, 1.65], '#F2C14E', 0, .75);
  }
  for (let index = 0; !benchmark && index < 20; index++) {
    const angle = index * 2.4;
    const radius = 48 + index % 4 * 11;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    add('sphere', [x, -4 - index % 7, z], [22, 4, 10], '#12384A', angle);
  }
  for (let index = 0; index < 36; index++) {
    const angle = index * 2.4;
    const height = 8 + (index * 3.7) % 42;
    add('gem', [Math.cos(angle) * 102, height, Math.sin(angle) * 102], [.23, .23, .23], '#d6c1df', 0, .9);
  }
  add('sphere', [31, 19, 72], [6, 6, 6], '#ffe0b5', 0, 1);
  return scenery;
}

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) throw new Error('WebGL không khả dụng.');
    this.canvas = canvas;
    this.gl = gl;
    this.program = createProgram(gl);
    gl.useProgram(this.program);
    this.uniforms = Object.fromEntries(['viewProjection', 'eye', 'ambient', 'rimColor']
      .map(name => [name, gl.getUniformLocation(this.program, 'u_' + name)]));
    this.uniforms.lanterns = gl.getUniformLocation(this.program, 'u_lanterns[0]');
    this.position = gl.getAttribLocation(this.program, 'a_position');
    this.normal = gl.getAttribLocation(this.program, 'a_normal');
    gl.enableVertexAttribArray(this.position);
    gl.enableVertexAttribArray(this.normal);
    this.instancing = gl.getExtension('ANGLE_instanced_arrays');
    this.instanceFields = ['pose', 'scale', 'color', 'effects'].map((name, index) => ({
      location: gl.getAttribLocation(this.program, 'a_' + name),
      size: INSTANCE_FIELDS[index][0], offset: INSTANCE_FIELDS[index][1]
    }));
    this.instanceBuffer = gl.createBuffer();
    if (this.instancing) {
      for (const { location } of this.instanceFields) {
        gl.enableVertexAttribArray(location);
        this.instancing.vertexAttribDivisorANGLE(location, 1);
      }
    }
    gl.enable(gl.DEPTH_TEST);
    this.meshes = {};
    const meshes = {
      disc: cylinder(.5, .5, 36), grass: cylinder(.5, .5, 72, 0, 8), cliff: cylinder(.5, .32, 24),
      hex: cylinder(.5, .5, 6), post: cylinder(.5, .55, 4), hat: cylinder(.03, .5, 20),
      robe: cylinder(.25, .5, 12), tree: cylinder(.05, .5, 7),
      gem: sphere(5, 3), sphere: sphere(), ring: ring(),
      box: cylinder(Math.SQRT1_2, Math.SQRT1_2, 4, Math.PI / 4), terrace: terrace(), ramp: ramp(), tear: tornPaper()
    };
    for (const [name, vertices] of Object.entries(meshes)) {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      this.meshes[name] = { buffer, count: vertices.length / 6, used: 0, data: new Float32Array(INSTANCE_WIDTH * 16) };
    }
    this.sceneMap = null;
    this.colors = new Map();
  }

  draw(kind, [x, y, z], [sx, sy, sz], color, yaw = 0, glow = 0, terrain = 0, rim = 0) {
    const mesh = this.meshes[kind];
    if (!this.colors.has(color)) {
      this.colors.set(color, [1, 3, 5].map(index => Number.parseInt(color.slice(index, index + 2), 16) / 255));
    }
    if (mesh.used === mesh.data.length) {
      const next = new Float32Array(mesh.data.length * 2);
      next.set(mesh.data);
      mesh.data = next;
    }
    mesh.data.set([x, y, z, yaw, sx, sy, sz, ...this.colors.get(color), glow, terrain, rim], mesh.used);
    mesh.used += INSTANCE_WIDTH;
  }

  flush() {
    const { gl, instancing } = this;
    for (const mesh of Object.values(this.meshes)) {
      if (!mesh.used) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      gl.vertexAttribPointer(this.position, 3, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(this.normal, 3, gl.FLOAT, false, 24, 12);
      if (instancing) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.data.subarray(0, mesh.used), gl.STREAM_DRAW);
        for (const { location, size, offset } of this.instanceFields) {
          gl.vertexAttribPointer(location, size, gl.FLOAT, false, INSTANCE_WIDTH * 4, offset * 4);
        }
        instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, mesh.count, mesh.used / INSTANCE_WIDTH);
      } else {
        for (let row = 0; row < mesh.used; row += INSTANCE_WIDTH) {
          for (const { location, size, offset } of this.instanceFields) {
            const field = mesh.data.subarray(row + offset, row + offset + size);
            if (size === 4) gl.vertexAttrib4fv(location, field);
            else gl.vertexAttrib3fv(location, field);
          }
          gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
        }
      }
      mesh.used = 0;
    }
  }

  lantern(lantern, tuning, eye, light) {
    const [x, y, z] = lantern.pos;
    const lit = lantern.lit;
    const weak = lit && lantern.fuelUnits < tuning.low_fuel_threshold * 60;
    const shellHeight = lit ? .95 : .95 * .8;
    const sink = .95 - shellHeight;
    const towardEye = Math.atan2(eye[0] - x, eye[2] - z);
    const color = lit ? '#FFB347' : '#5B5F6E';
    const base = '#414555';
    this.draw('hex', [x, y + .18, z], [2.5, .36, 2.5], base);
    this.draw('hex', [x, y + .46, z], [1.8, .25, 1.8], '#82717d');
    this.draw('post', [x, y + 1.45, z], [.47, 1.9, .47], '#6B4A2F', Math.PI / 4);
    this.draw('hex', [x, y + 2.48, z], [1.5, .23, 1.5], '#593f54');
    this.draw('hex', [x, y + 3.03 - sink / 2, z], [1.24, shellHeight, 1.24], color, 0, lit ? light : .28);
    this.draw('hat', [x, y + 3.72 - sink, z], [1.95, .67, 1.95], lit ? '#FFB347' : '#5B5F6E');
    this.draw('gem', [x, y + 4.09 - sink, z], [.3, .33, .3], lit ? '#FFE9B0' : color, 0, lit ? light : .2);
    if (!lit) {
      this.draw('tear', [x + .64 * Math.sin(towardEye), y + 2.98, z + .64 * Math.cos(towardEye)],
        [1, 1, 1], '#24283A', towardEye, .6);
      return;
    }
    if (!weak) this.draw('ring', [x, y + .06, z], [2 * tuning.safe_radius, 1, 2 * tuning.safe_radius], '#F2C14E', 0, .35);
    const fuelWidth = 1.65 * lantern.fuelUnits / (60 * tuning.fuel_max);
    const offset = (fuelWidth - 1.65) / 2;
    this.draw('box', [x, y + 4.48, z], [1.8, .21, .12], '#24283A', towardEye, .75);
    this.draw('box', [x + Math.cos(towardEye) * offset, y + 4.48, z - Math.sin(towardEye) * offset],
      [Math.max(.008, fuelWidth), .135, .145], weak && light < .8 ? '#7F613B' : '#FFE9B0', towardEye, light);
  }

  player(game, time) {
    const [x, y, z] = game.player.pos;
    const yaw = game.facing;
    const walk = Math.hypot(...game.previousInput.move) > 0 && game.state === 'playing';
    const lean = walk ? Math.sin(time * 14) * .18 : 0;
    const part = (kind, side, up, front, size, color, glow = 0) => {
      const px = x + side * Math.cos(yaw) + front * Math.sin(yaw);
      const pz = z - side * Math.sin(yaw) + front * Math.cos(yaw);
      this.draw(kind, [px, y + up, pz], size, color, yaw, glow);
    };
    if (game.player.grounded) this.draw('disc', [x, y + .025, z], [1.35, .025, .96], '#294345');
    part('sphere', -.21, .24, lean, [.31, .48, .44], '#303246');
    part('sphere', .21, .24, -lean, [.31, .48, .44], '#303246');
    part('robe', 0, .77, 0, [1.02, 1.05, .73], '#E8E2D0');
    part('disc', 0, 1.17, 0, [.58, .16, .59], '#C8102E');
    part('post', 0, .99, -.39, [.21, .41, .09], '#C8102E');
    part('sphere', 0, 1.43, .03, [.76, .77, .71], '#f2b382');
    part('sphere', 0, 1.48, -.24, [.7, .7, .3], '#443044');
    part('hat', 0, 1.97, 0, [1.58, .60, 1.58], '#edbe78');
    part('disc', 0, 1.68, 0, [1.59, .045, 1.59], '#d6945a');
    part('post', .58, 1.48, .06, [.055, .34, .055], '#583b44');
    part('hex', .58, 1.3, .06, [.26, .31, .26], '#ffcb7b', 1);
  }

  render(game, yaw, time, pulseTick, { accessibleColors = false, reducedMotion = false, camera, benchmark = false } = {}) {
    const { canvas, gl, uniforms } = this;
    const scale = Math.min(devicePixelRatio, 1.5, 1280 / Math.max(canvas.clientWidth, 1));
    const width = Math.max(1, Math.floor(canvas.clientWidth * scale));
    const height = Math.max(1, Math.floor(canvas.clientHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const [x, y, z] = game.player.pos;
    const { eye, target, height: cameraHeight = 0 } = camera ?? cameraRig(game.map, x, y, z, yaw);
    this.view = viewProjection(eye, target, width / height);
    gl.uniformMatrix4fv(uniforms.viewProjection, false, this.view);
    gl.uniform3fv(uniforms.eye, eye);
    const shadeAccent = accessibleColors ? '#00B3FF' : '#7A3CFF';
    gl.uniform3f(uniforms.rimColor, accessibleColors ? 0 : .478, accessibleColors ? .702 : .235, 1);
    const lights = new Float32Array(21);
    const flicker = reducedMotion ? .74 : .74 + Math.cos(time * TAU) * .26;
    game.lanterns.forEach((lantern, index) => lights.set([
      lantern.pos[0], lantern.pos[2], lantern.lit ? (game.weakLantern(lantern) ? flicker : 1) : 0
    ], index * 3));
    gl.uniform3fv(uniforms.lanterns, lights);
    gl.uniform1f(uniforms.ambient, .15 + .55 * game.lanterns.filter(lantern => lantern.lit).length / game.lanterns.length);

    if (this.sceneMap !== game.map || this.benchmark !== benchmark) {
      this.sceneMap = game.map;
      this.benchmark = benchmark;
      this.island = buildIslandScenery(game.map, benchmark);
    }
    for (const prop of this.island) this.draw(prop.kind, prop.pos, prop.size, prop.color, prop.yaw, prop.glow, prop.terrain);
    game.lanterns.forEach((lantern, index) => this.lantern(lantern, game.tuning, eye, lights[index * 3 + 2]));
    for (const [index, mote] of game.motes.entries()) {
      const [mx, my, mz] = mote.pos;
      if (!this.visible([mx, my + .8, mz], 1.3) && Math.hypot(mx - eye[0], mz - eye[2]) > 3) continue;
      const bob = Math.sin(time * 2.9 + index) * .21;
      this.draw('gem', [mx, my + .84 + bob, mz], [.38, .48, .38], '#FFF6C2', time * 1.8 + index, 1);
      if (!benchmark) this.draw('gem', [mx + .25, my + 1.13 - bob, mz + .24], [.13, .13, .13], '#FFE58A', 0, .95);
    }
    for (const charm of game.charms) {
      if (charm.respawnAt > game.simTick) continue;
      const [cx, cy, cz] = charm.pos;
      const bob = Math.sin(time * 3) * .15;
      this.draw('box', [cx, cy + 1.05 + bob, cz], [.58, .9, .12], '#F2C14E', time, .8);
      this.draw('box', [cx, cy + 1.06 + bob, cz], [.46, .72, .15], '#C8102E', time, .75);
    }
    for (const drifter of game.drifters) {
      const [dx, dy, dz] = drifter.pos;
      const angle = drifter.heading;
      for (let part = 0; part < 5; part++) {
        const length = part * .34;
        this.draw('sphere', [dx - Math.cos(angle) * length, dy + .65 + Math.sin(time * 9 - part) * .28,
          dz - Math.sin(angle) * length], [.55, .2, .41 - part * .055], '#8FA3B8', 0, .45);
      }
    }
    if (game.windWarning || game.wind.active) {
      const angle = game.wind.dir_deg * TAU / 360;
      for (let index = 0; index < 24; index++) {
        const travel = (time * (game.wind.active ? 11 : 5) + index * 3.7) % 28 - 14;
        const side = (index * 7) % 18 - 9;
        this.draw('gem', [x + Math.cos(angle) * travel - Math.sin(angle) * side, cameraHeight + 1.4 + (index % 5) * .4,
          z + Math.sin(angle) * travel + Math.cos(angle) * side], [.4, .06, .16], '#AFA676', time + index, .4);
      }
    }
    for (const [index, shade] of game.shades.entries()) {
      const [sx, sy, sz] = shade.pos;
      if (!this.visible([sx, sy, sz], 1.4) && Math.hypot(sx - eye[0], sz - eye[2]) > 4) continue;
      const stunned = shade.state === 'stunned';
      const bob = Math.sin(time * 4.2 + index) * .13;
      const heading = Math.atan2(x - sx, z - sz);
      this.draw('sphere', [sx, sy + bob, sz], [1.45, 1.85, 1.22], stunned ? '#3A3450' : '#120A1A', heading, 0, 0, stunned ? 0 : 1);
      this.draw('sphere', [sx, sy - .45 + bob, sz], [1.7, .8, 1.15], '#3A3450', heading);
      for (const offset of [-.22, .22]) {
        this.draw('gem', [sx + Math.sin(heading) * .5 + Math.cos(heading) * offset, sy + .22 + bob,
          sz + Math.cos(heading) * .5 - Math.sin(heading) * offset],
        [.19, .21, .19], stunned ? '#FFE9B0' : shadeAccent, 0, 1);
      }
    }
    const pulseAge = game.simTick - pulseTick;
    if (pulseAge < 28 && !reducedMotion) {
      const diameter = 1 + pulseAge / 28 * game.tuning.pulse_radius * 2;
      this.draw('ring', [x, y + .09, z], [diameter, 1, diameter], '#FFE9B0', 0, 1);
    }
    if (!game.respawnAt && (reducedMotion || game.simTick >= game.hitUntil || game.simTick % 12 < 7)) this.player(game, time);
    this.flush();
  }

  visible([x, y, z], margin = 1) {
    if (!this.view) return true;
    const m = this.view;
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (w <= 0) return false;
    const px = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    const py = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    return Math.abs(px) < margin && Math.abs(py) < margin;
  }
}
