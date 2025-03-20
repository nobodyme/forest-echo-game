// Core setup and animation loop
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLighting, createSky, createGround, createWater } from './environment.js';
import { createForest, createUndergrowth, trees, leafGroups, undergrowth } from './forest.js';
import { loadCharacter, initControls, character, mixer, controls, movementState } from './character.js';
import { checkTreeCollisions, isInWater } from './physics.js';
import { animateWind } from './animation.js';
import { WORLD_SIZE, CHARACTER_HEIGHT, GRAVITY, WIND_STRENGTH, WIND_SPEED, CHARACTER_SPEED } from './constants.js';

// Main variables
let camera, scene, renderer;
let clock = new THREE.Clock();
let prevTime = performance.now();
let direction = new THREE.Vector3();
let waterSurface;
let loadingManager;

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

  // Initialize controls
  initControls(camera, renderer.domElement);

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
  if (controls.isLocked) {
    const time = performance.now();
    const moveDelta = (time - prevTime) / 1000;

    // Apply gravity
    movementState.velocity.y -= GRAVITY * moveDelta;

    // Reset velocity for horizontal movement
    movementState.velocity.x = 0;
    movementState.velocity.z = 0;

    // Get movement direction
    direction.z = Number(movementState.moveForward) - Number(movementState.moveBackward);
    direction.x = Number(movementState.moveRight) - Number(movementState.moveLeft);

    // Only normalize if we're actually moving
    if (direction.x !== 0 || direction.z !== 0) {
      direction.normalize();

      // Calculate movement speed (slower in water)
      let speed = CHARACTER_SPEED;
      if (isInWater(camera.position, waterSurface, WORLD_SIZE)) {
        speed *= 0.5;
      }

      // Calculate movement velocity
      movementState.velocity.z = direction.z * speed * moveDelta;
      movementState.velocity.x = direction.x * speed * moveDelta;
    }

    // Move character using the calculated velocity
    controls.moveRight(movementState.velocity.x);
    controls.moveForward(movementState.velocity.z);

    // Update character position to match camera
    character.position.copy(camera.position);
    character.position.y -= CHARACTER_HEIGHT;

    // Check for collisions with trees
    checkTreeCollisions(camera.position, 1.0, trees);

    // Keep character within world bounds
    const worldHalfSize = WORLD_SIZE / 2;
    if (camera.position.x < -worldHalfSize) camera.position.x = -worldHalfSize;
    if (camera.position.x > worldHalfSize) camera.position.x = worldHalfSize;
    if (camera.position.z < -worldHalfSize) camera.position.z = -worldHalfSize;
    if (camera.position.z > worldHalfSize) camera.position.z = worldHalfSize;

    // Apply gravity to camera position
    camera.position.y += movementState.velocity.y * moveDelta;

    // Check if character is on the ground
    if (camera.position.y < CHARACTER_HEIGHT) {
      movementState.velocity.y = 0;
      camera.position.y = CHARACTER_HEIGHT;
      movementState.canJump = true;
    }

    prevTime = time;
  }

  // Render scene
  renderer.render(scene, camera);
}
