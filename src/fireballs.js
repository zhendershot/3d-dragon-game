import * as THREE from 'three';

export function createFireball(player) {
  // Create fireball group
  const fireballGroup = new THREE.Group();
  
  // Create fireball core geometry
  const coreGeometry = new THREE.SphereGeometry(1.5, 12, 12);
  
  // Create glowing material
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xFF6600,
    emissive: 0xFF3300,
    emissiveIntensity: 1.5,
    metalness: 0.3,
    roughness: 0.2
  });
  
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  fireballGroup.add(core);
  
  // Add outer glow
  const glowGeometry = new THREE.SphereGeometry(2.5, 12, 12);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xFF8800,
    transparent: true,
    opacity: 0.4,
    side: THREE.BackSide
  });
  
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  fireballGroup.add(glow);
  
  // Add point light to the fireball
  const light = new THREE.PointLight(0xFF5500, 5, 15);
  fireballGroup.add(light);
  
  // Position at dragon's mouth
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(player.model.quaternion);
  fireballGroup.position.copy(player.model.position).addScaledVector(direction, 8);
  
  // Create trailing particles
  const trailGroup = new THREE.Group();
  const particleCount = 5;
  
  for (let i = 0; i < particleCount; i++) {
    const size = 0.8 - (i * 0.1);
    const particleGeometry = new THREE.SphereGeometry(size, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ 
      color: i % 2 === 0 ? 0xFF4400 : 0xFF8800, 
      transparent: true,
      opacity: 0.7 - (i * 0.1)
    });
    
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.position.z = 1.5 + (i * 1);
    trailGroup.add(particle);
  }
  
  fireballGroup.add(trailGroup);
  
  return {
    mesh: fireballGroup,
    velocity: direction.multiplyScalar(-5), // Move in direction dragon is facing, faster than dragon
    boundingBox: new THREE.Box3().setFromObject(core), // Use core for collision detection
    age: 0,
    maxAge: 80, // Lifetime in frames
    trailParticles: trailGroup
  };
}

export function updateFireballs(fireballs, scene) {
  // Update each fireball
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const fireball = fireballs[i];
    
    // Move fireball
    fireball.mesh.position.add(fireball.velocity);
    
    // Update bounding box
    const tempBox = new THREE.Box3().setFromObject(fireball.mesh.children[0]);
    fireball.boundingBox.copy(tempBox);
    
    // Rotate the fireball for visual effect
    fireball.mesh.rotation.x += 0.05;
    fireball.mesh.rotation.z += 0.05;
    
    // Add some flicker effect to the core
    if (fireball.mesh.children[0] && fireball.mesh.children[0].material) {
      const flickerIntensity = 0.3;
      fireball.mesh.children[0].material.emissiveIntensity = 1.5 + (Math.random() - 0.5) * flickerIntensity;
      
      // Random scale fluctuation
      const scale = 0.9 + Math.random() * 0.2;
      fireball.mesh.children[0].scale.set(scale, scale, scale);
    }
    
    // Update glow
    if (fireball.mesh.children[1] && fireball.mesh.children[1].material) {
      fireball.mesh.children[1].material.opacity = 0.4 + Math.random() * 0.2;
    }
    
    // Update light intensity
    if (fireball.mesh.children[2]) {
      fireball.mesh.children[2].intensity = 4 + Math.random() * 2;
    }
    
    // Create trail particles
    if (Math.random() > 0.3) {
      const particleGeometry = new THREE.SphereGeometry(0.5, 6, 6);
      const particleMaterial = new THREE.MeshBasicMaterial({ 
        color: Math.random() > 0.5 ? 0xFF3300 : 0xFF8800, 
        transparent: true,
        opacity: 0.7
      });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(fireball.mesh.position);
      
      // Add random offset
      particle.position.x += (Math.random() - 0.5) * 2;
      particle.position.y += (Math.random() - 0.5) * 2;
      particle.position.z += (Math.random() - 0.5) * 2;
      
      particle.userData.type = 'particle';
      particle.userData.age = 0;
      particle.userData.maxAge = 20;
      scene.add(particle);
    }
    
    // Age and remove old fireballs
    fireball.age++;
    if (fireball.age > fireball.maxAge) {
      // Create explosion effect
      createExplosion(scene, fireball.mesh.position);
      
      scene.remove(fireball.mesh);
      fireballs.splice(i, 1);
    }
  }
  
  // Update particles (smoke trail)
  scene.children.forEach(object => {
    if (object.userData.type === 'particle') {
      object.userData.age++;
      object.scale.multiplyScalar(0.95);
      object.material.opacity *= 0.95;
      
      if (object.userData.age > object.userData.maxAge) {
        scene.remove(object);
      }
    }
    
    if (object.userData.type === 'explosion') {
      object.userData.age++;
      // Expand explosion
      object.scale.multiplyScalar(1.05);
      object.material.opacity *= 0.95;
      
      if (object.userData.age > object.userData.maxAge) {
        scene.remove(object);
      }
    }
  });
}

// Create explosion effect
function createExplosion(scene, position) {
  const explosionGeometry = new THREE.SphereGeometry(3, 12, 12);
  const explosionMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFF9900, 
    transparent: true,
    opacity: 0.8
  });
  const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
  explosion.position.copy(position);
  explosion.userData = { 
    type: 'explosion',
    age: 0,
    maxAge: 20
  };
  scene.add(explosion);
  
  // Add light flash
  const light = new THREE.PointLight(0xFF5500, 8, 30);
  light.position.copy(position);
  scene.add(light);
  
  // Remove light after a short time
  setTimeout(() => {
    scene.remove(light);
  }, 200);
  
  // Add smaller particles
  for (let i = 0; i < 10; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.8, 6, 6);
    const particleMaterial = new THREE.MeshBasicMaterial({ 
      color: i % 2 === 0 ? 0xFF4400 : 0xFF8800, 
      transparent: true,
      opacity: 0.8
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    
    // Random position around the explosion center
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 3;
    particle.position.copy(position);
    particle.position.x += Math.cos(angle) * radius;
    particle.position.y += (Math.random() - 0.5) * radius;
    particle.position.z += Math.sin(angle) * radius;
    
    particle.userData = {
      type: 'explosion_particle',
      age: 0,
      maxAge: 15 + Math.floor(Math.random() * 10),
      velocity: new THREE.Vector3(
        Math.cos(angle) * 0.3,
        (Math.random() - 0.3) * 0.3,
        Math.sin(angle) * 0.3
      )
    };
    
    scene.add(particle);
  }
  
  // Update explosion particles
  const updateExplosionParticles = () => {
    scene.children.forEach(object => {
      if (object.userData.type === 'explosion_particle') {
        object.userData.age++;
        
        // Move particle
        object.position.add(object.userData.velocity);
        
        // Shrink and fade
        object.scale.multiplyScalar(0.93);
        object.material.opacity *= 0.93;
        
        if (object.userData.age > object.userData.maxAge) {
          scene.remove(object);
        }
      }
    });
  };
  
  // Run the update a few times
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      updateExplosionParticles();
    }, i * 50);
  }
}