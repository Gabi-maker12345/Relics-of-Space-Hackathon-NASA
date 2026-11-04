/**
 * Shaders do engine GL — porta fiel da matemática do bundle original
 * (chunks `SHEET`/`LEAN`/`FLOOR`), com os mesmos nomes e constantes:
 *
 * - sheet(): wind (roll sobre a linha central) + S de profundidade em z
 *   (função de world x) + diagonal em y. É a MESMA superfície para cards,
 *   títulos e pills — nada flutua na frente de um card curvo.
 * - lean(): dobradiça em z também função de world x; o piso e os cards usam
 *   o mesmo ramp (por isso o fundo do original não é "reto").
 * - piso: sem horizonte; dissolve em vFar (smoothstep .2...95), grade com
 *   fwidth e alpha .08, banda de contato exponencial.
 * - luz: LIGHT_DIR (-0.4, 0.5, 1), gloss 48, spec .35, diff .12 (sheetLit).
 */

const SHEET_CHUNK = /* glsl */ `
const float SHEET_PI = 3.141592653589793;
const float SHEET_TAIL = 1.0;
const float SHEET_BANK = -0.16;
const float SHEET_DIAG = 0.03;
const float SHEET_WAVE = 0.0;
const float SHEET_WAVE_F = 0.8;
const float SHEET_WAVE_PH = 0.35;
const float SHEET_REAR_Y = 0.1;
const float SHEET_REAR_Z = 0.2;
const float SHEET_VTWIST = 1.8;
const float SHEET_SHIFT = -0.2;

uniform float uSheetW;   // frustum half-width at z=0 (0 = sheet off)
uniform float uSheetD;   // depth amplitude, world units
uniform float uSheetT;   // how much of the frame the S spans
uniform float uSheetC;   // 0 = bowl, 1 = near-to-far S
uniform float uSheetP;   // sheet strength (1 on the strip, 0 elsewhere)
uniform float uSheetV;   // scroll speed 0..1
uniform float uLeanA;    // depth at the frustum edge (door), world units
uniform float uLeanW;    // frustum half-width for the door
uniform float uHover;    // 0 rest, 1 hovered (dome + shade)
uniform float uDent;     // bow depth as a share of the height

float sheetQ(float wx) {
	return wx / max(uSheetW, 0.0001) * uSheetT + SHEET_SHIFT;
}

float sheetShape(float q) {
	return mix(1.0 - q * q, sin(SHEET_PI * q), uSheetC) * exp(-SHEET_TAIL * q * q);
}

float sheetShapeSlope(float q) {
	float g = exp(-SHEET_TAIL * q * q);
	float bowl = -2.0 * q * (1.0 + SHEET_TAIL * (1.0 - q * q));
	float ess = SHEET_PI * cos(SHEET_PI * q) - 2.0 * SHEET_TAIL * q * sin(SHEET_PI * q);
	return mix(bowl, ess, uSheetC) * g;
}

float sheetZ(float wx) {
	return -uSheetD * sheetShape(sheetQ(wx));
}

float sheetRoll(float wx) {
	if (uSheetW < 0.001) return 0.0;
	return SHEET_BANK * sheetShapeSlope(sheetQ(wx)) / SHEET_PI * uSheetC * uSheetP;
}

vec4 sheetWind(vec4 w) {
	float a = sheetRoll(w.x);
	if (uSheetV > 0.001 && uSheetW > 0.001 && uSheetP > 0.001) {
		float qe = w.x / uSheetW;
		a += SHEET_VTWIST * uSheetV * smoothstep(0.3, 0.9, abs(qe)) * sign(qe) * uSheetP;
	}
	if (abs(a) < 0.0001) return w;
	float s = sin(a);
	float c = cos(a);
	return vec4(w.x, w.y * c - w.z * s, w.y * s + w.z * c, w.w);
}

vec4 sheet(vec4 w) {
	w = sheetWind(w);
	w.z += sheetZ(w.x) * uSheetP;
	if (uSheetW > 0.001) {
		float qw = w.x / uSheetW;
		w.y += SHEET_DIAG * w.x * uSheetP;
		w.y += SHEET_WAVE * uSheetW * sin(SHEET_PI * (qw * SHEET_WAVE_F + SHEET_WAVE_PH)) * uSheetP;
		if (uSheetV > 0.001) {
			float m = 1.0 - smoothstep(-1.0, 0.3, qw);
			w.y += SHEET_REAR_Y * uSheetW * uSheetV * m * uSheetP;
			w.z += SHEET_REAR_Z * uSheetW * uSheetV * m * uSheetP;
		}
	}
	return w;
}

float leanRamp(float s) {
	s = clamp(s, -1.0, 1.0);
	return s * (1.5 - 0.5 * s * s);
}

float leanSlope(float s) {
	s = min(abs(s), 1.0);
	return 1.5 * (1.0 - s * s);
}

vec4 lean(vec4 w, float k) {
	if (uLeanW > 0.001 && k > 0.001) {
		w.z += uLeanA * leanRamp(w.x / uLeanW) * k;
	}
	return w;
}

float sheetDome(vec2 uv) {
	vec2 q = uv * 2.0 - 1.0;
	return (1.0 - q.x * q.x) * (1.0 - q.y * q.y);
}

float sheetShade(float wx, vec2 uv, float resY) {
	if (uSheetD < 0.001) return 0.0;
	float d = uSheetW > 0.001 && uSheetP > 0.001
		? clamp((uSheetD - sheetZ(wx)) / (2.0 * uSheetD), 0.0, 1.0) * uSheetP
		: 0.0;
	if (uHover > 0.0001) {
		d += (uHover * uDent * resY * sheetDome(uv)) / (2.0 * uSheetD);
	}
	return clamp(d, 0.0, 1.0);
}

float sheetOffset(float wx, vec2 uv, float resY) {
	float z = 0.0;
	if (uSheetW > 0.001 && uSheetP > 0.001 && uSheetD > 0.001) z += sheetZ(wx) * uSheetP;
	if (uLeanW > 0.001) z += uLeanA * leanRamp(wx / uLeanW) * uSheetP;
	if (uHover > 0.0001) z -= uHover * uDent * resY * sheetDome(uv);
	return z;
}

vec3 sheetNormal(float wx, vec2 uv, vec2 res) {
	float dzdx = 0.0;
	float dzdy = 0.0;
	if (uSheetW > 0.001 && uSheetP > 0.001 && uSheetD > 0.001) {
		dzdx += -uSheetD * sheetShapeSlope(sheetQ(wx)) * uSheetT / uSheetW * uSheetP;
	}
	if (uLeanW > 0.001) {
		dzdx += (uLeanA / uLeanW) * leanSlope(wx / uLeanW) * uSheetP;
	}
	if (uHover > 0.0001) {
		vec2 q = uv * 2.0 - 1.0;
		float a = uHover * uDent;
		dzdx += 4.0 * a * res.y * q.x * (1.0 - q.y * q.y) / max(res.x, 0.0001);
		dzdy += 4.0 * a * q.y * (1.0 - q.x * q.x);
	}
	vec3 n = normalize(vec3(-dzdx, -dzdy, 1.0));
	float a = sheetRoll(wx);
	if (abs(a) > 0.0001) {
		float s = sin(a);
		float c = cos(a);
		n = vec3(n.x, n.y * c - n.z * s, n.y * s + n.z * c);
	}
	return n;
}

const vec3 LIGHT_DIR = normalize(vec3(-0.4, 0.5, 1.0));
const float LIGHT_GLOSS = 48.0;
const float LIGHT_SPEC = 0.35;
const float LIGHT_DIFF = 0.12;

vec3 sheetLit(vec3 col, vec3 n, vec3 v, float amt) {
	if (amt < 0.001) return col;
	float d = dot(n, LIGHT_DIR) * 0.5 + 0.5;
	col *= 1.0 - LIGHT_DIFF * amt * (1.0 - d);
	vec3 h = normalize(LIGHT_DIR + v);
	return col + pow(max(dot(n, h), 0.0), LIGHT_GLOSS) * LIGHT_SPEC * amt;
}
`

export const glslCardVertex = /* glsl */ `
${SHEET_CHUNK}
uniform vec2 uRes;      // plane size in world units
varying vec2 vUv;
varying vec3 vFlat;

void main() {
	vUv = uv;
	vec3 p = position;
	// dent local, antes da model matrix (igual ao original)
	p.z -= uHover * uDent * uRes.y * sheetDome(uv);

	vec4 w = modelMatrix * vec4(p, 1.0);
	w = sheet(w);
	w = lean(w, uSheetP);

	vFlat = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`

export const glslCardFragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uAlpha;
uniform float uRadiusPx;
uniform vec2 uRes;
uniform float uShade;   // depth-shade strength (1 nos cards do strip)
uniform float uShadeS;
uniform float uWhite;   // wash out (flight/hero)
uniform float uScrim;   // scrim do título no rodapé do card
varying vec2 vUv;
varying vec3 vFlat;

${SHEET_CHUNK}

float roundedBox(vec2 pos, vec2 boxHalf, float radius) {
	vec2 q = abs(pos) - boxHalf + vec2(radius);
	return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
	float sd = roundedBox((vUv - 0.5) * uRes, uRes * 0.5, uRadiusPx);
	float mask = 1.0 - smoothstep(-1.6, 1.4, sd);

	vec4 sampled = texture2D(uMap, vUv);
	vec3 col = sampled.rgb;

	if (uShade > 0.001) {
		float depth = sheetShade(vFlat.x, vUv, uRes.y);
		col = mix(col, vec3(0.059), uShade * 0.8 * pow(depth, uShadeS));
		vec3 p = vFlat + vec3(0.0, 0.0, sheetOffset(vFlat.x, vUv, uRes.y));
		col = sheetLit(col, sheetNormal(vFlat.x, vUv, uRes), normalize(cameraPosition - p), uShade);
	}

	if (uScrim > 0.001) {
		float g = 1.0 - smoothstep(0.0, 0.5, vUv.y);
		col = mix(col, vec3(0.0), uScrim * 0.65 * g * g);
	}

	col = mix(col, vec3(1.0), uWhite);

	float alpha = mask * uOpacity * uAlpha * sampled.a;
	if (alpha <= 0.002) discard;
	gl_FragColor = vec4(col, alpha);
}`

export const glslGridVertex = /* glsl */ `
uniform float uLeanK;   // quanto da dobradiça o piso recebe
uniform float uLeanA;
uniform float uLeanW;
uniform float uRun;     // profundidade do piso além da faixa (world)
varying vec2 vUv;
varying float vFar;

float leanRampG(float s) {
	s = clamp(s, -1.0, 1.0);
	return s * (1.5 - 0.5 * s * s);
}

void main() {
	vUv = uv;
	vec4 w = modelMatrix * vec4(position, 1.0);
	// vFar: negativo na frente dos cards, 0 na linha de contato, 1 no fim do run
	vFar = -w.z / max(uRun, 0.0001);
	if (uLeanW > 0.001 && uLeanK > 0.001) {
		w.z += uLeanA * leanRampG(w.x / uLeanW) * uLeanK;
	}
	gl_Position = projectionMatrix * viewMatrix * w;
}`

export const glslGridFragment = /* glsl */ `
uniform vec3 uC0;       // base (céu) — dissolve para cá
uniform vec3 uC1;       // tint da superfície perto
uniform float uAlpha;   // presença do piso
uniform float uGrid;    // força das linhas
uniform vec2 uGridF;    // células no eixo X e ao longo do run
varying vec2 vUv;
varying float vFar;

void main() {
	float fade = 1.0 - smoothstep(0.2, 0.95, vFar);
	float contact = exp(-abs(vFar) * 14.0);

	vec3 col = mix(uC1, uC0, smoothstep(0.0, 0.8, vFar));
	col *= 1.0 - contact * 0.55;

	vec2 g = vec2(vUv.x * uGridF.x, vFar * uGridF.y);
	vec2 gf = abs(fract(g) - 0.5);
	vec2 gw = fwidth(g) * 1.5;
	vec2 lines = vec2(1.0) - smoothstep(vec2(0.0), gw, gf);
	float line = max(lines.x, lines.y);

	col += line * uGrid * fade;

	gl_FragColor = vec4(col, uAlpha * fade);
}`

export const glslHoleVertex = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

export const glslHoleFragment = /* glsl */ `
uniform float uP;
uniform float uAspect;
uniform float uTime;
varying vec2 vUv;

/**
 * Portal do original (observado): disco preto com um ARCO de metal escuro
 * fino — o aro quase não aparece, só um brilho frio no topo-esquerda e outro
 * no fundo. Sem ouro chapado.
 */
void main() {
	vec2 p = vUv * 2.0 - 1.0;
	float r = length(p);
	float edge = 0.995;
	float inner = edge - 0.045;
	float band = smoothstep(inner - 0.006, inner + 0.003, r) * (1.0 - smoothstep(edge - 0.006, edge + 0.003, r));
	float disc = 1.0 - smoothstep(inner - 0.006, inner + 0.004, r);
	float ang = atan(p.y, p.x * uAspect);

	// metal escuro: brilho frio concentrado no topo-esquerda e um segundo realce oposto
	float hi = pow(max(0.0, cos(ang - 2.35)), 18.0) * 0.9;
	float hi2 = pow(max(0.0, cos(ang + 0.85)), 26.0) * 0.35;
	float drift = 0.5 + 0.5 * sin(uTime * 0.18);
	vec3 metal = vec3(0.02, 0.022, 0.028);
	vec3 cold = vec3(0.72, 0.78, 0.86);
	vec3 ringColor = metal + cold * (hi * (0.4 + 0.25 * drift) + hi2 * (0.28 + 0.28 * drift));

	float discA = disc * uP;
	float ringA = band * uP;
	float alpha = max(discA, ringA);
	if (alpha <= 0.002) discard;
	vec3 rgb = mix(vec3(0.006), ringColor, clamp(ringA / max(alpha, 0.0001), 0.0, 1.0));
	gl_FragColor = vec4(rgb, alpha);
}`
