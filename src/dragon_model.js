import * as THREE from 'three';
import dragonScalesUrl from './textures/dragon_scales.png';

const textureLoader = new THREE.TextureLoader();
const scalesTexture = textureLoader.load(dragonScalesUrl);
scalesTexture.wrapS = THREE.RepeatWrapping;
scalesTexture.wrapT = THREE.RepeatWrapping;
scalesTexture.repeat.set(4, 2);

export function createProceduralDragon(color = 0xFF0000) {
    const dragonGroup = new THREE.Group();

    // Materials
    const skinMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.4,
        metalness: 0.3,
        map: scalesTexture,
        bumpMap: scalesTexture,
        bumpScale: 0.15,
        side: THREE.FrontSide
    });

    const secondaryColor = new THREE.Color(color).multiplyScalar(0.8);
    const bellyMaterial = new THREE.MeshStandardMaterial({
        color: secondaryColor,
        roughness: 0.6,
        metalness: 0.1
    });

    const hornMaterial = new THREE.MeshStandardMaterial({
        color: 0xDDDDAA,
        roughness: 0.3,
        metalness: 0.5
    });

    const clawMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.2
    });

    // --- BODY CONSTRUCTION ---
    // We'll use a series of segments to allow for animation if we wanted, 
    // but for the static model, we'll build a hierarchy for articulation.

    const bodyGroup = new THREE.Group();
    dragonGroup.add(bodyGroup);

    // Main Torso (Chest)
    // detailed shape using LatheGeometry or carefully scaled primitive
    const chestGeo = new THREE.CapsuleGeometry(1.5, 3.0, 8, 16);
    // Rotate so capsule aligns with Z axis (forward/back)
    chestGeo.rotateX(Math.PI / 2);
    const chest = new THREE.Mesh(chestGeo, skinMaterial);
    chest.castShadow = true;
    bodyGroup.add(chest);

    // Hips/Rear Body
    const hipsGeo = new THREE.CapsuleGeometry(1.3, 2.5, 8, 16);
    hipsGeo.rotateX(Math.PI / 2);
    const hips = new THREE.Mesh(hipsGeo, skinMaterial);
    hips.position.z = 2.5;
    // Taper slightly
    hips.scale.set(0.9, 0.9, 1.0);
    bodyGroup.add(hips);

    // --- NECK (Multi-segmented) ---
    const neckSegments = 5;
    let currentNeckBase = bodyGroup;
    let currentNeckPos = new THREE.Vector3(0, 0.8, -1.2); // Start at front-top of chest
    let neckRot = new THREE.Euler(-0.2, 0, 0); // Curve up

    for (let i = 0; i < neckSegments; i++) {
        const size = 0.9 - (i * 0.1);
        const length = 1.2;
        // Use a slightly flattened sphere or cylinder for segments
        const segGeo = new THREE.CylinderGeometry(size * 0.9, size, length, 12);
        segGeo.rotateX(Math.PI / 2); // Align Z

        // Joint
        const joint = new THREE.Group();
        joint.position.copy(currentNeckPos);
        joint.rotation.copy(neckRot);

        const segment = new THREE.Mesh(segGeo, skinMaterial);
        segment.position.z = -length / 2; // Grow forward
        segment.castShadow = true;

        joint.add(segment);
        currentNeckBase.add(joint);

        // Prepare for next
        currentNeckBase = joint;
        currentNeckPos = new THREE.Vector3(0, 0, -length);
        neckRot = new THREE.Euler(-0.15, 0, 0); // Curve up more
    }

    // Head attaches to last neck segment
    const headGroup = createHead(skinMaterial, hornMaterial, secondaryColor);
    headGroup.position.set(0, 0, -0.5); // End of last segment
    currentNeckBase.add(headGroup);

    // --- TAIL (Multi-segmented) ---
    const tailSegments = 12;
    let currentTailBase = bodyGroup;
    let currentTailPos = new THREE.Vector3(0, 0, 3.5); // Back of hips
    let tailRot = new THREE.Euler(-0.05, 0, 0); // Droop slightly

    for (let i = 0; i < tailSegments; i++) {
        const t = i / tailSegments;
        const size = 1.0 * (1.0 - t * 0.8); // Taper to 0.2
        const length = 1.5;

        const segGeo = new THREE.CylinderGeometry(size * 0.8, size, length, 10);
        segGeo.rotateX(Math.PI / 2);

        const joint = new THREE.Group();
        joint.position.copy(currentTailPos);
        joint.rotation.copy(tailRot);

        const segment = new THREE.Mesh(segGeo, skinMaterial);
        segment.position.z = length / 2; // Grow backward
        segment.castShadow = true;

        joint.add(segment);
        currentTailBase.add(joint);

        // Spikes on tail
        if (i % 2 === 0) {
            const spikeGeo = new THREE.ConeGeometry(0.1, 0.5, 4);
            const spike = new THREE.Mesh(spikeGeo, hornMaterial);
            spike.position.set(0, size, length / 2); // Top of segment
            spike.rotation.x = -Math.PI / 4;
            joint.add(spike);
        }

        currentTailBase = joint;
        currentTailPos = new THREE.Vector3(0, 0, length);
        // S-curve sway for static, or straight for physics? Let's add slight procedural sway
        tailRot = new THREE.Euler(0.05, 0, 0); // Curve back up slightly
    }

    // --- LIMBS (Arms & Legs) ---
    // Detailed limbs with thigh, calf, foot

    // Rear Legs
    const legGroupL = createLeg(skinMaterial, clawMaterial, true);
    legGroupL.position.set(-1.2, -0.5, 2.0);
    bodyGroup.add(legGroupL);

    const legGroupR = createLeg(skinMaterial, clawMaterial, false);
    legGroupR.position.set(1.2, -0.5, 2.0);
    bodyGroup.add(legGroupR);

    // Front Arms (Smaller, Wyvern style if wings on back, or full dragon? User said "dinosaur flying". 
    // Let's assume 4 legs + wings (Dragon) or 2 legs + wings (Wyvern). 
    // Most "Dragons" have 4 legs.
    const armGroupL = createArm(skinMaterial, clawMaterial, true);
    armGroupL.position.set(-1.2, -0.5, -0.5);
    bodyGroup.add(armGroupL);

    const armGroupR = createArm(skinMaterial, clawMaterial, false);
    armGroupR.position.set(1.2, -0.5, -0.5);
    bodyGroup.add(armGroupR);


    // --- WINGS (Complex Articulated) ---
    const wingGroupL = createComplexWing(skinMaterial, color);
    wingGroupL.position.set(-1.0, 1.5, 0.5);
    wingGroupL.rotation.z = -0.2; // Folded slightly? Or Flight ready.
    wingGroupL.name = "leftWing";
    bodyGroup.add(wingGroupL);

    const wingGroupR = createComplexWing(skinMaterial, color);
    wingGroupR.scale.x = -1; // Mirror
    // Need to correct culling for mirrored mesh usually, but DoubleSide helps or scale -1 works in ThreeJS
    wingGroupR.position.set(1.0, 1.5, 0.5);
    wingGroupR.rotation.z = 0.2;
    wingGroupR.name = "rightWing";
    bodyGroup.add(wingGroupR);

    // Scale down heavily as this model is built largely in units
    dragonGroup.scale.set(0.5, 0.5, 0.5);

    return dragonGroup;
}

function createHead(skinMat, hornMat, eyeColorVal) {
    const headGroup = new THREE.Group();

    // Cranium
    const skullGeo = new THREE.BoxGeometry(1.2, 1.0, 1.5);
    // Modifier to make it rounder? Standard Box is ok if covered with details
    // Let's use an icosahedron or subdivision approximation for organic shape
    // Or just a low poly shape that looks chiseled
    const skull = new THREE.Mesh(skullGeo, skinMat);
    headGroup.add(skull);

    // Snout
    const snoutGeo = new THREE.BoxGeometry(0.8, 0.7, 2.0);
    const snout = new THREE.Mesh(snoutGeo, skinMat);
    snout.position.z = -1.5;
    snout.position.y = -0.1;
    headGroup.add(snout);

    // Brow ridges
    const bromGeo = new THREE.BoxGeometry(0.5, 0.3, 0.8);
    const browL = new THREE.Mesh(bromGeo, skinMat);
    browL.position.set(-0.4, 0.6, -0.5);
    browL.rotation.z = 0.2;
    browL.rotation.y = -0.2;
    headGroup.add(browL);

    const browR = new THREE.Mesh(bromGeo, skinMat);
    browR.position.set(0.4, 0.6, -0.5);
    browR.rotation.z = -0.2;
    browR.rotation.y = 0.2;
    headGroup.add(browR);

    // Jaw
    const jawGeo = new THREE.BoxGeometry(0.7, 0.3, 1.6);
    const jaw = new THREE.Mesh(jawGeo, skinMat);
    jaw.position.set(0, -0.6, -1.3);
    jaw.rotation.x = 0.2; // Open mouth
    headGroup.add(jaw);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x00FF00, // Default green
        emissive: 0x00FF00,
        emissiveIntensity: 2.0,
        roughness: 0
    });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.6, 0.1, -0.6);
    headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.6, 0.1, -0.6);
    headGroup.add(eyeR);

    // Horns
    // Detailed curved horns
    const hornyCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.3, 0.5, 0.2),
        new THREE.Vector3(0.5, 1.5, 0.5),
        new THREE.Vector3(0.1, 2.5, 1.0),
    ]);
    const hornGeo = new THREE.TubeGeometry(hornyCurve, 8, 0.12, 6, false);

    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.5, 0.5, 0.5);
    hornL.rotation.set(-0.2, 0, -0.3);
    headGroup.add(hornL);

    const hornR = new THREE.Mesh(hornGeo, hornMat);
    hornR.position.set(0.5, 0.5, 0.5);
    hornR.rotation.set(-0.2, 0, 0.3);
    headGroup.add(hornR);

    // Flame Effect Holder (Player.js adds the actual flame logic but we need a mount point)
    const mouthMount = new THREE.Object3D();
    mouthMount.name = "mouthMount";
    mouthMount.position.set(0, -0.2, -2.5);
    headGroup.add(mouthMount);

    return headGroup;
}

function createLeg(skinMat, clawMat, isLeft) {
    const group = new THREE.Group();

    // Thigh
    const thighGeo = new THREE.CapsuleGeometry(0.5, 1.5, 8, 8);
    const thigh = new THREE.Mesh(thighGeo, skinMat);
    thigh.position.y = -0.5;
    // Angle forward/out
    thigh.rotation.z = isLeft ? -0.3 : 0.3;
    thigh.rotation.x = -0.2;
    group.add(thigh);

    // Calf
    const calfGeo = new THREE.CapsuleGeometry(0.35, 1.2, 8, 8);
    const calf = new THREE.Mesh(calfGeo, skinMat);
    calf.position.set(isLeft ? -0.3 : 0.3, -1.5, 0.2); // Relative to thigh top
    calf.rotation.x = 0.5; // Bend back
    group.add(calf);

    // Foot
    const footGeo = new THREE.BoxGeometry(0.5, 0.3, 0.8);
    const foot = new THREE.Mesh(footGeo, clawMat);
    foot.position.set(isLeft ? -0.3 : 0.3, -2.2, 0.4);
    foot.rotation.x = -0.3; // Flat on simulated ground air
    group.add(foot);

    return group;
}

function createArm(skinMat, clawMat, isLeft) {
    const group = new THREE.Group();
    // Shoulder/Upper Arm
    const upArmGeo = new THREE.CapsuleGeometry(0.3, 1.0, 8, 8);
    const upArm = new THREE.Mesh(upArmGeo, skinMat);
    upArm.position.y = -0.4;
    upArm.rotation.z = isLeft ? -0.5 : 0.5;
    group.add(upArm);

    // Forearm
    const lowArmGeo = new THREE.CapsuleGeometry(0.25, 0.8, 8, 8);
    const lowArm = new THREE.Mesh(lowArmGeo, skinMat);
    lowArm.position.set(isLeft ? -0.4 : 0.4, -1.0, 0.2);
    lowArm.rotation.x = 0.5;
    group.add(lowArm);

    // Claw
    const clawGeo = new THREE.ConeGeometry(0.1, 0.4, 4);
    const claw = new THREE.Mesh(clawGeo, clawMat);
    claw.position.set(isLeft ? -0.4 : 0.4, -1.5, 0.4);
    claw.rotation.x = -0.5;
    group.add(claw);

    return group;
}

function createComplexWing(skinMat, color) {
    const group = new THREE.Group();

    // Main Bone (Arm)
    const armGeo = new THREE.CylinderGeometry(0.15, 0.1, 3, 6);
    armGeo.rotateZ(Math.PI / 2); // Lay flat
    const arm = new THREE.Mesh(armGeo, skinMat);
    arm.position.x = 1.5;
    group.add(arm);

    // Forearm/Finger Main
    const forearmGeo = new THREE.CylinderGeometry(0.1, 0.05, 4, 6);
    forearmGeo.rotateZ(Math.PI / 2.5);
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.position.set(4.0, -1.0, 0);
    group.add(forearm);

    // Membrane
    // Use a custom shape geometry for the skin
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); // Shoulder
    shape.lineTo(3, 0); // Elbow
    shape.lineTo(6, -2); // Wrist/Tip
    shape.quadraticCurveTo(4, -4, 2, -2); // Scallop 1
    shape.quadraticCurveTo(1, -3, 0, 0); // Scallop 2 back to body

    const membraneGeo = new THREE.ShapeGeometry(shape);
    const membraneMat = new THREE.MeshStandardMaterial({
        color: color,
        side: THREE.DoubleSide,
        roughness: 0.5,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9
    });

    const membrane = new THREE.Mesh(membraneGeo, membraneMat);
    membrane.rotation.x = Math.PI / 2; // Flat
    membrane.position.y = -0.1; // Slightly below bones
    group.add(membrane);

    return group;
}
