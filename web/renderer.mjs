import { ISLAND_RADIUS } from '../src/game.mjs';

const TAU = Math.PI * 2;
const vertexSource = `
attribute vec3 a_position;
attribute vec3 a_normal;
uniform mat4 u_viewProjection;
uniform mat4 u_model;
uniform vec3 u_inverseScale;
varying mediump vec3 v_world;
varying mediump vec3 v_normal;
void main() {
  vec4 world = u_model * vec4(a_position, 1.0);
  v_world = world.xyz;
  v_normal = normalize(mat3(u_model) * (a_normal * u_inverseScale * u_inverseScale));
  gl_Position = u_viewProjection * world;
}
`;
const fragmentSource = `
precision mediump float;
uniform vec3 u_color;
uniform vec3 u_eye;
uniform vec3 u_lanterns[5];
uniform float u_glow;
uniform float u_terrain;
varying mediump vec3 v_world;
varying mediump vec3 v_normal;
void main() {
  float sunlight = max(dot(normalize(v_normal), normalize(vec3(-0.47, 0.8, -0.3))), 0.0);
  float islandLight = 0.0;
  float lanternLight = 0.0;
  for (int i = 0; i < 5; i++) {
    vec3 lantern = u_lanterns[i];
    islandLight += lantern.z * 0.07;
    lanternLight += lantern.z * (1.0 - smoothstep(0.0, 10.0, length(v_world.xz - lantern.xy)));
  }
  vec3 base = u_color * (0.55 + 0.45 * sunlight + islandLight);
  float grass = sin(v_world.x * 0.48 + sin(v_world.z * 0.35)) * cos(v_world.z * 0.21);
  base += u_terrain * (grass * 0.028 + 0.07 * smoothstep(28.0, 36.0, length(v_world.xz)));
  base += lanternLight * vec3(0.32, 0.18, 0.045) * (0.55 + 0.45 * sunlight);
  base = mix(base, u_color, u_glow);
  float fog = smoothstep(25.0, 112.0, distance(u_eye, v_world));
  gl_FragColor = vec4(mix(base, vec3(0.21, 0.18, 0.32), fog * (1.0 - u_glow * 0.5)), 1.0);
}
`;

function cylinder(top, bottom, sides = 16) {
  const vertices = [];
  const vertex = (point, normal) => vertices.push(...point, ...normal);
  for (let index = 0; index < sides; index++) {
    const a = index / sides * TAU;
    const b = (index + 1) / sides * TAU;
    const point = (angle, y, radius) => [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
    const upperA = point(a, 0.5, top);
    const upperB = point(b, 0.5, top);
    const lowerA = point(a, -0.5, bottom);
    const lowerB = point(b, -0.5, bottom);
    const n = [Math.cos((a + b) / 2), bottom - top, Math.sin((a + b) / 2)];
    for (const p of [upperA, lowerA, upperB, upperB, lowerA, lowerB]) vertex(p, n);
    for (const p of [[0, 0.5, 0], upperA, upperB]) vertex(p, [0, 1, 0]);
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

function buildIslandScenery() {
  const scenery = [];
  const add = (kind, pos, size, color, yaw = 0, glow = 0, terrain = 0) => {
    scenery.push({ kind, pos, size, color, yaw, glow, terrain });
  };
  const diameter = 2 * ISLAND_RADIUS;
  add('cliff', [0, -3.6, 0], [diameter, 7, diameter], '#463b5b');
  add('grass', [0, -0.72, 0], [diameter, 1.44, diameter], '#3b635c', 0, 0, 1);
  add('cliff', [0, -8, 0], [51, 4.2, 51], '#322842');
  add('disc', [0, 0.025, 0], [7, 0.05, 7], '#4c645d');
  for (let index = 0; index < 15; index++) {
    const angle = index * TAU / 15;
    const x = Math.cos(angle) * 32;
    const z = Math.sin(angle) * 32;
    const height = 3 + (index % 4) * 0.6;
    add('hex', [x, height * 0.28, z], [0.55, height * .56, 0.55], '#665761', angle);
    add('tree', [x, height * .63, z], [3.1, height * .95, 3.1], index % 2 ? '#254b51' : '#31545a', angle);
    add('tree', [x, height, z], [2.4, height * .8, 2.4], '#437269', angle);
  }
  for (let index = 0; index < 50; index++) {
    const angle = index * 2.39996;
    const radius = 11 + (index * 7) % 23;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    add('hex', [x, 0.12, z], [1.2, 0.35, 0.94], index % 2 ? '#69716b' : '#58665e', angle);
  }
  for (let index = 0; index < 26; index++) {
    const angle = index * 2.4;
    const radius = 48 + index % 4 * 11;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    add('sphere', [x, -4 - index % 7, z], [22, 4, 10], index % 2 ? '#726483' : '#655877', angle);
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
    this.uniforms = Object.fromEntries(['viewProjection', 'model', 'inverseScale', 'eye', 'color', 'glow', 'terrain']
      .map(name => [name, gl.getUniformLocation(this.program, 'u_' + name)]));
    this.uniforms.lanterns = gl.getUniformLocation(this.program, 'u_lanterns[0]');
    this.position = gl.getAttribLocation(this.program, 'a_position');
    this.normal = gl.getAttribLocation(this.program, 'a_normal');
    gl.enableVertexAttribArray(this.position);
    gl.enableVertexAttribArray(this.normal);
    gl.enable(gl.DEPTH_TEST);
    this.meshes = {};
    const meshes = {
      disc: cylinder(.5, .5, 40), grass: cylinder(.5, .5, 96), cliff: cylinder(.5, .32, 24),
      hex: cylinder(.5, .5, 6), post: cylinder(.5, .55, 4), hat: cylinder(.03, .5, 20),
      robe: cylinder(.25, .5, 12), tree: cylinder(.05, .5, 7),
      gem: sphere(5, 3), sphere: sphere(), ring: ring()
    };
    for (const [name, vertices] of Object.entries(meshes)) {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      this.meshes[name] = { buffer, count: vertices.length / 6 };
    }
    this.island = buildIslandScenery();
    this.colors = new Map();
  }

  draw(kind, [x, y, z], [sx, sy, sz], color, yaw = 0, glow = 0, terrain = 0) {
    const { gl, uniforms } = this;
    const mesh = this.meshes[kind];
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    if (!this.colors.has(color)) {
      this.colors.set(color, [1, 3, 5].map(index => Number.parseInt(color.slice(index, index + 2), 16) / 255));
    }
    gl.uniform3fv(uniforms.color, this.colors.get(color));
    gl.uniform1f(uniforms.glow, glow);
    gl.uniform1f(uniforms.terrain, terrain);
    gl.uniform3f(uniforms.inverseScale, 1 / sx, 1 / sy, 1 / sz);
    gl.uniformMatrix4fv(uniforms.model, false, [
      c * sx, 0, -s * sx, 0, 0, sy, 0, 0, s * sz, 0, c * sz, 0, x, y, z, 1
    ]);
    if (this.currentMesh !== mesh) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      gl.vertexAttribPointer(this.position, 3, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(this.normal, 3, gl.FLOAT, false, 24, 12);
      this.currentMesh = mesh;
    }
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  }

  lantern(lantern, tuning, time) {
    const [x, , z] = lantern.pos;
    const lit = lantern.lit;
    const color = lit ? '#ffc275' : '#b191ba';
    const base = '#414555';
    this.draw('hex', [x, .18, z], [2.5, .36, 2.5], base);
    this.draw('hex', [x, .46, z], [1.8, .25, 1.8], '#82717d');
    this.draw('post', [x, 1.45, z], [.47, 1.9, .47], '#76585e', Math.PI / 4);
    this.draw('hex', [x, 2.48, z], [1.5, .23, 1.5], '#593f54');
    this.draw('hex', [x, 3.03, z], [1.24, .95, 1.24], color, time * .1, lit ? 1 : .28);
    this.draw('hat', [x, 3.72, z], [1.95, .67, 1.95], lit ? '#d78154' : '#685471');
    this.draw('gem', [x, 4.09, z], [.3, .33, .3], color, 0, lit ? 1 : .2);
    if (lit) this.draw('ring', [x, .06, z], [2 * tuning.safe_radius, 1, 2 * tuning.safe_radius], '#ca9765', 0, .35);
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
    this.draw('disc', [x, .025, z], [1.35, .025, .96], '#294345');
    part('sphere', -.21, .24, lean, [.31, .48, .44], '#303246');
    part('sphere', .21, .24, -lean, [.31, .48, .44], '#303246');
    part('robe', 0, .77, 0, [1.02, 1.05, .73], '#e4926b');
    part('sphere', 0, 1.43, .03, [.76, .77, .71], '#f2b382');
    part('sphere', 0, 1.48, -.24, [.7, .7, .3], '#443044');
    part('hat', 0, 1.97, 0, [1.58, .60, 1.58], '#edbe78');
    part('disc', 0, 1.68, 0, [1.59, .045, 1.59], '#d6945a');
    part('post', .58, 1.48, .06, [.055, .34, .055], '#583b44');
    part('hex', .58, 1.3, .06, [.26, .31, .26], '#ffcb7b', 1);
  }

  render(game, yaw, time, pulseTick) {
    const { canvas, gl, uniforms } = this;
    const scale = Math.min(devicePixelRatio, 1.5, 1440 / Math.max(canvas.clientWidth, 1));
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
    const theta = yaw * Math.PI / 180;
    const forwardX = Math.sin(theta);
    const forwardZ = Math.cos(theta);
    const eye = [x - forwardX * 8.7, 5.8 + y * .55, z - forwardZ * 8.7];
    const target = [x + forwardX * 5.6, 1.1 + y * .55, z + forwardZ * 5.6];
    gl.uniformMatrix4fv(uniforms.viewProjection, false, viewProjection(eye, target, width / height));
    gl.uniform3fv(uniforms.eye, eye);
    gl.uniform3fv(uniforms.lanterns, game.lanterns.flatMap(lantern => [lantern.pos[0], lantern.pos[2], Number(lantern.lit)]));

    for (const prop of this.island) this.draw(prop.kind, prop.pos, prop.size, prop.color, prop.yaw, prop.glow, prop.terrain);
    for (const lantern of game.lanterns) this.lantern(lantern, game.tuning, time);
    for (const [index, mote] of game.motes.entries()) {
      const [mx, , mz] = mote.pos;
      const bob = Math.sin(time * 2.9 + index) * .21;
      this.draw('gem', [mx, .84 + bob, mz], [.38, .48, .38], '#ffd781', time * 1.8 + index, 1);
      this.draw('gem', [mx + .25, 1.13 - bob, mz + .24], [.13, .13, .13], '#ffaa57', 0, .95);
    }
    for (const [index, shade] of game.shades.entries()) {
      const [sx, sy, sz] = shade.pos;
      const stunned = shade.state === 'stunned';
      const bob = Math.sin(time * 4.2 + index) * .13;
      const heading = Math.atan2(x - sx, z - sz);
      this.draw('sphere', [sx, sy + bob, sz], [1.45, 1.85, 1.22], stunned ? '#665588' : '#39254d', heading);
      this.draw('sphere', [sx, sy * .65 + bob, sz], [1.7, .8, 1.15], '#302041', heading);
      for (const offset of [-.22, .22]) {
        this.draw('gem', [sx + Math.sin(heading) * .5 + Math.cos(heading) * offset, sy + .22 + bob,
          sz + Math.cos(heading) * .5 - Math.sin(heading) * offset],
        [.19, .21, .19], stunned ? '#ffe3a1' : '#eb9ede', 0, 1);
      }
    }
    const pulseAge = game.tick - pulseTick;
    if (pulseAge < 28) {
      const diameter = 1 + pulseAge / 28 * game.tuning.pulse_radius * 2;
      this.draw('ring', [x, .09, z], [diameter, 1, diameter], '#ffe3a8', 0, 1);
    }
    this.player(game, time);
  }
}
