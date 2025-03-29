// Character and controls functions
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CHARACTER_HEIGHT, JUMP_FORCE } from './constants.js';

// Character variables
let character;
let mixer;
let controls;

// Movement state - create a state object to ensure references are maintained
const movementState = {
  moveForward: false,
  moveBackward: false,
  turnLeft: false,
  turnRight: false,
  canJump: false,
  velocity: new THREE.Vector3()
};

/**
 * Initialize controls
 * @param {THREE.Camera} camera - The camera to control
 * @param {HTMLElement} domElement - The DOM element to attach controls to
 * @returns {PointerLockControls} - The initialized controls
 */
export function initControls(camera, domElement) {
  // Create controls
  controls = new PointerLockControls(camera, domElement);

  // Add event listeners for controls
  const container = document.getElementById('container');
  container.addEventListener('click', () => {
    controls.lock();
  });

  controls.addEventListener('lock', () => {
    document.getElementById('info').classList.add('hidden');
  });

  controls.addEventListener('unlock', () => {
    document.getElementById('info').classList.remove('hidden');
  });

  // Auto-lock controls on page load for testing
  setTimeout(() => {
    controls.lock();
  }, 1000);

  // Add key event listeners
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  return controls;
}

/**
 * Load character model
 * @param {THREE.Scene} scene - The scene to add the character to
 * @param {THREE.LoadingManager} loadingManager - Loading manager for models
 */
export function loadCharacter(scene, loadingManager) {
  // Create a character group to hold all parts
  character = new THREE.Group();
  character.position.set(0, CHARACTER_HEIGHT / 2, 0);
  scene.add(character);

  // Materials for different body parts
  const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xf5d0b0 }); // Skin color
  const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2314 }); // Dark brown hair
  const shirtMaterial = new THREE.MeshStandardMaterial({ color: 0x2c5282 }); // Blue shirt
  const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x1a202c }); // Dark pants
  const shoesMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5568 }); // Gray shoes
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x234876 }); // Blue eyes

  // Create torso (narrower and more human-like)
  const torsoGeometry = new THREE.CapsuleGeometry(0.35, 0.6, 8, 16);
  const torso = new THREE.Mesh(torsoGeometry, shirtMaterial);
  torso.castShadow = true;
  torso.position.set(0, 0.1, 0); // Position torso
  character.add(torso);

  // Add shirt collar
  const collarGeometry = new THREE.TorusGeometry(0.15, 0.04, 8, 16, Math.PI);
  const collar = new THREE.Mesh(collarGeometry, shirtMaterial);
  collar.position.set(0, 0.42, 0);
  collar.rotation.x = Math.PI / 2;
  collar.rotation.z = Math.PI;
  collar.castShadow = true;
  character.add(collar);

  // Add shirt details - buttons
  const buttonGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8);
  const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 }); // White buttons

  // Add three buttons down the front of the shirt
  for (let i = 0; i < 3; i++) {
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.set(0, 0.25 - i * 0.15, 0.35);
    button.rotation.x = Math.PI / 2;
    button.castShadow = true;
    character.add(button);
  }

  // Add sleeve cuffs
  const cuffGeometry = new THREE.TorusGeometry(0.08, 0.03, 8, 16, Math.PI);

  // Left cuff
  const leftCuff = new THREE.Mesh(cuffGeometry, shirtMaterial);
  leftCuff.position.set(-0.5, -0.15, 0);
  leftCuff.rotation.x = Math.PI / 2;
  leftCuff.rotation.y = Math.PI / 2;
  leftCuff.castShadow = true;
  character.add(leftCuff);

  // Right cuff
  const rightCuff = new THREE.Mesh(cuffGeometry, shirtMaterial);
  rightCuff.position.set(0.5, -0.15, 0);
  rightCuff.rotation.x = Math.PI / 2;
  rightCuff.rotation.y = -Math.PI / 2;
  rightCuff.castShadow = true;
  character.add(rightCuff);

  // Create hips (slightly wider than torso)
  const hipsGeometry = new THREE.CapsuleGeometry(0.32, 0.2, 8, 16);
  const hips = new THREE.Mesh(hipsGeometry, pantsMaterial);
  hips.position.set(0, -0.4, 0);
  hips.rotation.x = Math.PI / 2; // Rotate to horizontal
  hips.castShadow = true;
  character.add(hips);

  // Create neck (smoother transition between head and torso)
  const neckGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.15, 16);
  const neck = new THREE.Mesh(neckGeometry, skinMaterial);
  neck.position.set(0, 0.45, 0);
  neck.castShadow = true;
  character.add(neck);

  // Create head (slightly oval)
  const headGeometry = new THREE.SphereGeometry(0.25, 32, 24);
  const head = new THREE.Mesh(headGeometry, skinMaterial);
  head.position.set(0, 0.7, 0);
  head.scale.set(0.9, 1.1, 0.9); // Make slightly oval
  head.castShadow = true;
  character.add(head);

  // Create proper hair that covers the head
  const hairGeometry = new THREE.SphereGeometry(0.27, 32, 24);
  const hair = new THREE.Mesh(hairGeometry, hairMaterial);
  hair.position.set(0, 0.73, 0);
  hair.scale.set(1, 0.7, 1);
  character.add(hair);

  // Add more detailed hair on top
  const topHairGeometry = new THREE.SphereGeometry(0.2, 32, 24);
  const topHair = new THREE.Mesh(topHairGeometry, hairMaterial);
  topHair.position.set(0, 0.85, 0);
  topHair.scale.set(1.2, 0.6, 1.2);
  character.add(topHair);

  // Create ears
  const earGeometry = new THREE.SphereGeometry(0.06, 12, 12);

  // Left ear
  const leftEar = new THREE.Mesh(earGeometry, skinMaterial);
  leftEar.position.set(-0.22, 0.7, 0);
  leftEar.scale.set(0.5, 1, 0.7);
  character.add(leftEar);

  // Right ear
  const rightEar = new THREE.Mesh(earGeometry, skinMaterial);
  rightEar.position.set(0.22, 0.7, 0);
  rightEar.scale.set(0.5, 1, 0.7);
  character.add(rightEar);

  // Create nose
  const noseGeometry = new THREE.ConeGeometry(0.05, 0.1, 8);
  const nose = new THREE.Mesh(noseGeometry, skinMaterial);
  nose.position.set(0, 0.68, 0.24);
  nose.rotation.x = -Math.PI / 2;
  nose.scale.set(0.8, 1, 0.8);
  character.add(nose);

  // Create eyebrows
  const eyebrowGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.01);
  const eyebrowMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2314 }); // Same as hair

  // Left eyebrow
  const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
  leftEyebrow.position.set(-0.1, 0.78, 0.22);
  leftEyebrow.rotation.z = Math.PI / 12; // Slight angle
  character.add(leftEyebrow);

  // Right eyebrow
  const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
  rightEyebrow.position.set(0.1, 0.78, 0.22);
  rightEyebrow.rotation.z = -Math.PI / 12; // Slight angle
  character.add(rightEyebrow);

  // Create eyes
  const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 16);

  // Left eye
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.1, 0.72, 0.2);
  leftEye.scale.set(0.8, 1, 0.5);
  character.add(leftEye);

  // Right eye
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.1, 0.72, 0.2);
  rightEye.scale.set(0.8, 1, 0.5);
  character.add(rightEye);

  // Create whites of eyes
  const eyeWhiteGeometry = new THREE.SphereGeometry(0.055, 16, 16);
  const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

  // Left eye white
  const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
  leftEyeWhite.position.set(-0.1, 0.72, 0.19);
  leftEyeWhite.scale.set(0.9, 1.1, 0.1);
  character.add(leftEyeWhite);

  // Right eye white
  const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
  rightEyeWhite.position.set(0.1, 0.72, 0.19);
  rightEyeWhite.scale.set(0.9, 1.1, 0.1);
  character.add(rightEyeWhite);

  // Create mouth
  const mouthGeometry = new THREE.BoxGeometry(0.1, 0.03, 0.01);
  const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0xc53030 });
  const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
  mouth.position.set(0, 0.6, 0.22);
  character.add(mouth);

  // Create shoulders
  const shoulderGeometry = new THREE.SphereGeometry(0.15, 16, 16);

  // Left shoulder
  const leftShoulder = new THREE.Mesh(shoulderGeometry, shirtMaterial);
  leftShoulder.position.set(-0.45, 0.3, 0);
  leftShoulder.castShadow = true;
  character.add(leftShoulder);

  // Right shoulder
  const rightShoulder = new THREE.Mesh(shoulderGeometry, shirtMaterial);
  rightShoulder.position.set(0.45, 0.3, 0);
  rightShoulder.castShadow = true;
  character.add(rightShoulder);

  // Create upper arms
  const upperArmGeometry = new THREE.CapsuleGeometry(0.08, 0.35, 8, 16);

  // Left upper arm
  const leftUpperArm = new THREE.Mesh(upperArmGeometry, shirtMaterial);
  leftUpperArm.position.set(-0.45, 0.05, 0);
  leftUpperArm.rotation.z = Math.PI / 12; // Slight angle
  leftUpperArm.castShadow = true;
  character.add(leftUpperArm);

  // Right upper arm
  const rightUpperArm = new THREE.Mesh(upperArmGeometry, shirtMaterial);
  rightUpperArm.position.set(0.45, 0.05, 0);
  rightUpperArm.rotation.z = -Math.PI / 12; // Slight angle
  rightUpperArm.castShadow = true;
  character.add(rightUpperArm);

  // Create elbows
  const elbowGeometry = new THREE.SphereGeometry(0.09, 16, 16);

  // Left elbow
  const leftElbow = new THREE.Mesh(elbowGeometry, skinMaterial);
  leftElbow.position.set(-0.5, -0.15, 0);
  leftElbow.castShadow = true;
  character.add(leftElbow);

  // Right elbow
  const rightElbow = new THREE.Mesh(elbowGeometry, skinMaterial);
  rightElbow.position.set(0.5, -0.15, 0);
  rightElbow.castShadow = true;
  character.add(rightElbow);

  // Create forearms
  const forearmGeometry = new THREE.CapsuleGeometry(0.07, 0.35, 8, 16);

  // Left forearm (this will be animated) - positioned to hang naturally at the side
  const leftForearm = new THREE.Mesh(forearmGeometry, skinMaterial);
  leftForearm.position.set(-0.42, -0.35, 0.02);
  leftForearm.rotation.z = Math.PI / 30; // Very slight outward angle
  leftForearm.rotation.x = Math.PI / 24; // Very slight forward angle
  leftForearm.castShadow = true;
  leftForearm.name = "leftArm"; // Keep the same name for animation compatibility
  character.add(leftForearm);

  // Right forearm (this will be animated) - positioned to hang naturally at the side
  const rightForearm = new THREE.Mesh(forearmGeometry, skinMaterial);
  rightForearm.position.set(0.42, -0.35, 0.02);
  rightForearm.rotation.z = -Math.PI / 30; // Very slight outward angle
  rightForearm.rotation.x = Math.PI / 24; // Very slight forward angle
  rightForearm.castShadow = true;
  rightForearm.name = "rightArm"; // Keep the same name for animation compatibility
  character.add(rightForearm);

  // Create hands with fingers
  // Hand palm
  const handGeometry = new THREE.SphereGeometry(0.08, 16, 16);

  // Left hand - positioned to align with forearm
  const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
  leftHand.position.set(-0.44, -0.55, 0.05);
  leftHand.scale.set(1, 0.8, 0.5);
  leftHand.rotation.x = Math.PI / 24; // Very slight forward angle
  leftHand.castShadow = true;
  character.add(leftHand);

  // Right hand - positioned to align with forearm
  const rightHand = new THREE.Mesh(handGeometry, skinMaterial);
  rightHand.position.set(0.44, -0.55, 0.05);
  rightHand.scale.set(1, 0.8, 0.5);
  rightHand.rotation.x = Math.PI / 24; // Very slight forward angle
  rightHand.castShadow = true;
  character.add(rightHand);

  // Create fingers
  const fingerGeometry = new THREE.CapsuleGeometry(0.02, 0.08, 4, 8);

  // Left hand fingers - aligned with hand position
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(fingerGeometry, skinMaterial);
    // Position fingers in a natural arrangement
    const angle = (Math.PI / 12) * (i - 1.5);
    finger.position.set(
      -0.44 - Math.cos(angle) * 0.08,
      -0.58 - Math.sin(angle) * 0.08,
      0.08 + i * 0.01 // Stagger depth slightly
    );
    finger.rotation.z = angle / 3; // Very slight angle
    finger.rotation.x = Math.PI / 24; // Very slight forward angle
    finger.castShadow = true;
    character.add(finger);
  }

  // Right hand fingers - aligned with hand position
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(fingerGeometry, skinMaterial);
    // Position fingers in a natural arrangement
    const angle = (Math.PI / 12) * (i - 1.5);
    finger.position.set(
      0.44 + Math.cos(angle) * 0.08,
      -0.58 - Math.sin(angle) * 0.08,
      0.08 + i * 0.01 // Stagger depth slightly
    );
    finger.rotation.z = -angle / 3; // Very slight angle
    finger.rotation.x = Math.PI / 24; // Very slight forward angle
    finger.castShadow = true;
    character.add(finger);
  }

  // Create thumbs (slightly larger)
  const thumbGeometry = new THREE.CapsuleGeometry(0.025, 0.07, 4, 8);

  // Left thumb - aligned with hand position
  const leftThumb = new THREE.Mesh(thumbGeometry, skinMaterial);
  leftThumb.position.set(-0.5, -0.52, 0.08);
  leftThumb.rotation.z = -Math.PI / 12;
  leftThumb.rotation.x = Math.PI / 24;
  leftThumb.castShadow = true;
  character.add(leftThumb);

  // Right thumb - aligned with hand position
  const rightThumb = new THREE.Mesh(thumbGeometry, skinMaterial);
  rightThumb.position.set(0.5, -0.52, 0.08);
  rightThumb.rotation.z = Math.PI / 12;
  rightThumb.rotation.x = Math.PI / 24;
  rightThumb.castShadow = true;
  character.add(rightThumb);

  // Create thighs
  const thighGeometry = new THREE.CapsuleGeometry(0.12, 0.4, 8, 16);

  // Left thigh
  const leftThigh = new THREE.Mesh(thighGeometry, pantsMaterial);
  leftThigh.position.set(-0.2, -0.6, 0);
  leftThigh.castShadow = true;
  character.add(leftThigh);

  // Right thigh
  const rightThigh = new THREE.Mesh(thighGeometry, pantsMaterial);
  rightThigh.position.set(0.2, -0.6, 0);
  rightThigh.castShadow = true;
  character.add(rightThigh);

  // Create knees
  const kneeGeometry = new THREE.SphereGeometry(0.12, 16, 16);

  // Left knee
  const leftKnee = new THREE.Mesh(kneeGeometry, pantsMaterial);
  leftKnee.position.set(-0.2, -0.8, 0);
  leftKnee.castShadow = true;
  character.add(leftKnee);

  // Right knee
  const rightKnee = new THREE.Mesh(kneeGeometry, pantsMaterial);
  rightKnee.position.set(0.2, -0.8, 0);
  rightKnee.castShadow = true;
  character.add(rightKnee);

  // Create lower legs (these will be animated)
  const lowerLegGeometry = new THREE.CapsuleGeometry(0.1, 0.4, 8, 16);

  // Left lower leg
  const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, pantsMaterial);
  leftLowerLeg.position.set(-0.2, -1.0, 0);
  leftLowerLeg.castShadow = true;
  leftLowerLeg.name = "leftLeg"; // Keep the same name for animation compatibility
  character.add(leftLowerLeg);

  // Right lower leg
  const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, pantsMaterial);
  rightLowerLeg.position.set(0.2, -1.0, 0);
  rightLowerLeg.castShadow = true;
  rightLowerLeg.name = "rightLeg"; // Keep the same name for animation compatibility
  character.add(rightLowerLeg);

  // Create feet
  const footGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.25);

  // Left foot
  const leftFoot = new THREE.Mesh(footGeometry, shoesMaterial);
  leftFoot.position.set(-0.2, -1.25, 0.05);
  leftFoot.castShadow = true;
  character.add(leftFoot);

  // Right foot
  const rightFoot = new THREE.Mesh(footGeometry, shoesMaterial);
  rightFoot.position.set(0.2, -1.25, 0.05);
  rightFoot.castShadow = true;
  character.add(rightFoot);

  // Create animation mixer
  mixer = new THREE.AnimationMixer(character);
}

/**
 * Handle key down events
 * @param {KeyboardEvent} event - The keyboard event
 */
function onKeyDown(event) {
  // Only process key events when controls are locked
  if (!controls.isLocked) return;

  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      movementState.moveForward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      movementState.turnLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      movementState.moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      movementState.turnRight = true;
      break;
    case 'Space':
      if (movementState.canJump) {
        movementState.velocity.y = JUMP_FORCE;
      }
      movementState.canJump = false;
      break;
  }
}

/**
 * Handle key up events
 * @param {KeyboardEvent} event - The keyboard event
 */
function onKeyUp(event) {
  // Only process key events when controls are locked
  if (!controls.isLocked) return;

  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      movementState.moveForward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      movementState.turnLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      movementState.moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      movementState.turnRight = false;
      break;
  }
}

/**
 * Update camera position for third-person view
 * @param {THREE.Camera} camera - The camera to update
 * @param {THREE.Vector3} characterPosition - The character's position
 * @param {THREE.Vector3} direction - The movement direction
 */
export function updateThirdPersonCamera(camera, characterPosition) {
  // Calculate camera position behind and above character
  const cameraOffset = new THREE.Vector3(0, 1.5, 4); // Height and distance behind

  // Position camera behind character based on character's rotation
  const cameraPosition = new THREE.Vector3();
  cameraPosition.copy(characterPosition);

  // Apply offset in the direction the character is facing
  const rotationAngle = character.rotation.y;
  cameraOffset.x = Math.sin(rotationAngle) * 4; // 4 units behind
  cameraOffset.z = Math.cos(rotationAngle) * 4;

  // Add offset to character position
  cameraPosition.add(new THREE.Vector3(0, cameraOffset.y, 0)); // Add height
  cameraPosition.sub(new THREE.Vector3(cameraOffset.x, 0, cameraOffset.z)); // Subtract horizontal offset

  // Update camera position
  camera.position.copy(cameraPosition);

  // Make camera look at character (slightly above the character's position)
  const lookAtPosition = new THREE.Vector3();
  lookAtPosition.copy(characterPosition);
  lookAtPosition.y += 1.0; // Look at a point slightly above the character
  camera.lookAt(lookAtPosition);
}

/**
 * Update character rotation based on turn state
 * @param {number} delta - Time delta for smooth rotation
 */
export function updateCharacterRotation(delta) {
  if (!character) return;

  // Define rotation speed (radians per second)
  const rotationSpeed = 2.0;

  // Apply rotation based on turn state
  if (movementState.turnLeft) {
    character.rotation.y += rotationSpeed * delta;
  }
  if (movementState.turnRight) {
    character.rotation.y -= rotationSpeed * delta;
  }

  // Normalize rotation angle to keep it between 0 and 2*PI
  character.rotation.y = character.rotation.y % (Math.PI * 2);
}

/**
 * Animate character walking
 * @param {number} delta - Time delta for animation
 * @param {THREE.Vector3} direction - Movement direction
 */
export function animateCharacterWalking(delta, direction) {
  if (!character) return;

  // Check if character is moving
  const isMoving = direction.x !== 0 || direction.z !== 0;

  // Find limbs by name
  const leftArm = character.getObjectByName("leftArm");
  const rightArm = character.getObjectByName("rightArm");
  const leftLeg = character.getObjectByName("leftLeg");
  const rightLeg = character.getObjectByName("rightLeg");

  if (leftArm && rightArm && leftLeg && rightLeg) {
    if (isMoving) {
      // Calculate animation time
      const walkSpeed = 7; // Speed of walking animation
      const walkTime = performance.now() * 0.001 * walkSpeed;

      // Arm swing animation
      leftArm.rotation.x = Math.sin(walkTime) * 0.5;
      rightArm.rotation.x = Math.sin(walkTime + Math.PI) * 0.5; // Opposite phase

      // Leg swing animation
      leftLeg.rotation.x = Math.sin(walkTime) * 0.5;
      rightLeg.rotation.x = Math.sin(walkTime + Math.PI) * 0.5; // Opposite phase

      // Reset arm side angle while walking to look more natural
      leftArm.rotation.z = Math.PI / 6 + Math.sin(walkTime) * 0.1;
      rightArm.rotation.z = -Math.PI / 6 - Math.sin(walkTime + Math.PI) * 0.1;
    } else {
      // Reset to idle pose when not moving
      leftArm.rotation.x = Math.PI / 24; // Very slight forward angle
      rightArm.rotation.x = Math.PI / 24; // Very slight forward angle
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;

      // Maintain very slight natural angle for arms in idle pose
      leftArm.rotation.z = Math.PI / 30;
      rightArm.rotation.z = -Math.PI / 30;
    }
  }
}

// Export variables and state for use in other modules
export { character, mixer, controls, movementState };
