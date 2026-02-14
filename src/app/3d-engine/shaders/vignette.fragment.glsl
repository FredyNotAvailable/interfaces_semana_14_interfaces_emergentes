uniform sampler2D tDiffuse;
uniform float intensity; // Total strength of the effect (0 = off, 1 = full)
uniform float radius;    // Where the vignette starts (0.5 = circle touching edges)
uniform float feather;   // Softness of the edge

varying vec2 vUv;

void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    
    // Calculate distance from center (0.5, 0.5)
    float dist = distance(vUv, vec2(0.5));
    
    // Create the vignette mask
    // smoothstep returns:
    // 0.0 if dist <= radius - feather
    // 1.0 if dist >= radius
    // Interpolated in between
    // We want the reverse: 1.0 at center, 0.0 at edges
    
    float vignette = smoothstep(radius, radius - feather, dist);
    
    // Mix the scene color with black based on the calculated vignette and intensity
    // intensity controls how much the vignette affects the image
    // If intensity is 0, factor is 1.0 (original color)
    // If intensity is 1, factor is 'vignette' value
    
    float factor = mix(1.0, vignette, intensity);
    
    // Apply to RGB, keep Alpha
    gl_FragColor = vec4(texel.rgb * factor, texel.a);
}
