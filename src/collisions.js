import * as THREE from 'three';

export function checkCollisions(gameState, scene, sounds) {
  const { player, enemies, fireballs } = gameState;

  // Check fireball collisions with enemies
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const fireball = fireballs[i];

    for (let j = 0; j < enemies.length; j++) {
      const enemy = enemies[j];

      if (enemy.isActive && fireball.boundingBox.intersectsBox(enemy.boundingBox)) {
        // Hit! "Remove" fireball (recycle)
        fireball.active = false;
        fireball.mesh.visible = false;
        fireballs.splice(i, 1);

        // Handle enemy hit
        handleEnemyHit(enemy, scene, gameState, sounds);

        // Break the inner loop since this fireball is gone
        break;
      }
    }
  }

  // Check enemy collisions with player
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];

    if (enemy.isActive && enemy.boundingBox.intersectsBox(player.boundingBox)) {
      // Player got hit
      handlePlayerHit(gameState, enemy, sounds);
    }
  }
}

function handleEnemyHit(enemy, scene, gameState, sounds) {
  // Play hit sound
  if (sounds.enemyHit) {
    sounds.enemyHit.currentTime = 0;
    sounds.enemyHit.play().catch(e => console.log('Error playing enemy hit sound:', e));
  }

  // Increase score
  gameState.score++;

  // Create advanced explosion effect
  createHitExplosion(scene, enemy.model.position);

  // Flash enemy model before respawning
  const originalMaterials = [];

  enemy.model.traverse(child => {
    if (child.isMesh && child.material) {
      originalMaterials.push({
        mesh: child,
        material: child.material.clone()
      });

      // Change to hit flash material
      child.material = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.8
      });
    }
  });

  // Respawn enemy at a new location after a short delay
  setTimeout(() => {
    resetEnemy(enemy);
  }, 100);
}

function handlePlayerHit(gameState, enemy, sounds) {
  // Play hit sound
  if (sounds.playerHit) {
    sounds.playerHit.currentTime = 0;
    sounds.playerHit.play().catch(e => console.log('Error playing player hit sound:', e));
  }

  // Decrease health
  gameState.health--;

  // Decrease score (not below 0)
  gameState.score = Math.max(0, gameState.score - 1);

  // Flash the player model red
  const originalMaterials = [];
  gameState.player.model.traverse(child => {
    if (child.isMesh) {
      originalMaterials.push({
        mesh: child,
        material: child.material.clone()
      });
      child.material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0xFF0000,
        emissiveIntensity: 1
      });
    }
  });

  // Reset material after a short time
  setTimeout(() => {
    originalMaterials.forEach(item => {
      item.mesh.material = item.material;
    });
  }, 200);

  // Reset enemy position
  resetEnemy(enemy);
}

// Create a hit explosion effect
function createHitExplosion(scene, position) {
  // Create main explosion sphere
  const explosionGeometry = new THREE.SphereGeometry(4, 12, 12);
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
  const light = new THREE.PointLight(0xFF5500, 10, 30);
  light.position.copy(position);
  scene.add(light);

  // Remove light after a short time
  setTimeout(() => {
    scene.remove(light);
  }, 200);

  // Add explosion ring
  const ringGeometry = new THREE.TorusGeometry(6, 0.5, 8, 24);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xFF7700,
    transparent: true,
    opacity: 0.7
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.copy(position);
  ring.userData = {
    type: 'explosion_ring',
    age: 0,
    maxAge: 15
  };
  scene.add(ring);

  // Animate ring expansion
  const expandRing = () => {
    if (ring.userData.age < ring.userData.maxAge) {
      ring.userData.age++;
      ring.scale.multiplyScalar(1.2);
      ring.material.opacity *= 0.9;

      if (ring.userData.age >= ring.userData.maxAge) {
        scene.remove(ring);
      } else {
        requestAnimationFrame(expandRing);
      }
    }
  };

  expandRing();

  // Add smaller particles
  for (let i = 0; i < 15; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.8, 6, 6);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0xFF4400 : 0xFF8800,
      transparent: true,
      opacity: 0.8
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    // Random position around the explosion center
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 5;
    particle.position.copy(position);
    particle.position.x += Math.cos(angle) * radius;
    particle.position.y += (Math.random() - 0.5) * radius * 2;
    particle.position.z += Math.sin(angle) * radius;

    particle.userData = {
      type: 'explosion_particle',
      age: 0,
      maxAge: 15 + Math.floor(Math.random() * 10),
      velocity: new THREE.Vector3(
        Math.cos(angle) * 0.4,
        (Math.random() - 0.3) * 0.4,
        Math.sin(angle) * 0.4
      )
    };

    scene.add(particle);
  }
}

function resetEnemy(enemy) {
  // Move enemy to a new random position far from player
  enemy.model.position.set(
    (Math.random() - 0.5) * 2000,
    200 + Math.random() * 300,
    (Math.random() - 0.5) * 2000
  );

  // Randomize velocity
  enemy.velocity.set(
    (Math.random() - 0.5) * 0.5,
    (Math.random() - 0.5) * 0.3,
    (Math.random() - 0.5) * 0.5
  );

  // Update bounding box
  const tempBox = new THREE.Box3().setFromObject(enemy.model);
  const size = tempBox.getSize(new THREE.Vector3());
  const center = tempBox.getCenter(new THREE.Vector3());

  enemy.boundingBox.setFromCenterAndSize(
    center,
    size.multiplyScalar(0.7) // 70% of visual size
  );
}