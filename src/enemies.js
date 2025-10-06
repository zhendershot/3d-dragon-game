import * as THREE from 'three';

// Helper to adjust color brightness
function adjustColor(color, factor) {
  const c = new THREE.Color(color);
  c.r *= factor;
  c.g *= factor;
  c.b *= factor;
  return c;
}

// Create a detailed enemy dragon model
function createDetailedEnemyDragon(color) {
  const group = new THREE.Group();
  
  // Body - more elongated and streamlined
  const bodyGeometry = new THREE.CapsuleGeometry(1.2, 6, 8, 16);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: color,
    roughness: 0.7,
    metalness: 0.3,
    flatShading: false
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.castShadow = true;
  body.position.y = 0;
  group.add(body);
  
  // Neck - separate from body for more realistic shape
  const neckGeometry = new THREE.CapsuleGeometry(0.9, 3, 8, 8);
  neckGeometry.rotateX(Math.PI / 6); // Angle the neck upward slightly
  const neckMaterial = new THREE.MeshStandardMaterial({ 
    color: adjustColor(color, 0.95),
    roughness: 0.7,
    metalness: 0.3
  });
  const neck = new THREE.Mesh(neckGeometry, neckMaterial);
  neck.position.z = -4;
  neck.position.y = 0.5;
  group.add(neck);
  
  // Head - more detailed with features
  const headGroup = new THREE.Group();
  const headGeometry = new THREE.SphereGeometry(1.2, 12, 12);
  const headMaterial = new THREE.MeshStandardMaterial({ 
    color: adjustColor(color, 0.9),
    roughness: 0.6,
    metalness: 0.3
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  headGroup.add(head);
  
  // Snout
  const snoutGeometry = new THREE.ConeGeometry(0.7, 2, 8);
  snoutGeometry.rotateX(-Math.PI / 2);
  const snoutMaterial = new THREE.MeshStandardMaterial({ 
    color: adjustColor(color, 0.85),
    roughness: 0.7,
    metalness: 0.2
  });
  const snout = new THREE.Mesh(snoutGeometry, snoutMaterial);
  snout.position.z = -1.2;
  headGroup.add(snout);
  
  // Horns
  const hornGeometry = new THREE.ConeGeometry(0.2, 1.5, 8);
  const hornMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xAAAAAA,
    roughness: 0.6,
    metalness: 0.8
  });
  
  const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
  leftHorn.position.set(-0.6, 0.7, -0.2);
  leftHorn.rotation.set(Math.PI / 4, 0, -Math.PI / 8);
  headGroup.add(leftHorn);
  
  const rightHorn = new THREE.Mesh(hornGeometry, hornMaterial);
  rightHorn.position.set(0.6, 0.7, -0.2);
  rightHorn.rotation.set(Math.PI / 4, 0, Math.PI / 8);
  headGroup.add(rightHorn);
  
  // Eyes
  const eyeGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const eyeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFFFF00, // Yellow eyes for enemies
    roughness: 0.1,
    metalness: 0.9,
    emissive: 0x555500
  });
  
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.6, 0.2, -0.9);
  headGroup.add(leftEye);
  
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.6, 0.2, -0.9);
  headGroup.add(rightEye);
  
  // Position head
  headGroup.position.z = -6;
  headGroup.position.y = 0.8;
  group.add(headGroup);
  
  // Wings - more intricate with detail
  const wingGroup = createDetailedWing(color);
  
  const leftWing = wingGroup.clone();
  leftWing.position.set(-1.5, 0.5, 0);
  leftWing.rotation.y = Math.PI / 8;
  leftWing.rotation.z = -Math.PI / 8;
  leftWing.name = "leftWing";
  group.add(leftWing);
  
  const rightWing = wingGroup.clone();
  rightWing.scale.x = -1; // Mirror
  rightWing.position.set(1.5, 0.5, 0);
  rightWing.rotation.y = -Math.PI / 8;
  rightWing.rotation.z = Math.PI / 8;
  rightWing.name = "rightWing";
  group.add(rightWing);
  
  // Tail - multi-segmented for animation
  const tailSegments = 5;
  let previousSegment = body;
  let tailWidth = 0.8;
  
  for (let i = 0; i < tailSegments; i++) {
    const segmentSize = 1.2 - (i * 0.2);
    const segmentLength = 2 - (i * 0.3);
    const segmentGeometry = new THREE.CapsuleGeometry(segmentSize * tailWidth, segmentLength, 8, 8);
    segmentGeometry.rotateX(Math.PI / 2);
    
    const segmentMaterial = new THREE.MeshStandardMaterial({ 
      color: adjustColor(color, 0.9 - (i * 0.05)),
      roughness: 0.7,
      metalness: 0.3
    });
    
    const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
    // Position based on the previous segment
    segment.position.z = previousSegment.position.z + 2 + (i * 0.5);
    segment.position.y = previousSegment.position.y - (i * 0.1);
    segment.castShadow = true;
    group.add(segment);
    
    previousSegment = segment;
  }
  
  // Add spikes along back
  for (let i = 0; i < 7; i++) {
    const spikeHeight = 0.5 + (i < 3 ? 0 : (6 - i) * 0.1);
    const spikeGeometry = new THREE.ConeGeometry(0.2, spikeHeight, 4);
    const spikeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xDDDDDD,
      roughness: 0.6,
      metalness: 0.7
    });
    
    const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    spike.position.z = -3 + (i * 1.5);
    spike.position.y = 1.2 - (i * 0.1);
    group.add(spike);
  }
  
  // Make the dragon smaller overall to take up less screen space
  group.scale.set(0.7, 0.7, 0.7);
  
  return group;
}

// Helper to create a detailed wing
function createDetailedWing(color) {
  const wingGroup = new THREE.Group();
  
  // Wing frame (bone structure)
  const frameGeometry = new THREE.BoxGeometry(0.2, 0.2, 10);
  frameGeometry.rotateY(Math.PI / 2);
  const frameMaterial = new THREE.MeshStandardMaterial({ 
    color: adjustColor(color, 0.7),
    roughness: 0.7,
    metalness: 0.3
  });
  const mainFrame = new THREE.Mesh(frameGeometry, frameMaterial);
  wingGroup.add(mainFrame);
  
  // Secondary frames
  for (let i = 1; i < 5; i++) {
    const secondaryLength = 8 - (i * 1.5);
    const secondaryGeometry = new THREE.BoxGeometry(0.15, 0.15, secondaryLength);
    secondaryGeometry.rotateZ(Math.PI / 8 * i);
    const secondaryFrame = new THREE.Mesh(secondaryGeometry, frameMaterial);
    secondaryFrame.position.set(0, 0, i * 2);
    wingGroup.add(secondaryFrame);
  }
  
  // Wing membrane
  const membraneGeometry = new THREE.CircleGeometry(5, 16, 0, Math.PI / 2);
  membraneGeometry.rotateY(Math.PI / 2);
  membraneGeometry.rotateZ(Math.PI / 2);
  
  const membraneMaterial = new THREE.MeshStandardMaterial({ 
    color: adjustColor(color, 0.6),
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    roughness: 0.6,
    metalness: 0.1
  });
  
  const membrane = new THREE.Mesh(membraneGeometry, membraneMaterial);
  membrane.position.z = 5;
  wingGroup.add(membrane);
  
  return wingGroup;
}

export async function createEnemies(scene, count, loadingManager) {
  const enemies = [];
  const colors = [0x0000FF, 0x00FF00, 0xFFFF00, 0xFF00FF, 0x00FFFF];
  
  // Track loading if manager is provided
  if (loadingManager) {
    loadingManager.itemStart('enemies');
  }
  
  for (let i = 0; i < count; i++) {
    const color = colors[i % colors.length];
    const enemy = {
      model: createDetailedEnemyDragon(color),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.5
      ),
      rotationSpeed: 0.01 + Math.random() * 0.02,
      boundingBox: new THREE.Box3(),
      isActive: true,
      animationTime: Math.random() * 10 // Random start phase for animation
    };
    
    // Position randomly around the map
    enemy.model.position.set(
      (Math.random() - 0.5) * 1500,
      200 + Math.random() * 300,
      (Math.random() - 0.5) * 1500
    );
    
    enemy.model.scale.set(1.5, 1.5, 1.5);
    enemy.model.castShadow = true;
    
    // Make the bounding box slightly smaller than the visual model for better gameplay
    const tempBox = new THREE.Box3().setFromObject(enemy.model);
    const size = tempBox.getSize(new THREE.Vector3());
    const center = tempBox.getCenter(new THREE.Vector3());
    
    enemy.boundingBox = new THREE.Box3();
    enemy.boundingBox.setFromCenterAndSize(
      center,
      size.multiplyScalar(0.7) // 70% of visual size
    );
    
    scene.add(enemy.model);
    enemies.push(enemy);
  }
  
  // Signal loading complete after a small delay
  setTimeout(() => {
    if (loadingManager) {
      loadingManager.itemEnd('enemies');
    }
  }, 1000);
  
  return enemies;
}

export function updateEnemies(enemies, playerPosition) {
  const time = Date.now() * 0.001;
  
  enemies.forEach(enemy => {
    if (!enemy.isActive) return;
    
    // Calculate direction to player (mild homing behavior)
    const direction = new THREE.Vector3().subVectors(playerPosition, enemy.model.position).normalize();
    
    // Apply some randomness to movement
    enemy.velocity.x += (Math.random() - 0.5) * 0.02;
    enemy.velocity.y += (Math.random() - 0.5) * 0.02;
    enemy.velocity.z += (Math.random() - 0.5) * 0.02;
    
    // Apply mild attraction to player
    enemy.velocity.x += direction.x * 0.01;
    enemy.velocity.y += direction.y * 0.01;
    enemy.velocity.z += direction.z * 0.01;
    
    // Limit velocity
    const maxSpeed = 0.7;
    if (enemy.velocity.length() > maxSpeed) {
      enemy.velocity.normalize().multiplyScalar(maxSpeed);
    }
    
    // Apply velocity
    enemy.model.position.add(enemy.velocity);
    
    // Add some natural motion
    enemy.model.position.y += Math.sin(time + enemy.model.position.x * 0.1) * 0.2;
    
    // Update animation time
    enemy.animationTime += 0.05;
    
    // Animate wings
    const wingFlapSpeed = Math.max(0.1, enemy.velocity.length() * 0.5);
    const flapAmount = Math.sin(enemy.animationTime * wingFlapSpeed) * 0.2;
    
    // Find wing components and animate them
    enemy.model.traverse(child => {
      if (child.name === "leftWing") {
        child.rotation.z = -Math.PI / 8 + flapAmount;
      } else if (child.name === "rightWing") {
        child.rotation.z = Math.PI / 8 - flapAmount;
      }
    });
    
    // Make wings flap based on speed
    if (enemy.model.children.length > 5) {
      // Assuming wings are children 4 & 5
      if (enemy.model.children[4] && enemy.model.children[4].name === "leftWing") {
        enemy.model.children[4].rotation.z = -Math.PI / 8 + flapAmount;
      }
      if (enemy.model.children[5] && enemy.model.children[5].name === "rightWing") {
        enemy.model.children[5].rotation.z = Math.PI / 8 - flapAmount;
      }
    }
    
    // Rotate to face movement direction
    if (enemy.velocity.length() > 0.1) {
      const targetRotation = Math.atan2(enemy.velocity.x, enemy.velocity.z);
      const currentRotation = enemy.model.rotation.y;
      
      // Smooth rotation
      let rotationDiff = targetRotation - currentRotation;
      while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      enemy.model.rotation.y += rotationDiff * 0.05;
    }
    
    // Keep enemies within bounds
    const bounds = 1400;
    if (Math.abs(enemy.model.position.x) > bounds) {
      enemy.velocity.x *= -1;
      enemy.model.position.x = Math.sign(enemy.model.position.x) * bounds;
    }
    if (enemy.model.position.y < 50 || enemy.model.position.y > 600) {
      enemy.velocity.y *= -1;
      enemy.model.position.y = enemy.model.position.y < 50 ? 50 : 600;
    }
    if (Math.abs(enemy.model.position.z) > bounds) {
      enemy.velocity.z *= -1;
      enemy.model.position.z = Math.sign(enemy.model.position.z) * bounds;
    }
    
    // Update bounding box - make it slightly smaller than visual model
    const tempBox = new THREE.Box3().setFromObject(enemy.model);
    const size = tempBox.getSize(new THREE.Vector3());
    const center = tempBox.getCenter(new THREE.Vector3());
    
    enemy.boundingBox.setFromCenterAndSize(
      center,
      size.multiplyScalar(0.7) // 70% of visual size
    );
  });
}