import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import groundDetailTexture from './textures/ground_detail.png';
import waterNormalMapTexture from './textures/water_normal.png';
import rockTextureUrl from './textures/rock_texture.png';
import barkTextureUrl from './textures/bark_texture.png';
import pineNeedleTextureUrl from './textures/pine_needle_texture.png';

// Simplex Noise implementation for more natural terrain
class SimplexNoise {
  constructor(seed = Math.random()) {
    this.grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
    this.p = [];

    // Initialize the permutation array
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(seed * (i + 1) * 65536) % 256;
    }

    // To remove the need for index wrapping, double the permutation table length
    this.perm = new Array(512);
    this.gradP = new Array(512);

    // Skew factors
    this.F2 = 0.5 * (Math.sqrt(3) - 1);
    this.G2 = (3 - Math.sqrt(3)) / 6;

    this.F3 = 1 / 3;
    this.G3 = 1 / 6;

    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.gradP[i] = this.grad3[this.perm[i] % 12];
    }
  }

  noise2D(x, y) {
    // Find unit grid cell containing point
    let X = Math.floor(x), Y = Math.floor(y);

    // Get relative coords of point within grid cell
    x = x - X; y = y - Y;

    // Wrap grid cells to 0..255
    X = X & 255; Y = Y & 255;

    // Calculate noise contributions from corners
    const n00 = this.gradP[X + this.perm[Y]].dot2(x, y);
    const n01 = this.gradP[X + this.perm[Y + 1]].dot2(x, y - 1);
    const n10 = this.gradP[X + 1 + this.perm[Y]].dot2(x - 1, y);
    const n11 = this.gradP[X + 1 + this.perm[Y + 1]].dot2(x - 1, y - 1);

    // Compute the fade curve
    const u = this.fade(x);

    // Interpolate the four results
    return this.lerp(
      this.lerp(n00, n10, u),
      this.lerp(n01, n11, u),
      this.fade(y)
    );
  }

  // Utility methods
  dot2(x, y) { return this[0] * x + this[1] * y; }

  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

  lerp(a, b, t) { return (1 - t) * a + t * b; }

  // Add dot2 method to the grad3 vectors
  initGrad() {
    for (let i = 0; i < this.grad3.length; i++) {
      this.grad3[i].dot2 = function (x, y) {
        return this[0] * x + this[1] * y;
      };
    }
  }
}

// Create fractal noise by combining multiple octaves of noise
function fractalNoise(noise, x, y, octaves, persistence) {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += noise.noise2D(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  return total / maxValue;
}

// Create realistic sky with atmosphere
function createSky(scene, renderer) {
  // Add Sky
  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);

  const sun = new THREE.Vector3();

  // Sky parameters
  const effectController = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
    exposure: renderer.toneMappingExposure
  };

  const uniforms = sky.material.uniforms;
  uniforms['turbidity'].value = effectController.turbidity;
  uniforms['rayleigh'].value = effectController.rayleigh;
  uniforms['mieCoefficient'].value = effectController.mieCoefficient;
  uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

  // Function to update sun position and sky
  const updateSun = () => {
    const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
    const theta = THREE.MathUtils.degToRad(effectController.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    uniforms['sunPosition'].value.copy(sun);

    // Update directional light to match sun
    // Find the directional light in the scene (assuming it's the main sunlight)
    scene.traverse((child) => {
      if (child.isDirectionalLight) {
        child.position.copy(sun).multiplyScalar(2000);
      }
    });

    // Update environment map
    if (renderTarget) renderTarget.dispose();
    renderTarget = pmremGenerator.fromScene(scene);
    scene.environment = renderTarget.texture;
  };

  // Environment map generator
  let renderTarget;
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // Initial update
  updateSun();

  // No fog with realistic sky - the aerial perspective comes from the sky shader mostly, 
  // but we can add subtle fog for distance
  scene.fog = new THREE.FogExp2(0xdfe9f3, 0.0002);

  return { sky, sun, updateSun };
}

// Create simplified clouds
function createClouds(scene) {
  const cloudGroup = new THREE.Group();

  // Create a few simple clouds
  for (let i = 0; i < 15; i++) {
    // Create simple cloud shapes using sphere geometries
    const cloudMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });

    // Create cloud using multiple overlapping spheres
    const cloudPart = new THREE.SphereGeometry(100 + Math.random() * 50, 8, 8);
    const cloud = new THREE.Mesh(cloudPart, cloudMaterial);

    // Random position
    const radius = 1200 + Math.random() * 800;
    const angle = Math.random() * Math.PI * 2;
    cloud.position.set(
      Math.cos(angle) * radius,
      500 + Math.random() * 300,
      Math.sin(angle) * radius
    );

    cloudGroup.add(cloud);
  }

  scene.add(cloudGroup);
  return cloudGroup;
}

// Create realistic water
function createWater(normalMap) {
  // Create water geometry
  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

  // Create PBR water material
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x0066cc,
    transparent: true,
    opacity: 0.8,
    roughness: 0.1,
    metalness: 0.1,
    envMapIntensity: 1.0,
    side: THREE.DoubleSide,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5)
  });

  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -15;
  water.receiveShadow = true;

  return water;
}

// Create detailed mountain with rock texture and displacement
function createDetailedMountain(noise, position, scene, terrainData, rockTexture) {
  const baseHeight = terrainData.getTerrainHeight(position.x, position.z);
  const mountainHeight = 150 + Math.random() * 350;
  const mountainRadius = 100 + Math.random() * 150;

  // Create deformed cone for more natural shape
  const mountainGeometry = new THREE.ConeGeometry(
    mountainRadius,
    mountainHeight,
    32, // Higher segment count for displacement
    16
  );

  // Deform vertices with noise
  const positionAttribute = mountainGeometry.getAttribute('position');
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positionAttribute.count; i++) {
    vertex.fromBufferAttribute(positionAttribute, i);
    // Add noise to radius
    const noiseVal = noise.noise2D(vertex.x * 0.05, vertex.z * 0.05);
    const noiseValY = noise.noise2D(vertex.y * 0.02, vertex.x * 0.02);

    // Deform x and z based on noise
    if (vertex.y < mountainHeight * 0.9) { // Keep peak somewhat sharp
      vertex.x += noiseVal * 20;
      vertex.z += noiseValY * 20;
    }

    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  mountainGeometry.computeVertexNormals();

  const mountainMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    map: rockTexture,
    bumpMap: rockTexture,
    bumpScale: 5.0,
    roughness: 0.9,
    metalness: 0.1
  });

  const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
  mountain.castShadow = true;
  mountain.receiveShadow = true;
  mountain.position.set(position.x, baseHeight + (mountainHeight / 2) - 10, position.z); // Embed slightly
  scene.add(mountain);

  // Improved Snow Cap
  if (mountainHeight > 200) {
    const snowCapGeometry = new THREE.ConeGeometry(
      mountainRadius * 0.35,
      mountainHeight * 0.35,
      32,
      8
    );

    // Deform snow cap similarly
    const snowPos = snowCapGeometry.getAttribute('position');
    for (let i = 0; i < snowPos.count; i++) {
      vertex.fromBufferAttribute(snowPos, i);
      const noiseVal = noise.noise2D(vertex.x * 0.05, vertex.z * 0.05);
      vertex.x += noiseVal * 10;
      snowPos.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    snowCapGeometry.computeVertexNormals();

    const snowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0xffffff,
      emissiveIntensity: 0.1
    });

    const snowCap = new THREE.Mesh(snowCapGeometry, snowMaterial);
    snowCap.position.set(position.x, baseHeight + mountainHeight - (mountainHeight * 0.175), position.z);
    snowCap.castShadow = true;
    snowCap.receiveShadow = true;
    scene.add(snowCap);
  }

  return {
    mesh: mountain,
    params: {
      x: position.x,
      z: position.z,
      radius: mountainRadius,
      height: mountainHeight,
      baseY: baseHeight + (mountainHeight / 2) - 10 // Center Y of cylinder/cone
    }
  };
}

// Helper geometries for instancing
const sharedTrunkGeometry = new THREE.CylinderGeometry(0.5, 1.2, 1, 8);
const sharedBranchGeometry = new THREE.PlaneGeometry(1, 1);

// Add tree transformation matrices to arrays
function addTreeToInstances(dummy, position, height, trunkInstances, branchInstances) {
  // Trunk
  dummy.position.copy(position);
  dummy.position.y += height / 2;
  dummy.rotation.set(0, 0, 0);
  dummy.scale.set(1, height, 1);
  dummy.updateMatrix();
  trunkInstances.push(dummy.matrix.clone());

  // Branches
  const layers = 5;
  const layerHeight = (height * 0.7) / layers;

  for (let i = 0; i < layers; i++) {
    const yParams = height * 0.3 + i * layerHeight;
    const radius = (layers - i) * 1.5 + 1.0;
    const branchCount = 6;

    for (let j = 0; j < branchCount; j++) {
      const angle = (j / branchCount) * Math.PI * 2;

      dummy.position.set(
        position.x + Math.cos(angle) * (radius * 0.3),
        position.y + yParams,
        position.z + Math.sin(angle) * (radius * 0.3)
      );

      dummy.rotation.set(-Math.PI / 4, angle, 0); // Tilt down, rotate Y

      // Randomize slightly
      dummy.rotation.y += (Math.random() - 0.5) * 0.5;
      dummy.rotation.z += (Math.random() - 0.5) * 0.2;

      dummy.scale.set(radius, radius, 1);
      dummy.updateMatrix();
      branchInstances.push(dummy.matrix.clone());
    }
  }

  // Top tip (2 crossed planes)
  const topY = position.y + height + 1;
  const topScale = 2.5; // Approx size

  dummy.position.set(position.x, topY, position.z);
  dummy.scale.set(2, 3, 1);

  // Plane 1
  dummy.rotation.set(0, 0, 0);
  dummy.updateMatrix();
  branchInstances.push(dummy.matrix.clone());

  // Plane 2
  dummy.rotation.set(0, Math.PI / 2, 0);
  dummy.updateMatrix();
  branchInstances.push(dummy.matrix.clone());
}

// Create a forest with natural distribution
// Create a forest with natural distribution
function createForest(noise, terrainData, centerX, centerZ, radius, treeCount, dummy, trunkInstances, branchInstances) {
  // Use Poisson disc sampling for natural-looking distribution
  for (let i = 0; i < treeCount; i++) {
    // Use rejection sampling to create natural-looking clusters
    let x, z;
    let attempts = 0;

    do {
      // Random position within circle
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      x = centerX + Math.cos(angle) * r;
      z = centerZ + Math.sin(angle) * r;
      attempts++;
    } while (attempts < 5 && terrainData.getBiome(x, z) !== 'forest' && terrainData.getBiome(x, z) !== 'hills');

    // Get terrain height at this position
    const h = terrainData.getTerrainHeight(x, z);

    // Only place trees in suitable areas (not too steep, not too high)
    if (h > 22 && h < 120) {
      const height = 15 + Math.random() * 20; // Taller trees
      addTreeToInstances(dummy, new THREE.Vector3(x, h, z), height, trunkInstances, branchInstances);
    }
  }
}

// TerrainData class to handle height calculations and biome mapping
class TerrainData {
  constructor(noise, size, resolution) {
    this.noise = noise;
    this.size = size;
    this.resolution = resolution;
    this.grid = [];
    this.biomeMap = [];

    this.generateHeightMap();
    this.generateBiomeMap();
  }

  generateHeightMap() {
    const gridSize = Math.floor(this.size / this.resolution);

    // Initialize grid
    for (let x = 0; x < gridSize; x++) {
      this.grid[x] = [];
      for (let z = 0; z < gridSize; z++) {
        const worldX = (x - gridSize / 2) * this.resolution;
        const worldZ = (z - gridSize / 2) * this.resolution;

        // Calculate height using layered noise
        const baseHeight = fractalNoise(this.noise, worldX * 0.01, worldZ * 0.01, 6, 0.5) * 150;
        const mountainRange = fractalNoise(this.noise, worldX * 0.002, worldZ * 0.002, 4, 0.5) * 250;
        const details = fractalNoise(this.noise, worldX * 0.05, worldZ * 0.05, 2, 0.9) * 15;

        const height = baseHeight + mountainRange + details;
        this.grid[x][z] = height;
      }
    }
  }

  generateBiomeMap() {
    const gridSize = this.grid.length;

    // Initialize biome map
    for (let x = 0; x < gridSize; x++) {
      this.biomeMap[x] = [];
      for (let z = 0; z < gridSize; z++) {
        const height = this.grid[x][z];

        // Determine biome based on height and moisture (we can add moisture later)
        let biome;
        if (height < 10) {
          biome = 'water';
        } else if (height < 30) {
          biome = 'beach';
        } else if (height < 80) {
          biome = 'forest';
        } else if (height < 150) {
          biome = 'hills';
        } else if (height < 250) {
          biome = 'mountain';
        } else {
          biome = 'snowPeak';
        }

        this.biomeMap[x][z] = biome;
      }
    }
  }

  // Get terrain height at any world position using bilinear interpolation
  getTerrainHeight(x, z) {
    const gridSize = this.grid.length;
    const halfSize = this.size / 2;

    // Convert world coordinates to grid coordinates
    const gridX = Math.floor((x + halfSize) / this.resolution);
    const gridZ = Math.floor((z + halfSize) / this.resolution);

    // Ensure coordinates are within grid bounds
    if (gridX < 0 || gridX >= gridSize - 1 || gridZ < 0 || gridZ >= gridSize - 1) {
      return 0;
    }

    // Calculate interpolation weights
    const fracX = ((x + halfSize) % this.resolution) / this.resolution;
    const fracZ = ((z + halfSize) % this.resolution) / this.resolution;

    // Get heights at grid points
    const h00 = this.grid[gridX][gridZ];
    const h10 = this.grid[gridX + 1][gridZ];
    const h01 = this.grid[gridX][gridZ + 1];
    const h11 = this.grid[gridX + 1][gridZ + 1];

    // Bilinear interpolation
    const h0 = h00 * (1 - fracX) + h10 * fracX;
    const h1 = h01 * (1 - fracX) + h11 * fracX;

    return h0 * (1 - fracZ) + h1 * fracZ;
  }

  // Get biome at world position
  getBiome(x, z) {
    const gridSize = this.biomeMap.length;
    const halfSize = this.size / 2;

    // Convert world coordinates to grid coordinates
    const gridX = Math.floor((x + halfSize) / this.resolution);
    const gridZ = Math.floor((z + halfSize) / this.resolution);

    // Ensure coordinates are within grid bounds
    if (gridX < 0 || gridX >= gridSize || gridZ < 0 || gridZ >= gridSize) {
      return 'water';
    }

    return this.biomeMap[gridX][gridZ];
  }
}

// Main terrain creation function
export function createTerrain(scene, renderer) {
  // Create noise generator
  const noise = new SimplexNoise(Math.random());
  noise.initGrad();

  // Create terrain group
  const terrainGroup = new THREE.Group();

  // Load textures
  const textureLoader = new THREE.TextureLoader();
  const groundTexture = textureLoader.load(groundDetailTexture);
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(40, 40);

  // We need sand texture for beaches
  const sandTexture = groundTexture.clone(); // Re-use ground texture for now to prevent crash

  const waterNormalMap = textureLoader.load(waterNormalMapTexture);
  waterNormalMap.wrapS = THREE.RepeatWrapping;
  waterNormalMap.wrapT = THREE.RepeatWrapping;
  waterNormalMap.repeat.set(10, 10);

  const rockTexture = textureLoader.load(rockTextureUrl);
  rockTexture.wrapS = THREE.RepeatWrapping;
  rockTexture.wrapT = THREE.RepeatWrapping;
  rockTexture.repeat.set(4, 4);

  const barkTexture = textureLoader.load(barkTextureUrl);
  barkTexture.wrapS = THREE.RepeatWrapping;
  barkTexture.wrapT = THREE.RepeatWrapping;

  const pineNeedleTexture = textureLoader.load(pineNeedleTextureUrl);
  // pineNeedleTexture.colorSpace = THREE.SRGBColorSpace; // Ensure correct color space


  // Create terrain data for height lookups and biome mapping
  const terrainSize = 4000; // World size
  const resolution = 20; // Resolution for height grid
  const terrainData = new TerrainData(noise, terrainSize, resolution);

  // Create detailed ground mesh with high resolution
  const groundGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, 200, 200);
  groundGeometry.rotateX(-Math.PI / 2);

  // Apply height map using terrain data
  const vertices = groundGeometry.attributes.position.array;
  const vertexCount = vertices.length / 3;

  // Store biome data for vertex coloring
  const biomes = [];

  for (let i = 0; i < vertexCount; i++) {
    const x = vertices[i * 3];
    const z = vertices[i * 3 + 2];

    // Get height from terrain data
    const height = terrainData.getTerrainHeight(x, z);
    vertices[i * 3 + 1] = height;

    // Store biome for this vertex
    biomes.push(terrainData.getBiome(x, z));
  }

  // Update geometry after modifying vertices
  groundGeometry.computeVertexNormals();

  // Create a simple ground material based on color
  const groundMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.1,
    map: groundTexture,
    bumpMap: groundTexture,
    bumpScale: 5.0
  });

  // Create vertex colors based on height and biome
  const colors = [];

  for (let i = 0; i < vertexCount; i++) {
    const height = vertices[i * 3 + 1];
    const biome = biomes[i];

    // Colors based on height
    let color;
    if (height < 0) {
      color = new THREE.Color(0x0055aa); // Water
    } else if (height < 30) {
      color = new THREE.Color(0xc2b280); // Sand/beach
    } else if (height < 80) {
      color = new THREE.Color(0x3A5F0B); // Grass
    } else if (height < 150) {
      color = new THREE.Color(0x556B2F); // Hills
    } else if (height < 250) {
      color = new THREE.Color(0x808080); // Mountain
    } else {
      color = new THREE.Color(0xffffff); // Snow
    }

    // Add color for each vertex
    colors.push(color.r, color.g, color.b);
  }

  // Add colors to geometry
  groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  // Create and add ground mesh
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.receiveShadow = true;
  ground.castShadow = true;
  terrainGroup.add(ground);

  // Add sky with sun and clouds
  // Note: We use the renderer here to generate the environment map
  const { sky, sun, updateSun } = createSky(scene, renderer);

  // Add photorealistic water
  const water = createWater(waterNormalMap);
  terrainGroup.add(water);

  // Add mountains at specific locations for dramatic effect
  const mountainCount = 30;
  const mountains = [];

  for (let i = 0; i < mountainCount; i++) {
    // Distribute mountains in clusters for realism
    const angle = Math.random() * Math.PI * 2;
    const distance = 500 + Math.random() * 1200;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    // Add some variation to cluster
    const posX = x + (Math.random() - 0.5) * 300;
    const posZ = z + (Math.random() - 0.5) * 300;

    const mountainData = createDetailedMountain(
      noise,
      new THREE.Vector3(posX, 0, posZ),
      scene,
      terrainData,
      rockTexture
    );
    mountains.push(mountainData.params);
  }

  // Create forests in suitable areas
  const trunkInstances = [];
  const branchInstances = [];
  const dummy = new THREE.Object3D();

  const forestCount = 15;
  for (let i = 0; i < forestCount; i++) {
    // Distribute forests across the map
    const angle = Math.random() * Math.PI * 2;
    const distance = 300 + Math.random() * 1000;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    // Check biome at this location
    const biome = terrainData.getBiome(x, z);
    if (biome === 'forest' || biome === 'hills') {
      const forestRadius = 100 + Math.random() * 200;
      const treeCount = 20 + Math.floor(Math.random() * 30);
      createForest(noise, terrainData, x, z, forestRadius, treeCount, dummy, trunkInstances, branchInstances);
    }
  }

  // Create Instanced Meshes
  if (trunkInstances.length > 0) {
    const barkMaterial = new THREE.MeshStandardMaterial({
      map: barkTexture,
      roughness: 1.0,
      bumpMap: barkTexture,
      bumpScale: 0.5
    });
    const trunkMesh = new THREE.InstancedMesh(sharedTrunkGeometry, barkMaterial, trunkInstances.length);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;

    for (let i = 0; i < trunkInstances.length; i++) {
      trunkMesh.setMatrixAt(i, trunkInstances[i]);
    }
    trunkMesh.instanceMatrix.needsUpdate = true;
    scene.add(trunkMesh);

    const foliageMaterial = new THREE.MeshStandardMaterial({
      map: pineNeedleTexture,
      transparent: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      color: 0xffffff,
      roughness: 0.8
    });
    const branchMesh = new THREE.InstancedMesh(sharedBranchGeometry, foliageMaterial, branchInstances.length);
    branchMesh.castShadow = true;
    branchMesh.receiveShadow = true;

    for (let i = 0; i < branchInstances.length; i++) {
      branchMesh.setMatrixAt(i, branchInstances[i]);
    }
    branchMesh.instanceMatrix.needsUpdate = true;
    scene.add(branchMesh);
  }

  // Add lakes in low-lying areas
  const lakeCount = 10;
  for (let i = 0; i < lakeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 200 + Math.random() * 800;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    // Get height at this position
    const terrainHeight = terrainData.getTerrainHeight(x, z);

    // Only place lakes in lower areas
    if (terrainHeight < 20) {
      const lakeRadius = 30 + Math.random() * 70;
      const lakeGeometry = new THREE.CircleGeometry(lakeRadius, 32);
      lakeGeometry.rotateX(-Math.PI / 2);

      // Use water shader for lake surface
      const lakeMaterial = water.material.clone();
      lakeMaterial.opacity = 0.8;

      const lake = new THREE.Mesh(lakeGeometry, lakeMaterial);
      lake.position.set(x, terrainHeight + 1, z);
      lake.receiveShadow = true;

      // Add small beach around lake
      const beachRadius = lakeRadius + 5 + Math.random() * 10;
      const beachGeometry = new THREE.RingGeometry(lakeRadius - 0.5, beachRadius, 32);
      beachGeometry.rotateX(-Math.PI / 2);

      const beachMaterial = new THREE.MeshStandardMaterial({
        map: sandTexture,
        roughness: 0.8
      });

      const beach = new THREE.Mesh(beachGeometry, beachMaterial);
      beach.position.set(x, terrainHeight + 0.5, z);
      beach.receiveShadow = true;

      terrainGroup.add(lake);
      terrainGroup.add(beach);
    }
  }

  // Main render loop update
  const update = (time) => {
    // Animate water
    if (water.material.normalMap) {
      water.material.normalMap.offset.x = time * 0.05;
      water.material.normalMap.offset.y = time * 0.03;
    }
  };

  // Store update function and terrain data
  terrainGroup.userData = {
    terrainData: terrainData,
    update: update
  };

  // Expose helper methods for collision
  terrainGroup.getHeightAt = (x, z) => {
    // 1. Base terrain height
    let height = terrainData.getTerrainHeight(x, z);

    // 2. Check mountains
    // Simple cone equation: h = H * (1 - r/R)
    for (const m of mountains) {
      const dx = x - m.x;
      const dz = z - m.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < m.radius) {
        // Calculate point on cone surface
        // The mesh was placed at baseY, which is center. Base is at baseY - H/2. 
        // Peak is at baseY + H/2.
        // Actually, let's look at createDetailedMountain:
        // mountain.position.set(x, baseHeight + mountainHeight/2 - 10, z)
        // So the "ground" of the mountain is roughly baseHeight - 10.
        // The peak is at position.y + H/2.

        // Let's assume a simple cone sitting on the terrain for collision purposes
        // H = m.height
        // Peak Y = m.baseY + m.height/2
        // Base Y = m.baseY - m.height/2
        const mountainBaseY = m.baseY - m.height / 2;
        const coneHeightAtDist = m.height * (1 - dist / m.radius);

        // Add local noise variations (approximation) if needed, but a smooth cone is safer for collision
        const totalMountainHeight = mountainBaseY + coneHeightAtDist;

        if (totalMountainHeight > height) {
          height = totalMountainHeight;
        }
      }
    }

    return height;
  };
  terrainGroup.getBiomeAt = (x, z) => terrainData.getBiome(x, z);

  scene.add(terrainGroup);
  return terrainGroup;
}