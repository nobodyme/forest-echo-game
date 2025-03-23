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

  // Material for all body parts
  const material = new THREE.MeshStandardMaterial({ color: 0x8fbcd4 });

  // Create body (capsule)
  const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1.0, 4, 8);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.castShadow = true;
  character.add(body);

  // Create head (small sphere)
  const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
  const head = new THREE.Mesh(headGeometry, material);
  head.position.set(0, 0.9, 0);
  head.castShadow = true;
  character.add(head);

  // Create arms
  const armGeometry = new THREE.CapsuleGeometry(0.15, 0.7, 4, 8);

  // Left arm
  const leftArm = new THREE.Mesh(armGeometry, material);
  leftArm.position.set(-0.65, 0.2, 0);
  leftArm.rotation.z = Math.PI / 4; // Angle arm outward slightly
  leftArm.castShadow = true;
  leftArm.name = "leftArm";
  character.add(leftArm);

  // Right arm
  const rightArm = new THREE.Mesh(armGeometry, material);
  rightArm.position.set(0.65, 0.2, 0);
  rightArm.rotation.z = -Math.PI / 4; // Angle arm outward slightly
  rightArm.castShadow = true;
  rightArm.name = "rightArm";
  character.add(rightArm);

  // Create legs
  const legGeometry = new THREE.CapsuleGeometry(0.2, 0.8, 4, 8);

  // Left leg
  const leftLeg = new THREE.Mesh(legGeometry, material);
  leftLeg.position.set(-0.3, -0.8, 0);
  leftLeg.castShadow = true;
  leftLeg.name = "leftLeg";
  character.add(leftLeg);

  // Right leg
  const rightLeg = new THREE.Mesh(legGeometry, material);
  rightLeg.position.set(0.3, -0.8, 0);
  rightLeg.castShadow = true;
  rightLeg.name = "rightLeg";
  character.add(rightLeg);

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
      leftArm.rotation.x = 0;
      rightArm.rotation.x = 0;
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;

      // Maintain slight outward angle for arms in idle pose
      leftArm.rotation.z = Math.PI / 4;
      rightArm.rotation.z = -Math.PI / 4;
    }
  }
}

// Export variables and state for use in other modules
export { character, mixer, controls, movementState };
