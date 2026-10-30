/**
 * Shaders do engine GL — valores extraídos do bundle original (CLONE_SPEC §5):
 * - hover do card: dente central (u_dent = 0.1 da altura, dome = (1-qx²)(1-qy²))
 * - túnel (uR/uP) + dente + máscara rounded-rect + fade angular
 * - piso: grade + bulge radial quando o "hole" (portal) abre
 * - hole: disco preto com anel fino iridescente (aproximação do pós-processo original)
 */
export const glslCardVertex = /* glsl */ `
uniform float uR;
uniform float uP;
uniform float uCenterX;
uniform float uHover;
uniform vec2 uHalfSize;
varying vec2 vUv;
varying float vAng;
varying float vDome;

void main() {
  vUv = uv;
  // dent: q em [-1,1]² ; dome = (1-qx²)(1-qy²) — 1 no centro, 0 nas bordas
  vec2 q = uv * 2.0 - 1.0;
  float dome = (1.0 - q.x * q.x) * (1.0 - q.y * q.y);
  vDome = dome * uHover;

  float planeWidth = uHalfSize.x * 2.0;
  float pxX = position.x * planeWidth;
  float angleWorld = uR > 0.0 ? ((uCenterX + pxX) / uR) : 0.0;
  float targetXLocal = uR > 0.0 ? ((uR * sin(angleWorld) - uCenterX) / planeWidth) : position.x;
  float targetZ = uR > 0.0 ? (uR * (cos(angleWorld) - 1.0)) : 0.0;

  // dente central (bow-in) — 10% da altura do plano no pico
  float dent = uHover * 0.1 * (uHalfSize.y * 2.0) * dome;

  vec3 displaced = vec3(
    mix(position.x, targetXLocal, uP),
    position.y,
    mix(0.0, targetZ, uP) - dent
  );
  vAng = abs(angleWorld);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}`

export const glslCardFragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uRadiusPx;
uniform vec2 uHalfSize;
uniform float uFadeAng;
varying vec2 vUv;
varying float vAng;
varying float vDome;

float roundedBox(vec2 pos, vec2 boxHalf, float radius) {
  vec2 q = abs(pos) - boxHalf + vec2(radius);
  return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
  float sd = roundedBox((vUv - 0.5) * uHalfSize * 2.0, uHalfSize, uRadiusPx);
  float mask = 1.0 - smoothstep(-1.0, 1.0, sd);
  float angular = 1.0 - smoothstep(uFadeAng * 0.85, uFadeAng, vAng);
  vec4 sampled = texture2D(uMap, vUv);
  float alpha = mask * angular * uOpacity * sampled.a;

  // shading do dente: o centro afunda e escurece de leve (normais simplificadas)
  float shade = 1.0 - 0.16 * vDome;

  if (alpha <= 0.002) discard;
  gl_FragColor = vec4(sampled.rgb * shade, alpha);
}`

export const glslGridVertex = /* glsl */ `
uniform vec2 uSize;
uniform float uHoleP;
uniform float uHoleR;
uniform vec2 uBulgeCenter; // xz em world
varying vec2 vGrid;
varying float vDepth;
void main() {
  vGrid = vec2(position.x * uSize.x, -position.y * uSize.y);
  vec3 world = (modelMatrix * vec4(position, 1.0)).xyz;
  if (uHoleP > 0.001) {
    vec2 dxz = world.xz - uBulgeCenter;
    float dist = length(dxz);
    float k = uHoleP * (1.0 - smoothstep(uHoleR * 0.55, uHoleR * 1.5, dist));
    world.y += k * uHoleR * 0.32;
    world.xz += normalize(dxz + vec2(1e-4)) * k * uHoleR * 0.05;
  }
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  vDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}`

export const glslGridFragment = /* glsl */ `
uniform float uCell;
uniform float uFadeStart;
uniform float uFadeEnd;
uniform float uNearStart;
uniform float uNearEnd;
uniform vec2 uSize;
uniform float uDim;
varying vec2 vGrid;
varying float vDepth;
void main() {
  vec2 scaled = (vGrid + uSize * 0.5) / uCell;
  vec2 grid = abs(fract(scaled - 0.5) - 0.5) / fwidth(scaled);
  float line = min(grid.x, grid.y);
  float alpha = 1.0 - min(line, 1.0);
  float fog = 1.0 - smoothstep(uFadeStart, uFadeEnd, vDepth);
  float near = smoothstep(uNearStart, uNearEnd, vDepth);
  float alphaWithFog = alpha * fog * near * 0.62 * uDim;
  if (alphaWithFog <= 0.004) discard;
  gl_FragColor = vec4(vec3(0.72), alphaWithFog);
}`

export const glslHoleVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

export const glslHoleFragment = /* glsl */ `
uniform float uP;      // 0 fechado → 1 aberto
uniform float uAspect; // largura/altura
varying vec2 vUv;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float edge = 0.995;
  // toro metálico: espessura ~8.5% do raio
  float inner = edge - 0.085;
  float band = smoothstep(inner - 0.004, inner + 0.006, r) * (1.0 - smoothstep(edge - 0.006, edge + 0.002, r));
  float disc = 1.0 - smoothstep(inner - 0.006, inner + 0.004, r);
  float ang = atan(p.y, p.x * uAspect);

  // iluminação simplificada: brilho varia com o ângulo (luz de cima-esquerda)
  float light = 0.45 + 0.55 * pow(0.5 + 0.5 * cos(ang - 2.2), 1.6);
  float streak = 0.62 + 0.38 * sin(ang * 3.0 + 1.2);
  vec3 gold = vec3(0.86, 0.68, 0.30);
  vec3 cream = vec3(0.98, 0.94, 0.84);
  vec3 cool = vec3(0.55, 0.70, 0.80);
  vec3 ringColor = mix(gold, cream, clamp(light, 0.0, 1.0));
  ringColor = mix(ringColor, cool, 0.18 * (0.5 + 0.5 * sin(ang + 1.4)));
  ringColor *= mix(0.55, 1.15, streak);

  float discA = disc * uP;
  float ringA = band * uP;
  float alpha = max(discA, ringA);
  if (alpha <= 0.002) discard;
  vec3 rgb = mix(vec3(0.006), ringColor, clamp(ringA / max(alpha, 0.0001), 0.0, 1.0));
  gl_FragColor = vec4(rgb, alpha);
}`
