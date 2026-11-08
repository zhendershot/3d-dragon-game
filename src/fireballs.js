import * as THREE from 'three';

// Magma Shader definitions
const MagmaShader = {
  uniforms: {
    time: { value: 0 },
    emission: { value: 1.5 },
    color: { value: new THREE.Color(0xff4400) }
  },
  vertexShader: `
    uniform float time;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying float vNoise;

    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
      vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y
      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857; // 1.0/7.0
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      // Displacement
      float noiseVal = snoise(position * 0.5 + time * 2.0);
      vNoise = noiseVal;
      
      vec3 newPos = position + normal * (noiseVal * 0.3);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float emission;
    varying vec3 vNormal;
    varying float vNoise;

    void main() {
      // Fresnel effect
      vec3 viewDir = vec3(0.0, 0.0, 1.0); // Simplified view dir
      float fresnel = pow(1.0 - dot(vNormal, viewDir), 2.0);
      
      // Heat gradient based on noise
      vec3 hotColor = vec3(1.0, 1.0, 0.5);
      vec3 coolColor = color;
      
      vec3 finalColor = mix(coolColor, hotColor, vNoise * 0.5 + 0.5);
      finalColor += fresnel * vec3(1.0, 0.5, 0.0);
      
      gl_FragColor = vec4(finalColor * emission, 1.0);
    }
  `
};

// Object Pool
const fireballPool = [];
const maxFireballs = 20;

export function initFireballs(scene) {
  // Pre-allocate fireballs
  for (let i = 0; i < maxFireballs; i++) {
    const fireballGroup = createFireballMesh();
    fireballGroup.visible = false;
    scene.add(fireballGroup);
    fireballPool.push({
      mesh: fireballGroup,
      active: false,
      velocity: new THREE.Vector3(),
      boundingBox: new THREE.Box3(),
      age: 0,
      maxAge: 100
    });
  }
}

function createFireballMesh() {
  const group = new THREE.Group();

  // Custom Shader Material
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(MagmaShader.uniforms),
    vertexShader: MagmaShader.vertexShader,
    fragmentShader: MagmaShader.fragmentShader,
    transparent: true
  });

  const geometry = new THREE.SphereGeometry(1.5, 32, 32); // Med poly for displacement
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  // Outer glow sprite (Billboarding for better performance than geometry)
  const spriteMaterial = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: 0xff4400,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(6, 6, 1);
  group.add(sprite);

  // Light - Optimization: REMOVED real light to prevent forward rendering explosion
  // The glow sprite and shader emission are enough visually
  // const light = new THREE.PointLight(0xff4400, 4, 15);
  // light.castShadow = false; 
  // group.add(light);

  return group;
}

// Procedural glow texture helper
function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 100, 0, 1)');
  gradient.addColorStop(0.5, 'rgba(255, 0, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function getFireball(player, scene) {
  const fireball = fireballPool.find(f => !f.active);
  if (!fireball) return null;

  fireball.active = true;
  fireball.age = 0;
  fireball.mesh.visible = true;

  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(player.model.quaternion);
  fireball.mesh.position.copy(player.model.position).addScaledVector(direction, 8);
  fireball.velocity.copy(direction).multiplyScalar(5);

  // Update BBox
  const core = fireball.mesh.children[0];
  fireball.boundingBox.setFromObject(core);

  return fireball;
}

export function updateFireballs(fireballs, scene) {
  const time = performance.now() * 0.001;

  for (let i = fireballs.length - 1; i >= 0; i--) {
    const fireball = fireballs[i];

    // Move
    fireball.mesh.position.add(fireball.velocity);

    // Update Shader Time
    const core = fireball.mesh.children[0];
    if (core.material.uniforms) {
      core.material.uniforms.time.value = time;
    }

    // Update BBox
    const tempBox = new THREE.Box3().setFromObject(core);
    fireball.boundingBox.copy(tempBox);

    // Update trails (Optimized: Simple particle spawn)
    if (Math.random() > 0.6) {
      createSimpleParticle(scene, fireball.mesh.position);
    }

    fireball.age++;
    if (fireball.age > fireball.maxAge) {
      createExplosion(scene, fireball.mesh.position);

      // Deactivate
      fireball.active = false;
      fireball.mesh.visible = false;
      fireballs.splice(i, 1);
    }
  }

  updateParticles(scene);
}

// Optimized Particle System
const particles = [];
const particleGeometry = new THREE.SphereGeometry(0.4, 4, 4);
const explosionGeometry = new THREE.SphereGeometry(3, 8, 8);

function createSimpleParticle(scene, position) {
  const material = new THREE.MeshBasicMaterial({
    color: 0x555555,
    transparent: true,
    opacity: 0.5
  });
  const particle = new THREE.Mesh(particleGeometry, material);
  particle.position.copy(position);
  particle.position.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)));

  particle.userData = { type: 'particle', age: 0, maxAge: 15 };
  scene.add(particle);
  particles.push(particle);
}

function updateParticles(scene) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const object = particles[i];

    if (object.userData.type === 'particle') {
      object.userData.age++;
      object.position.y += 0.1; // Rise smoke
      object.scale.multiplyScalar(0.95);
      object.material.opacity *= 0.9;
      if (object.userData.age > object.userData.maxAge) {
        scene.remove(object);
        object.material.dispose();
        particles.splice(i, 1);
      }
    }
    else if (object.userData.type.includes('explosion')) {
      object.userData.age++;
      if (object.userData.velocity) object.position.add(object.userData.velocity);

      object.scale.multiplyScalar(0.95);
      if (object.material) object.material.opacity *= 0.9;

      if (object.userData.age > object.userData.maxAge) {
        scene.remove(object);
        if (object.material) object.material.dispose();
        particles.splice(i, 1);
      }
    }
  }
}

function createExplosion(scene, position) {
  // Simplified explosion
  const material = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
  const mesh = new THREE.Mesh(explosionGeometry, material);
  mesh.position.copy(position);
  mesh.userData = { type: 'explosion', age: 0, maxAge: 10 };
  scene.add(mesh);
  particles.push(mesh);

  // Light flash - NO SHADOW
  const light = new THREE.PointLight(0xffaa00, 5, 20);
  light.position.copy(position);
  light.castShadow = false;
  scene.add(light);
  setTimeout(() => scene.remove(light), 100);
}