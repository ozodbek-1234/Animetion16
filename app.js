/*********
 * made by Matthias Hurrle (@atzedent)
 */

/** @type {HTMLCanvasElement} */
const canvas = window.canvas
const gl = canvas.getContext('webgl')
const dpr = window.devicePixelRatio

const vertexSource = `
 #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
 
  attribute vec2 position;
 
  void main(void)
  {
    gl_Position = vec4(position, 0., 1.);
  }
`
const fragmentSource = `
/*********
 * made by Matthias Hurrle (@atzedent)
 */

 #ifdef GL_FRAGMENT_PRECISION_HIGH
 precision highp float;
 #else
 precision mediump float;
 #endif
 
 uniform vec2 resolution;
 uniform float time;
 uniform vec2 pointers[10];
 
 const float PI = radians(180.);
 
 #define TAU (2. * PI)
 #define MAX_STEPS 100
 #define MAX_DIST 100.
 #define SURF_DIST .001
 
 #define S smoothstep
 #define T .625 + time
 
 #define mouse pointers[0]
 
 mat2 Rot(float a) {
     float s = sin(a),
     c = cos(a);
 
     return mat2(c, -s, s, c);
 }
 
 float displacement (in vec3 p, float v) {
     return
     sin(v * p.x) *
     sin(v * p.y) *
     sin(v * p.z);
 }
 
 float Rythm() {
     float md = mod(-T, 1.);
     float rhm =
     -max(
         md * (.5 * -cos(T) - .5),
         md * (.5 * sin(T) - .5)
     );
 
     return rhm;
 }
 
 float sdBoxFrame(vec3 p, vec3 b, float e, float r) {
     p = abs(p) - b;
     vec3 q = abs(p+e) - e;
 
     return min(min(
         length(
             max(vec3(p.x, q.y, q.z), .0)) +
         min(max(p.x, max(q.y, q.z)), .0) - r,
         length(
             max(vec3(q.x, p.y, q.z), .0)) +
         min(max(q.x, max(p.y, q.z)), .0) - r),
         length(
             max(vec3(q.x, q.y, p.z), .0)) +
         min(max(q.x, max(q.y, p.z)), .0) - r);
 }
 
 
 float opDisplace(in vec3 p, float v) {
     p *= 1.0 + vec3(-.05, .05, -.05) *
     (.5 * sin(T * 10.) + .5);
 
     float d1 = sdBoxFrame(p, vec3(1., .5, 1.), .125, .075);
     float d2 = displacement(p, v);
 
     return d1+d2;
 }
 
 
 float opRep(in vec3 p, in vec3 c) {
     vec3 q = mod(p + .5 * c, c) - .5 * c;
 
     return opDisplace(q, 11. * Rythm());
 }
 
 float GetDist(vec3 p) {
     vec3 spread = vec3(14. + 2. * (.5 + .5 * -cos(T)));
     float d = opRep(p, spread);
 
     return d;
 }
 
 float RayMarch(vec3 ro, vec3 rd) {
     float dO = .0;
 
     float n = .0;
     for (int i = 0; i < MAX_STEPS; i++) {
         vec3 p = ro + rd*dO;
         float dS = GetDist(p);
 
         dO += dS;
 
         if (dO > MAX_DIST || abs(dS) < SURF_DIST) break;
     }
 
     return dO;
 }
 
 vec3 GetNormal(vec3 p) {
     float d = GetDist(p);
     vec2 e = vec2(.01, 0.);
 
     vec3 n = d - vec3(
         GetDist(p-e.xyy),
         GetDist(p-e.yxy),
         GetDist(p-e.yyx));
 
     return normalize(n);
 }
 
 vec3 GetRayDir(vec2 uv, vec3 p, vec3 l, float z) {
     vec3
     f = normalize(l-p),
     r = normalize(cross(vec3(.0, 1., .0), f)),
     u = cross(f, r),
     c = f*z,
     i = c + uv.x*r + uv.y*u,
     d = normalize(i);
 
     return d;
 }
 
 vec3 Render(inout vec3 ro, inout vec3 rd) {
     float d = RayMarch(ro, rd);
 
     vec3 col = vec3(.0);
 
     if (d < MAX_DIST) {
         vec3 p = ro + rd * d;
         vec3 n = GetNormal(p);
         vec3 r = reflect(rd, n);
 
         float diffuse = dot(
             n,
             normalize(ro)
         ) * .5 + .5;
 
         vec3 light = normalize(r);
         float spot = clamp(
             dot(light, reflect(n, vec3(.0))),
             .0,
             1.
         );
 
         col = vec3(.05 * diffuse);
         col += vec3(pow(spot, 16.));
 
         ro = p + n * SURF_DIST * 3.;
         rd = r;
     }
 
     return mix(col, vec3(.0), S(.0, 100., d));
 }
 
 void mainImage(out vec4 fragColor, in vec2 fragCoord) {
     float t = T * .125;
     float mn = min(resolution.x, resolution.y);
     float mx = max(resolution.x, resolution.y);
     vec2 uv = (
         2. * fragCoord.xy - resolution.xy
     ) / mix(mn, mx, .5 + .5 * sin(t));
     uv *= .5;
 
     vec2 m = mouse.xy / resolution.xy;
 
     vec3 ro = vec3(0., 3., -6.);
     bool aut = mouse.x == .0;
     ro.yz *= Rot(aut? cos(t): -m.y * PI + 1.);
     ro.xz *= Rot(aut ? -t: -m.x * TAU);
 
     vec3 rd = GetRayDir(uv, ro, vec3(.0), 1.);
 
     vec3 col = Render(ro, rd);
     vec3 bounce = Render(ro, rd);
 
     col += bounce;
 
     vec3 light = normalize(rd);
     vec3 sunlight = vec3(1., .95, .9);
     float sun = clamp(
         dot(light, reflect(rd, vec3(.0, 1., .0))),
         .0,
         1.
     );
 
     col += .2 * sunlight * pow(sun, 8.);
     col += .5 * sunlight * pow(sun, 256.);

     float rhm = Rythm();
     vec3 tint = vec3(.5, 1., .5);
     tint = vec3(1. - rhm, rhm, 1. - rhm) - (1. - tint);
 
     fragColor = vec4(
         S(.0, 1., 6. * tint * clamp(col, .0, 1.)),
         1.
     );
 }
 
 void main() {
     vec4 fragment_color;
 
     mainImage(fragment_color, gl_FragCoord.xy);
 
     gl_FragColor = fragment_color;
 }
`
const mouse = {
  /** @type {[number,number][]} */
  points: [],
  clear: function () {
    this.points = []
  },
  /** @param {[number,number]} point */
  add: function (point) {
    this.points.push(point)
  }
}

let time;
let buffer;
let program;
let resolution;
let pointers;
let vertices = []
let touches = [0, 0]

function resize() {
  const {
    innerWidth: width,
    innerHeight: height
  } = window

  canvas.width = width * dpr
  canvas.height = height * dpr

  gl.viewport(0, 0, width * dpr, height * dpr)
}

function compile(shader, source) {
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
  }
}

function setup() {
  const vs = gl.createShader(gl.VERTEX_SHADER)
  const fs = gl.createShader(gl.FRAGMENT_SHADER)

  program = gl.createProgram()

  compile(vs, vertexSource)
  compile(fs, fragmentSource)

  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
  }

  vertices = [
    -1.0, -1.0,
    1.0, -1.0,
    -1.0, 1.0,
    -1.0, 1.0,
    1.0, -1.0,
    1.0, 1.0
  ]

  buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

  const position = gl.getAttribLocation(program, "position")

  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  time = gl.getUniformLocation(program, "time")
  resolution = gl.getUniformLocation(program, 'resolution')
  pointers = gl.getUniformLocation(program, 'pointers')
}

function draw(now) {
  gl.clearColor(0, 0, 0, 1.)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

  gl.uniform1f(time, (now / 1000))
  gl.uniform2f(
    resolution,
    canvas.width,
    canvas.height
  )
  gl.uniform2fv(pointers, touches);
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length * .5)
}

function loop(now) {
  draw(now)

  requestAnimationFrame(loop)
}

function init() {
  setup()
  resize()
  loop(0)
}

function clearTouches() {
  for (let i = 0; i < touches.length; i++) {
    touches[i] = .0
  }
}

/** @param {TouchEvent} e */
function handleTouch(e) {
  const { height } = canvas

  clearTouches()

  let i = 0
  for (let touch of e.touches) {
    const { clientX: x, clientY: y } = touch

    touches[i++] = x * dpr
    touches[i++] = height - y * dpr
  }
}

/** @param {{ clientX: number, clientY: number }[]} other */
function mergeMouse(other) {
  return [
    ...mouse.points.map(([clientX, clientY]) => { return { clientX, clientY } }),
    ...other]
}

canvas.ontouchstart = handleTouch
canvas.ontouchmove = handleTouch
canvas.ontouchend = clearTouches

window.onresize = resize

function handleMouseMove(e) {
  handleTouch({
      touches: mergeMouse([{ clientX: e.clientX, clientY: e.clientY }])
    })
}

function handleMouseDown() {
  canvas.addEventListener("mousemove", handleMouseMove)
}

function handleMouseUp() {
  canvas.removeEventListener("mousemove", handleMouseMove)
  
  clearTouches()
  handleTouch({ touches: mergeMouse([]) })
}

if (!window.matchMedia("(pointer: coarse)").matches) {
  canvas.addEventListener("mousedown", handleMouseDown)
  canvas.addEventListener("mouseup", handleMouseUp)
}

document.addEventListener('DOMContentLoaded', init)