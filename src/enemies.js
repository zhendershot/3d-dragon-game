import * as THREE from 'three';
import { createProceduralDragon } from './dragon_model.js';

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
      model: createProceduralDragon(color),
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
  const bounds = 1800;

  enemies.forEach(enemy => {
    if (!enemy.isActive) return;

    // --- FLIGHT AI ---

    // 1. Calculate Desired Direction
    // Mild homing behavior towards player, but with noise
    const directionToPlayer = new THREE.Vector3().subVectors(playerPosition, enemy.model.position).normalize();

    // Wander noise
    const noiseX = Math.sin(time * 0.5 + enemy.animationTime);
    const noiseZ = Math.cos(time * 0.3 + enemy.animationTime);

    // Target velocity vector
    // Mix player direction (0.2) with wander direction (0.8)
    const targetDir = new THREE.Vector3(
      directionToPlayer.x * 0.2 + noiseX * 0.8,
      (directionToPlayer.y * 0.2) + (Math.sin(time) * 0.5), // Undulate height
      directionToPlayer.z * 0.2 + noiseZ * 0.8
    ).normalize();

    const maxSpeed = 0.8;
    const targetVelocity = targetDir.multiplyScalar(maxSpeed);

    // 2. Smoothly adjust current velocity (Inertia)
    enemy.velocity.lerp(targetVelocity, 0.02);

    // 3. Move
    enemy.model.position.add(enemy.velocity);

    // 4. Banking & Orientation
    // Calculate desired rotation based on velocity
    if (enemy.velocity.lengthSq() > 0.001) {
      const targetRotation = Math.atan2(enemy.velocity.x, enemy.velocity.z);

      // Calculate the difference to determine banking
      let rotationDiff = targetRotation - enemy.model.rotation.y;
      while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;

      // Smoothly rotate Yaw
      enemy.model.rotation.y += rotationDiff * 0.05;

      // Bank based on turn sharpness (Roll)
      // Turning left (positive diff) -> Roll left (positive Z in this model? No, standard is negative)
      // Let's stick to the visual logic: 
      // If turning Left, Bank Left.
      const targetBank = -rotationDiff * 5.0; // Amplify bank

      // Smoothly interpolate current bank (borrowing z rotation for bank)
      // We'll use a new property if we want pure Euler, but modifying rotation.z works for simple objects
      // However, we must be careful not to overwrite the wing animation logic if it relies on Model Z.
      // Actually, enemies update model Y rotation, but wings are children. 
      // We can rotate the whole model Z for banking.

      const currentBank = enemy.model.rotation.z || 0;
      enemy.model.rotation.z = THREE.MathUtils.lerp(currentBank, targetBank, 0.05);

      // Pitch based on Y velocity
      const targetPitch = -enemy.velocity.y * 2.0;
      enemy.model.rotation.x = THREE.MathUtils.lerp(enemy.model.rotation.x, targetPitch, 0.1);
    }

    // 5. Bounds Check
    if (Math.abs(enemy.model.position.x) > bounds) {
      enemy.velocity.x *= -1; // Bounce
      enemy.model.position.x = Math.sign(enemy.model.position.x) * bounds;
    }
    if (Math.abs(enemy.model.position.z) > bounds) {
      enemy.velocity.z *= -1;
      enemy.model.position.z = Math.sign(enemy.model.position.z) * bounds;
    }
    // Height bounds
    if (enemy.model.position.y < 50) {
      enemy.model.position.y = 50;
      enemy.velocity.y = Math.abs(enemy.velocity.y); // Bounce up
    } else if (enemy.model.position.y > 600) {
      enemy.model.position.y = 600;
      enemy.velocity.y = -Math.abs(enemy.velocity.y); // Bounce down
    }

    // 6. Animation
    enemy.animationTime += 0.05;

    // Flap wings
    const flapSpeed = 5.0; // Faster for enemies
    const flapAmount = Math.sin(enemy.animationTime * flapSpeed) * 0.3;

    // Find wing components and animate them
    enemy.model.traverse(child => {
      if (child.name === "leftWing") {
        child.rotation.z = -0.2 + flapAmount;
      } else if (child.name === "rightWing") {
        child.rotation.z = 0.2 - flapAmount;
      }
    });

    // Update bounding box
    const tempBox = new THREE.Box3().setFromObject(enemy.model);
    const size = tempBox.getSize(new THREE.Vector3());
    const center = tempBox.getCenter(new THREE.Vector3());
    enemy.boundingBox.setFromCenterAndSize(center, size.multiplyScalar(0.7));
  });
}