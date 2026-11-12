// Fixture sources and holiday string lights as soft sprites.
// Stands in for a bloom pass at a fraction of the cost.

export const haloVertex = /* glsl */ `
attribute float aGroup;
attribute float aSize;
uniform float uG[5];
uniform float uPx;
varying float vI;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vI = uG[int(aGroup + 0.5)];
  // uPx converts world metres to pixels at unit distance.
  gl_PointSize = vI > 0.001 ? aSize * uPx / -mv.z : 0.0;
  gl_Position = projectionMatrix * mv;
}
`;

export const haloFragment = /* glsl */ `
varying float vI;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float core = smoothstep(0.22, 0.0, r);
  float glow = pow(max(1.0 - r, 0.0), 2.6);
  vec3 col = vec3(1.0, 0.40, 0.10) * glow * 0.9 + vec3(1.0, 0.78, 0.52) * core * 1.6;
  gl_FragColor = vec4(col * vI, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
