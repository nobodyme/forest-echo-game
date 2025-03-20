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
  moveLeft: false,
  moveRight: false,
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
  const loader = new GLTFLoader(loadingManager);

  // Use a simple placeholder for now
  const geometry = new THREE.CapsuleGeometry(0.5, 1.0, 4, 8);
  const material = new THREE.MeshStandardMaterial({ color: 0x8fbcd4 });
  character = new THREE.Mesh(geometry, material);
  character.position.set(0, CHARACTER_HEIGHT, 0);
  character.castShadow = true;
  character.visible = false; // Hide character since we're in first person
  scene.add(character);

  // In a real implementation, you would load a GLTF model:
  /*
  loader.load('path/to/character.glb', (gltf) => {
      character = gltf.scene;
      character.position.set(0, 0, 0);
      character.scale.set(0.1, 0.1, 0.1);
      character.castShadow = true;
      scene.add(character);
      
      // Setup character animations
      mixer = new THREE.AnimationMixer(character);
      const animations = gltf.animations;
      // ... animation setup code ...
  });
  */
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
      movementState.moveLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      movementState.moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      movementState.moveRight = true;
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
      movementState.moveLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      movementState.moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      movementState.moveRight = false;
      break;
  }
}

// Export variables and state for use in other modules
export { character, mixer, controls, movementState };
