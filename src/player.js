import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Create a detailed dragon model
function createDetailedDragon(color = 0xFF0000) {
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
    color: 0x00FF00,
    roughness: 0.1,
    metalness: 0.9,
    emissive: 0x003300
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
      color: 0xAAAAAA,
      roughness: 0.6,
      metalness: 0.7
    });
    
    const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    spike.position.z = -3 + (i * 1.5);
    spike.position.y = 1.2 - (i * 0.1);
    group.add(spike);
  }
  
  // Add flame effect to mouth
  const flameGeometry = new THREE.ConeGeometry(0.3, 1, 8);
  flameGeometry.rotateX(Math.PI);
  const flameMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFF6600,
    transparent: true,
    opacity: 0.7
  });
  const flame = new THREE.Mesh(flameGeometry, flameMaterial);
  flame.position.z = -7.5;
  flame.position.y = 0.8;
  flame.userData = { isFlame: true };
  group.add(flame);
  
  // Make the dragon smaller overall to take up less screen space
  group.scale.set(0.7, 0.7, 0.7);
  
  return group;
}

// Helper to create a more detailed wing
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

// Helper to adjust color brightness
function adjustColor(color, factor) {
  const c = new THREE.Color(color);
  c.r *= factor;
  c.g *= factor;
  c.b *= factor;
  return c;
}

export async function createPlayer(scene, loadingManager) {
  // Create player object
  const player = {
    model: createDetailedDragon(0xFF0000),
    speed: 1.0,
    rotationSpeed: 0.03,
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(0, 0, -1),
    boundingBox: new THREE.Box3(),
    animationTime: 0
  };
  
  // Configure dragon model
  player.model.position.set(0, 200, 0);
  player.model.scale.set(1.5, 1.5, 1.5);
  player.model.castShadow = true;
  player.boundingBox.setFromObject(player.model);
  
  scene.add(player.model);
  
  // Signal loading complete after a small delay to simulate loading
  setTimeout(() => {
    if (loadingManager) {
      loadingManager.itemEnd('player');
    }
  }, 500);
  
  // Start tracking the item
  if (loadingManager) {
    loadingManager.itemStart('player');
  }
  
  return player;
}

export function updatePlayer(player, keys, camera) {
  // Handle movement
  const moveSpeed = player.speed;
  const rotateSpeed = player.rotationSpeed;
  
  // Forward/backward movement
  if (keys['w'] || keys['ArrowUp']) {
    player.velocity.z = -moveSpeed;
  } else if (keys['s'] || keys['ArrowDown']) {
    player.velocity.z = moveSpeed;
  } else {
    player.velocity.z *= 0.95; // Slow down gradually
  }
  
  // Turning left/right
  if (keys['a'] || keys['ArrowLeft']) {
    player.model.rotation.y += rotateSpeed;
  } else if (keys['d'] || keys['ArrowRight']) {
    player.model.rotation.y -= rotateSpeed;
  }
  
  // Up/down movement
  if (keys['q'] || keys['Q'] || keys['Shift']) {
    player.velocity.y = -moveSpeed; // Down
  } else if (keys['e'] || keys['E'] || keys['Control']) {
    player.velocity.y = moveSpeed; // Up
  } else {
    player.velocity.y *= 0.95; // Slow down gradually
  }
  
  // Apply velocity in the direction the dragon is facing
  const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(player.model.quaternion);
  player.model.position.x += player.velocity.z * direction.x;
  player.model.position.z += player.velocity.z * direction.z;
  player.model.position.y += player.velocity.y;
  
  // Prevent flying below ground level
  if (player.model.position.y < 50) {
    player.model.position.y = 50;
    player.velocity.y = 0;
  }
  
  // Keep player within terrain bounds
  const bounds = 1400;
  player.model.position.x = Math.max(-bounds, Math.min(bounds, player.model.position.x));
  player.model.position.z = Math.max(-bounds, Math.min(bounds, player.model.position.z));
  
  // Keep player within height limits 
  if (player.model.position.y > 600) {
    player.model.position.y = 600;
    player.velocity.y = 0;
  }
  
  // Update animation time
  player.animationTime += 0.05;
  
  // Animate wings based on speed
  const wingFlapSpeed = Math.max(0.1, Math.abs(player.velocity.z) * 0.5);
  const flapAmount = Math.sin(player.animationTime * wingFlapSpeed) * 0.2;
  
  // Find wing components and animate them
  player.model.traverse(child => {
    // Wings rotate on Z axis
    if (child.name === 'leftWing') {
      child.rotation.z = -Math.PI / 8 + flapAmount;
    } else if (child.name === 'rightWing') {
      child.rotation.z = Math.PI / 8 - flapAmount;
    }
    
    // Animate flame
    if (child.userData && child.userData.isFlame) {
      // Make flame flicker
      child.material.opacity = 0.5 + Math.random() * 0.3;
      child.scale.set(
        0.9 + Math.random() * 0.2,
        0.9 + Math.random() * 0.2,
        0.9 + Math.random() * 0.2
      );
    }
  });
  
  // Update camera to follow player from farther away with a better view angle
  // Higher and further back position to see more of the landscape and other dragons
  const offset = new THREE.Vector3(0, 15, 35).applyQuaternion(player.model.quaternion);
  camera.position.copy(player.model.position).add(offset);
  
  // Adjust lookAt to be slightly ahead of the player to see more of the landscape
  const lookAtPoint = player.model.position.clone().add(
    new THREE.Vector3(0, -5, 0).applyQuaternion(player.model.quaternion)
  );
  camera.lookAt(lookAtPoint);
  
  // Update bounding box
  // Make the bounding box slightly smaller than the visual model for better gameplay
  const boundingBoxScale = 0.7;
  const tempBox = new THREE.Box3().setFromObject(player.model);
  const size = tempBox.getSize(new THREE.Vector3());
  const center = tempBox.getCenter(new THREE.Vector3());
  
  player.boundingBox.setFromCenterAndSize(
    center,
    size.multiplyScalar(boundingBoxScale)
  );
}