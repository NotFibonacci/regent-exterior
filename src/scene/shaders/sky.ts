export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

export const skyFragment = /* glsl */ `
uniform float uNight;
uniform vec3 uMoonDir;
varying vec3 vDir;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  vec3 d = normalize(vDir);
  float t = smoothstep(-0.04, 0.6, d.y);

  // Dusk: ember at the western horizon under deep blue.
  float west = 0.5 + 0.5 * dot(normalize(d.xz + 1e-4), normalize(vec2(-0.8, -0.6)));
  vec3 duskHor = mix(vec3(0.16, 0.12, 0.16), vec3(0.62, 0.27, 0.09), west * west);
  vec3 dusk = mix(duskHor, vec3(0.035, 0.07, 0.19), pow(t, 0.5));
  vec3 night = mix(vec3(0.016, 0.022, 0.046), vec3(0.006, 0.010, 0.030), t);
  vec3 col = mix(dusk, night, uNight);

  // Moon: small hard disc, restrained halo.
  float m = dot(d, uMoonDir);
  float moonOn = mix(0.35, 1.0, uNight);
  col += vec3(0.95, 0.97, 1.0) * smoothstep(0.99962, 0.99974, m) * 2.2 * moonOn;
  col += vec3(0.62, 0.71, 0.85) * (pow(max(m, 0.0), 900.0) * 0.35 + pow(max(m, 0.0), 60.0) * 0.035) * moonOn;

  // A few fixed stars; sparse on purpose. Each is a soft round point in
  // the middle of its cell, not the cell itself.
  vec3 g = d * 190.0;
  float s = hash3(floor(g));
  float pt = smoothstep(0.16, 0.02, length(fract(g) - 0.5));
  col += vec3(0.8, 0.85, 1.0) * step(0.9972, s) * pt * uNight * smoothstep(0.08, 0.45, d.y) * 0.7;

  // Below the horizon everything falls to ink.
  col *= smoothstep(-0.16, 0.02, d.y);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
}
`;
