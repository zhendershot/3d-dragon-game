import * as THREE from 'three';

// Simplex Noise implementation for more natural terrain
class SimplexNoise {
  constructor(seed = Math.random()) {
    this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    this.p = [];
    
    // Initialize the permutation array
    for(let i = 0; i < 256; i++) {
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
    
    for(let i = 0; i < 512; i++) {
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
    for(let i = 0; i < this.grad3.length; i++) {
      this.grad3[i].dot2 = function(x, y) {
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
  
  for(let i = 0; i < octaves; i++) {
    total += noise.noise2D(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  
  return total / maxValue;
}

// Create a simplified sky background
function createSky(scene) {
  // Set scene background color to sky blue
  scene.background = new THREE.Color(0x87CEEB);
  
  // Create a basic sun
  const sunGeometry = new THREE.SphereGeometry(60, 16, 16);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffcc,
    transparent: true,
  });
  
  const sun = new THREE.Mesh(sunGeometry, sunMaterial);
  sun.position.set(500, 400, -1000);
  scene.add(sun);
  
  // Add simple fog
  scene.fog = new THREE.FogExp2(0xabd5fd, 0.0005);
  
  return { sun };
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

// Create simplified water
function createWater() {
  // Create water geometry
  const waterGeometry = new THREE.PlaneGeometry(4000, 4000);
  
  // Create simple water material
  const waterMaterial = new THREE.MeshBasicMaterial({
    color: 0x0055aa,
    transparent: true,
    opacity: 0.6
  });
  
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -15;
  water.receiveShadow = true;
  
  return water;
}

// Create simplified mountain shapes
function createDetailedMountain(noise, position, scene, terrainData) {
  const baseHeight = terrainData.getTerrainHeight(position.x, position.z);
  const mountainHeight = 150 + Math.random() * 350;
  const mountainRadius = 80 + Math.random() * 150;
  
  // Use cone for peak and cylinder for base to create more realistic shape
  const mountainGeometry = new THREE.ConeGeometry(
    mountainRadius * 0.8, 
    mountainHeight, 
    16, 
    4
  );
  
  // Create simple materials for mountain
  const mountainMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x808080,
    flatShading: true
  });
  
  const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
  mountain.castShadow = true;
  mountain.receiveShadow = true;
  
  // Position on the terrain
  mountain.position.set(position.x, baseHeight + (mountainHeight/2), position.z);
  scene.add(mountain);
  
  // Add snow cap
  if (mountainHeight > 200) {
    const snowCapGeometry = new THREE.ConeGeometry(
      mountainRadius * 0.4, 
      mountainHeight * 0.3, 
      16, 
      2
    );
    
    const snowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.1
    });
    
    const snowCap = new THREE.Mesh(snowCapGeometry, snowMaterial);
    snowCap.position.set(position.x, baseHeight + mountainHeight - 10, position.z);
    snowCap.castShadow = true;
    snowCap.receiveShadow = true;
    
    scene.add(snowCap);
  }
  
  return mountain;
}

// Create simplified trees
function createRealisticTree(scene, position, height) {
  const treeGroup = new THREE.Group();
  
  // Trunk
  const trunkGeometry = new THREE.CylinderGeometry(0.8, 1.5, height, 8);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.9
  });
  
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  trunk.position.y = height / 2;
  treeGroup.add(trunk);
  
  // Create foliage
  const foliageSize = 4 + Math.random() * 6;
  
  // Create conical foliage
  const foliageGeometry = new THREE.ConeGeometry(foliageSize, foliageSize * 1.5, 8);
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.1, 0.4, 0.1),
    roughness: 0.8
  });
  
  const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
  foliage.castShadow = true;
  foliage.receiveShadow = true;
  foliage.position.y = height + (foliageSize * 0.75);
  treeGroup.add(foliage);
  
  // Position tree on terrain
  treeGroup.position.copy(position);
  scene.add(treeGroup);
  
  return treeGroup;
}

// Create a forest with natural distribution
function createForest(scene, noise, terrainData, centerX, centerZ, radius, treeCount) {
  const trees = [];
  
  // Use Poisson disc sampling for natural-looking distribution
  for (let i = 0; i < treeCount; i++) {
    // Use rejection sampling to create natural-looking clusters
    let x, z;
    let attempts = 0;
    
    do {
      // Random position within circle
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * radius;
      x = centerX + Math.cos(angle) * distance;
      z = centerZ + Math.sin(angle) * distance;
      
      // Check distance to other trees
      let tooClose = false;
      for (const tree of trees) {
        const dx = tree.position.x - x;
        const dz = tree.position.z - z;
        const distSq = dx * dx + dz * dz;
        if (distSq < 25) { // Minimum distance between trees
          tooClose = true;
          break;
        }
      }
      
      attempts++;
      if (!tooClose || attempts > 30) break;
    } while (true);
    
    // Get terrain height at this position
    const terrainHeight = terrainData.getTerrainHeight(x, z);
    
    // Only place trees in suitable areas (not too steep, not too high)
    if (terrainHeight < 80) {
      const treeHeight = 8 + Math.random() * 12;
      const tree = createRealisticTree(scene, new THREE.Vector3(x, terrainHeight, z), treeHeight);
      trees.push(tree);
    }
  }
  
  return trees;
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
export function createTerrain(scene) {
  // Create noise generator
  const noise = new SimplexNoise(Math.random());
  noise.initGrad();
  
  // Create terrain group
  const terrainGroup = new THREE.Group();
  
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
    roughness: 0.8,
    metalness: 0.2
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
  const { sky, sun } = createSky(scene);
  
  // Add photorealistic water
  const water = createWater();
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
    
    const mountain = createDetailedMountain(
      noise, 
      new THREE.Vector3(posX, 0, posZ),
      scene,
      terrainData
    );
    mountains.push(mountain);
  }
  
  // Create forests in suitable areas
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
      createForest(scene, noise, terrainData, x, z, forestRadius, treeCount);
    }
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
  
  // Simplified update function - no complex animations
  const update = (time) => {
    // Nothing to update in simplified version
  };
  
  // Store update function and terrain data
  terrainGroup.userData = {
    terrainData: terrainData,
    update: update
  };
  
  scene.add(terrainGroup);
  return terrainGroup;
}