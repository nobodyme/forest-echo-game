// Core setup and animation loop
import * as THREE from 'three';
import { createLighting, createSky, createGround, createWater } from './environment.js';
import { createForest, createUndergrowth, trees, leafGroups, undergrowth } from './forest.js';
import { loadCharacter, character, mixer, movementState, updateThirdPersonCamera, updateCharacterRotation, animateCharacterWalking } from './character.js';
import { checkTreeCollisions, isInWater } from './physics.js';
import { animateWind } from './animation.js';
import { WORLD_SIZE, CHARACTER_HEIGHT, GRAVITY, WIND_STRENGTH, WIND_SPEED, CHARACTER_SPEED, JUMP_FORCE } from './constants.js';

// Main variables
let camera, scene, renderer;
let clock = new THREE.Clock();
let prevTime = performance.now();
let direction = new THREE.Vector3();
let waterSurface;
let loadingManager;
let isPointerLocked = false;
let mouseX = 0;
let mouseY = 0;

/**
 * Initialize the scene
 */
export function init() {
  // Create loading manager
  loadingManager = new THREE.LoadingManager();
  loadingManager.onLoad = () => {
    document.getElementById('loading').classList.add('hidden');
    animate();
  };

  // Create scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xc4e0f9, 0.007); // Increased fog density for atmosphere

  // Create camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, CHARACTER_HEIGHT, 5);

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  document.getElementById('container').appendChild(renderer.domElement);

  // Add key event listeners for character movement
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Add click event listener to lock pointer
  const container = document.getElementById('container');
  const canvas = renderer.domElement;
  container.addEventListener('click', () => {
    canvas.requestPointerLock();
  });

  // Add pointer lock change event listeners
  document.addEventListener('pointerlockchange', onPointerLockChange);

  // Auto-lock pointer on page load for testing
  setTimeout(() => {
    canvas.requestPointerLock();
  }, 1000);

  // Add window resize listener
  window.addEventListener('resize', onWindowResize);

  // Create the environment
  createLighting(scene);
  createSky(scene);
  createGround(scene, loadingManager);
  waterSurface = createWater(scene);
  createForest(scene);
  createUndergrowth(scene);
  loadCharacter(scene, loadingManager);
}

/**
 * Handle window resize
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Handle pointer lock change
 */
function onPointerLockChange() {
  const canvas = renderer.domElement;
  isPointerLocked = document.pointerLockElement === canvas;

  if (isPointerLocked) {
    document.addEventListener('mousemove', onMouseMove);
    document.getElementById('info').classList.add('hidden');
  } else {
    document.removeEventListener('mousemove', onMouseMove);
    document.getElementById('info').classList.remove('hidden');
  }
}

/**
 * Handle mouse movement
 * @param {MouseEvent} event - The mouse event
 */
function onMouseMove(event) {
  if (!isPointerLocked) return;

  // Update mouse position for camera rotation
  mouseX += event.movementX * 0.002;
}

/**
 * Handle key down events
 * @param {KeyboardEvent} event - The keyboard event
 */
function onKeyDown(event) {
  // Process key events even if pointer is not locked
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
  // Process key events even if pointer is not locked
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
 * Animation loop
 */
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Animate wind effect on leaves
  animateWind(delta, leafGroups, undergrowth, WIND_STRENGTH, WIND_SPEED);

  // Update water if it exists
  if (waterSurface) {
    waterSurface.material.uniforms['time'].value += 1.0 / 60.0;
  }

  // Update character animation mixer if it exists
  if (mixer) {
    mixer.update(delta);
  }

  // Handle character movement
  if (character) { // Process character movement even if pointer is not locked
    const time = performance.now();
    const moveDelta = (time - prevTime) / 1000;

    // Apply gravity
    movementState.velocity.y -= GRAVITY * moveDelta;

    // Reset velocity for horizontal movement
    movementState.velocity.x = 0;
    movementState.velocity.z = 0;

    // Get movement direction - only forward/backward now
    direction.z = Number(movementState.moveForward) - Number(movementState.moveBackward);
    direction.x = 0; // No more left/right movement, only rotation

    // Only normalize if we're actually moving
    if (direction.z !== 0) {
      direction.normalize();

      // Calculate movement speed (slower in water)
      let speed = CHARACTER_SPEED;
      if (isInWater(character.position, waterSurface, WORLD_SIZE)) {
        speed *= 0.5;
      }

      // Calculate movement velocity based on character's rotation
      const angle = character.rotation.y;
      movementState.velocity.x = Math.sin(angle) * direction.z * speed * moveDelta;
      movementState.velocity.z = Math.cos(angle) * direction.z * speed * moveDelta;
    }

    // Update character rotation based on turn state
    updateCharacterRotation(delta);

    // Animate character walking
    animateCharacterWalking(delta, direction);

    // Move character using the calculated velocity
    character.position.x += movementState.velocity.x;
    character.position.z += movementState.velocity.z;

    // Apply gravity to character position
    character.position.y += movementState.velocity.y * moveDelta;

    // Check for collisions with trees
    checkTreeCollisions(character.position, 1.0, trees);

    // Keep character within world bounds
    const worldHalfSize = WORLD_SIZE / 2;
    if (character.position.x < -worldHalfSize) character.position.x = -worldHalfSize;
    if (character.position.x > worldHalfSize) character.position.x = worldHalfSize;
    if (character.position.z < -worldHalfSize) character.position.z = -worldHalfSize;
    if (character.position.z > worldHalfSize) character.position.z = worldHalfSize;

    // Check if character is on the ground
    if (character.position.y < CHARACTER_HEIGHT / 2) {
      movementState.velocity.y = 0;
      character.position.y = CHARACTER_HEIGHT / 2;
      movementState.canJump = true;
    }

    // Update camera position to follow character
    updateThirdPersonCamera(camera, character.position);

    prevTime = time;
  }

  // Render scene
  renderer.render(scene, camera);
}
