import * as THREE from 'three';
import { createProceduralDragon } from './dragon_model.js';

// Removed local texture loading as it is now in dragon_model.js
// Removed old createDetailedDragon function entirely


export async function createPlayer(scene, loadingManager) {
  // Create player object
  const player = {
    model: createProceduralDragon(0xFF0000),
    // Physics properties
    velocity: new THREE.Vector3(),
    speed: 0,
    maxSpeed: 2.0,
    minSpeed: 0.5,
    acceleration: 0.05,
    drag: 0.02,

    // Orientation physics
    pitch: 0,
    yaw: 0,
    roll: 0,

    // Control sensitivities
    pitchRate: 0.01,
    rollRate: 0.015,
    yawRateFromRoll: 0.005, // How much banking causes turning

    // Auto-leveling
    stablizationRate: 0.01, // Slower auto-leveling

    boundingBox: new THREE.Box3(),
    animationTime: 0,
    health: 100,
    maxHealth: 100,
    raycaster: new THREE.Raycaster()
  };

  // Configure dragon model
  player.model.position.set(0, 300, 0);
  player.model.scale.set(0.8, 0.8, 0.8); // Adjust scale for new model
  player.model.castShadow = true;
  player.boundingBox.setFromObject(player.model);

  // Re-attach flame to the new head location
  // Find head group and attach flame
  // The new model has a 'mouthMount' object for this
  let mouthMount = null;
  player.model.traverse(child => {
    if (child.name === 'mouthMount') mouthMount = child;
  });

  if (mouthMount) {
    const flameGeo = new THREE.ConeGeometry(0.4, 2.0, 8);
    flameGeo.rotateX(Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xFF4400,
      transparent: true,
      opacity: 0.0
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.name = "flame";
    flame.userData = { isFlame: true };
    flame.position.set(0, 0, 0); // At mount point
    mouthMount.add(flame);
  }

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

export function updatePlayer(player, keys, camera, terrain) {
  // --- FLIGHT PHYSICS ---

  // 1. Handle Inputs (Control Orientation Rates)

  // Pitch (W/S) - Nose Up/Down
  if (keys['w'] || keys['ArrowUp']) {
    player.pitch = Math.max(player.pitch - player.pitchRate, -Math.PI / 3);
  } else if (keys['s'] || keys['ArrowDown']) {
    player.pitch = Math.min(player.pitch + player.pitchRate, Math.PI / 3);
  } else {
    // Auto-level pitch slowly if no input
    player.pitch *= (1.0 - player.stablizationRate);
  }

  // Roll (A/D) - Bank Left/Right
  if (keys['a'] || keys['ArrowLeft']) {
    player.roll = Math.min(player.roll + player.rollRate, Math.PI / 2.5);
  } else if (keys['d'] || keys['ArrowRight']) {
    player.roll = Math.max(player.roll - player.rollRate, -Math.PI / 2.5);
  } else {
    // Auto-level roll
    player.roll *= (1.0 - player.stablizationRate);
  }

  // Yaw (Induced by Roll)
  // Banking causes precise turning
  player.yaw += player.roll * player.yawRateFromRoll;

  // 2. Calculate Thrust & Momentum

  // Thrust is automatic based on Pitch for now (Dive to gain speed, climb to lose it)
  // Simplified: Base thrust + gravity influence
  const gravityComponent = Math.sin(player.pitch) * 0.05; // Diving adds speed
  let targetSpeed = 1.5 - (player.pitch * 0.5); // Fly faster when pitching down

  // Boost input
  if (keys['Shift']) {
    targetSpeed += 1.0;
  }

  // Accelerate/Decelerate towards target speed (Inertia)
  player.speed += (targetSpeed - player.speed) * 0.02;
  player.speed = Math.max(player.minSpeed, Math.min(player.speed, player.maxSpeed * 1.5));

  // 3. Update Position & Orientation

  // Apply rotation to model Quaternion
  const quaternion = new THREE.Quaternion();
  quaternion.setFromEuler(new THREE.Euler(player.pitch, player.yaw, player.roll, 'YXZ'));
  player.model.quaternion.slerp(quaternion, 0.1); // Smooth rotation

  // Calculate forward vector based on actual orientation
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.model.quaternion);

  // Move player
  player.velocity.copy(forward).multiplyScalar(player.speed);
  player.model.position.add(player.velocity);

  // 4. Procedural & Environmental Corrections

  // TERRAIN COLLISION
  if (terrain) {
    // A. Downward Ray (Altitude Check)
    const rayOrigin = player.model.position.clone();
    rayOrigin.y += 100; // Start higher to catch mountains below
    player.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));

    // Check intersection with terrain group children
    const intersects = player.raycaster.intersectObjects(terrain.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const terrainHeight = hit.point.y;
      const cruiseAltitude = 20; // Min height above ground

      if (player.model.position.y < terrainHeight + cruiseAltitude) {
        // Impact with ground!

        // Bounce logic
        player.model.position.y = terrainHeight + cruiseAltitude;

        // Bounce up
        player.pitch = Math.max(player.pitch + 0.3, 0.3); // Pitch up
        player.speed *= 0.8; // Lose speed
      }
    }

    // B. Forward Ray (Frontal Crash Check)
    const forwardRay = forward.clone().normalize();
    const nosePos = player.model.position.clone();
    player.raycaster.set(nosePos, forwardRay);
    player.raycaster.far = 20 + player.speed * 10; // Look ahead based on speed

    const forwardIntersects = player.raycaster.intersectObjects(terrain.children, true);

    if (forwardIntersects.length > 0) {
      const hit = forwardIntersects[0];
      if (hit.distance < 20) {
        // CRASH into wall!
        // Reflect velocity
        // Simple bounce: reverse velocity and push back
        player.speed *= -0.5; // Bounce back
        player.velocity.multiplyScalar(-1);
        player.model.position.add(forwardRay.multiplyScalar(-5)); // Push back out of wall

        // Take heavy damage
        player.health -= 20;
        console.log("CRASH! Health:", player.health);
      }
    }
  }

  // Prevent flying below ground level (Fallback)
  const terrainLimit = 60; // Sea levelish
  if (player.model.position.y < terrainLimit) {
    player.model.position.y = terrainLimit;

    // Level out if hitting ground
    player.pitch = Math.max(player.pitch, 0);
    player.roll *= 0.8;
  }

  // Keep player within terrain bounds
  const bounds = 1800;
  if (Math.abs(player.model.position.x) > bounds) {
    player.yaw += Math.PI; // Turn back
    player.model.position.x = Math.sign(player.model.position.x) * bounds;
  }
  if (Math.abs(player.model.position.z) > bounds) {
    player.yaw += Math.PI;
    player.model.position.z = Math.sign(player.model.position.z) * bounds;
  }

  // Height limit
  const ceilLimit = 800;
  if (player.model.position.y > ceilLimit) {
    player.model.position.y = ceilLimit;
    player.pitch = Math.min(player.pitch, 0);
  }

  // --- PROCEDURAL ANIMATION ---

  // Update animation time
  player.animationTime += 0.05 + (player.speed * 0.05);

  // Bobbing / Undulation
  // Body rises and falls with wing beats
  const wingCycle = Math.sin(player.animationTime);
  const bobAmplitude = 0.5 * (player.speed / player.maxSpeed);

  // We apply bobbing to the visuals only, not physics position
  // Actually, we can just add a subtle Y offset to the model mesh children, 
  // or just oscillate the main group if we accept it affects camera slightly (which adds realism)
  // Let's affect the whole group for that "riding a beast" feel
  player.model.position.y += Math.sin(player.animationTime * 2) * 0.2;

  // Animate wings
  const flapRange = Math.PI / 4;
  const flapOffset = Math.sin(player.animationTime) * flapRange;

  // Find wing components and animate them
  player.model.traverse(child => {
    // Wings rotate on Z axis
    if (child.name === 'leftWing') {
      // Flap + Bank adjustment (lift wing when banking)
      child.rotation.z = -Math.PI / 8 + flapOffset + (player.roll * 0.5);
    } else if (child.name === 'rightWing') {
      child.rotation.z = Math.PI / 8 - flapOffset + (player.roll * 0.5);
    }

    // Animate flame
    if (child.userData && child.userData.isFlame) {
      child.material.opacity = 0.5 + Math.random() * 0.3;
      // Flame trails behind based on speed
      child.rotation.x = player.speed * 0.5;
      child.scale.setScalar(0.9 + Math.random() * 0.2);
    }
  });

  // --- CAMERA UPDATE ---

  // Camera follows with Lag for "Swoop" effect
  // Ideal position: Behind and slightly above, looking forward
  const cameraOffset = new THREE.Vector3(0, 12, 30);

  // Add some dynamic offset based on turn
  // When turning left, camera shifts right slightly to look into turn
  cameraOffset.x -= player.roll * 10;

  // Apply offset relative to player YAW only (so camera doesn't roll with player)
  const cameraRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, player.yaw, 0));
  const worldOffset = cameraOffset.clone().applyQuaternion(cameraRotation);

  const targetCamPos = player.model.position.clone().add(worldOffset);

  // Smoothly interpolate camera position (Lag)
  camera.position.lerp(targetCamPos, 0.1);

  // Look slightly ahead of player
  const lookTarget = player.model.position.clone().add(
    new THREE.Vector3(0, 0, -50).applyQuaternion(player.model.quaternion)
  );
  camera.lookAt(lookTarget);

  // Update bounding box
  const boundingBoxScale = 0.7;
  const tempBox = new THREE.Box3().setFromObject(player.model);
  const size = tempBox.getSize(new THREE.Vector3());
  const center = tempBox.getCenter(new THREE.Vector3());

  player.boundingBox.setFromCenterAndSize(
    center,
    size.multiplyScalar(boundingBoxScale)
  );
}