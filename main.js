import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';

// Main variables
let camera, scene, renderer;
let controls;
let character;
let mixer;
let clock = new THREE.Clock();
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let trees = [];
let loadingManager;
let waterSurface;

// Constants
const WORLD_SIZE = 1000;
const TREE_COUNT = 200;
const CHARACTER_SPEED = 150.0;
const CHARACTER_HEIGHT = 1.7;
const GRAVITY = 30.0;
const JUMP_FORCE = 10.0;

// Initialize the scene
init();

// Main initialization function
function init() {
  // Create loading manager
  loadingManager = new THREE.LoadingManager();
  loadingManager.onLoad = () => {
    document.getElementById('loading').classList.add('hidden');
    animate();
  };

  // Create scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xc4e0f9, 0.005);

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

  // Create controls
  controls = new PointerLockControls(camera, renderer.domElement);

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

  // Add window resize listener
  window.addEventListener('resize', onWindowResize);

  // Create the environment
  createLighting();
  createSky();
  createGround();
  createWater();
  createForest();
  loadCharacter();
}

// Create lighting for the scene
function createLighting() {
  // Ambient light for overall illumination
  const ambientLight = new THREE.AmbientLight(0x90a0b0, 1.0);
  scene.add(ambientLight);

  // Directional light for sun effect
  const sunLight = new THREE.DirectionalLight(0xffffeb, 1.5);
  sunLight.position.set(-100, 100, -100);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 500;
  sunLight.shadow.camera.left = -100;
  sunLight.shadow.camera.right = 100;
  sunLight.shadow.camera.top = 100;
  sunLight.shadow.camera.bottom = -100;
  scene.add(sunLight);
}

// Create sky with atmosphere
function createSky() {
  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  const sun = new THREE.Vector3();
  const phi = THREE.MathUtils.degToRad(88);
  const theta = THREE.MathUtils.degToRad(180);

  sun.setFromSphericalCoords(1, phi, theta);
  skyUniforms['sunPosition'].value.copy(sun);
}

// Create ground plane
function createGround() {
  // Ground texture
  const textureLoader = new THREE.TextureLoader(loadingManager);
  const groundTexture = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(25, 25);
  groundTexture.anisotropy = 16;

  // Ground material
  const groundMaterial = new THREE.MeshStandardMaterial({
    map: groundTexture,
    roughness: 0.8,
    metalness: 0.1
  });

  // Ground mesh
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
    groundMaterial
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}

// Create water surface
function createWater() {
  const waterGeometry = new THREE.PlaneGeometry(WORLD_SIZE / 3, WORLD_SIZE / 3);

  waterSurface = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg', function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }),
      sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
    }
  );

  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.y = -0.5;
  waterSurface.position.z = -WORLD_SIZE / 4;
  scene.add(waterSurface);
}

// Create forest with trees
function createForest() {
  // Simple tree geometry
  const treeGeometry = new THREE.CylinderGeometry(0, 4, 10, 8, 1);
  const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 5, 8);

  // Tree materials
  const treeMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d4c1e,
    flatShading: true,
    roughness: 0.9
  });

  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    flatShading: true,
    roughness: 1.0
  });

  // Create trees
  for (let i = 0; i < TREE_COUNT; i++) {
    // Create tree group
    const tree = new THREE.Group();

    // Create trunk
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    trunk.position.y = 2.5;
    tree.add(trunk);

    // Create leaves
    const leaves = new THREE.Mesh(treeGeometry, treeMaterial);
    leaves.castShadow = true;
    leaves.position.y = 7.5;
    tree.add(leaves);

    // Position tree randomly in the world
    const x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    const z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;

    // Avoid placing trees in the center (player spawn) and in the lake
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    if (distanceFromCenter < 10 || (Math.abs(z + WORLD_SIZE / 4) < WORLD_SIZE / 6 && Math.abs(x) < WORLD_SIZE / 6)) {
      i--; // Try again
      continue;
    }

    tree.position.set(x, 0, z);

    // Add some variation to tree size
    const scale = 0.5 + Math.random() * 0.5;
    tree.scale.set(scale, scale, scale);

    // Add tree to scene and store reference
    scene.add(tree);
    trees.push({
      mesh: tree,
      radius: 0.7 * scale // Collision radius
    });
  }
}

// Load character model
function loadCharacter() {
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

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle key down events
function onKeyDown(event) {
  // Only process key events when controls are locked
  if (!controls.isLocked) return;

  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;
    case 'Space':
      if (canJump) {
        velocity.y = JUMP_FORCE;
      }
      canJump = false;
      break;
  }
}

// Handle key up events
function onKeyUp(event) {
  // Only process key events when controls are locked
  if (!controls.isLocked) return;

  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
  }
}

// Check for collisions with trees
function checkTreeCollisions(position, radius) {
  for (const tree of trees) {
    const treePos = tree.mesh.position;
    const dx = position.x - treePos.x;
    const dz = position.z - treePos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < radius + tree.radius) {
      // Calculate push direction
      const pushX = dx / distance;
      const pushZ = dz / distance;

      // Push character away from tree
      position.x = treePos.x + pushX * (radius + tree.radius);
      position.z = treePos.z + pushZ * (radius + tree.radius);

      return true;
    }
  }
  return false;
}

// Check if position is in water
function isInWater(position) {
  if (!waterSurface) return false;

  const waterPos = waterSurface.position;
  const waterSize = WORLD_SIZE / 6;

  return (
    Math.abs(position.x - waterPos.x) < waterSize &&
    Math.abs(position.z - waterPos.z) < waterSize
  );
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update water if it exists
  if (waterSurface) {
    waterSurface.material.uniforms['time'].value += 1.0 / 60.0;
  }

  // Update character animation mixer if it exists
  if (mixer) {
    mixer.update(clock.getDelta());
  }

  // Handle character movement
  if (controls.isLocked) {
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    // Apply gravity
    velocity.y -= GRAVITY * delta;

    // Reset velocity for horizontal movement
    velocity.x = 0;
    velocity.z = 0;

    // Get movement direction
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);

    // Only normalize if we're actually moving
    if (direction.x !== 0 || direction.z !== 0) {
      direction.normalize();

      // Calculate movement speed (slower in water)
      let speed = CHARACTER_SPEED;
      if (isInWater(camera.position)) {
        speed *= 0.5;
      }

      // Calculate movement velocity
      velocity.z = direction.z * speed * delta;
      velocity.x = direction.x * speed * delta;
    }

    // Move character using the calculated velocity
    controls.moveRight(velocity.x);
    controls.moveForward(velocity.z);

    // Update character position to match camera
    character.position.copy(camera.position);
    character.position.y -= CHARACTER_HEIGHT;

    // Check for collisions with trees
    checkTreeCollisions(camera.position, 1.0);

    // Keep character within world bounds
    const worldHalfSize = WORLD_SIZE / 2;
    if (camera.position.x < -worldHalfSize) camera.position.x = -worldHalfSize;
    if (camera.position.x > worldHalfSize) camera.position.x = worldHalfSize;
    if (camera.position.z < -worldHalfSize) camera.position.z = -worldHalfSize;
    if (camera.position.z > worldHalfSize) camera.position.z = worldHalfSize;

    // Apply gravity to camera position
    camera.position.y += velocity.y * delta;

    // Check if character is on the ground
    if (camera.position.y < CHARACTER_HEIGHT) {
      velocity.y = 0;
      camera.position.y = CHARACTER_HEIGHT;
      canJump = true;
    }

    prevTime = time;
  }

  // Render scene
  renderer.render(scene, camera);
}
