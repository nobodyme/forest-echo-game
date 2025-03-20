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
let windTime = 0; // Time variable for wind animation
let leafGroups = []; // Store leaf groups for wind animation
let undergrowth = []; // Store undergrowth elements

// Constants
const WORLD_SIZE = 1000;
const TREE_COUNT = 400; // Increased tree count for denser forest
const UNDERGROWTH_COUNT = 600; // Add undergrowth for more density
const CHARACTER_SPEED = 150.0;
const CHARACTER_HEIGHT = 1.7;
const GRAVITY = 30.0;
const JUMP_FORCE = 10.0;
const WIND_STRENGTH = 0.3; // Wind strength for leaf movement
const WIND_SPEED = 0.5; // Wind speed for animation

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
  createUndergrowth(); // Add undergrowth
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

// Create a more natural tree with animated leaves
function createNaturalTree(treeType, position, scale) {
  const tree = new THREE.Group();

  // Create trunk with natural curve
  let trunkHeight = 5 + Math.random() * 3;
  let trunkGeometry;
  let trunkMaterial;

  // Different tree types
  if (treeType === 0) { // Pine tree
    // Trunk
    trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, trunkHeight, 8);
    trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 1.0,
      flatShading: true
    });

    // Create trunk with slight curve
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    trunk.position.y = trunkHeight / 2;

    // Add slight random rotation to trunk for natural look
    trunk.rotation.x = (Math.random() - 0.5) * 0.2;
    trunk.rotation.z = (Math.random() - 0.5) * 0.2;

    tree.add(trunk);

    // Create multiple layers of pine leaves
    const leafLayers = 3 + Math.floor(Math.random() * 3);
    const leafGroup = new THREE.Group();

    for (let i = 0; i < leafLayers; i++) {
      const layerSize = 4 - (i * 3.5 / leafLayers);
      const layerHeight = 2.5 - (i * 1.5 / leafLayers);
      const leafGeometry = new THREE.ConeGeometry(layerSize, layerHeight, 8);

      // Vary the leaf color slightly
      const hue = 0.27 + (Math.random() * 0.1 - 0.05);
      const saturation = 0.4 + (Math.random() * 0.2);
      const lightness = 0.2 + (Math.random() * 0.1);

      const leafMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, saturation, lightness),
        flatShading: true,
        roughness: 0.9
      });

      const leafLayer = new THREE.Mesh(leafGeometry, leafMaterial);
      leafLayer.castShadow = true;
      leafLayer.position.y = trunkHeight - i * 1.5;

      // Store original position for wind animation
      leafLayer.userData.originalY = leafLayer.position.y;
      leafLayer.userData.originalRotation = { x: leafLayer.rotation.x, y: leafLayer.rotation.y, z: leafLayer.rotation.z };
      leafLayer.userData.windFactor = Math.random() * 0.5 + 0.5; // Random wind factor

      leafGroup.add(leafLayer);
    }

    tree.add(leafGroup);
    leafGroups.push(leafGroup); // Store for animation

  } else { // Deciduous tree
    // Trunk with more natural shape
    trunkGeometry = new THREE.CylinderGeometry(0.2, 0.8, trunkHeight, 8);
    trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4d3319,
      roughness: 1.0,
      flatShading: true
    });

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    trunk.position.y = trunkHeight / 2;

    // Add slight random rotation to trunk for natural look
    trunk.rotation.x = (Math.random() - 0.5) * 0.2;
    trunk.rotation.z = (Math.random() - 0.5) * 0.2;

    tree.add(trunk);

    // Create branches
    const branchCount = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < branchCount; i++) {
      const branchLength = 1.5 + Math.random() * 2;
      const branchGeometry = new THREE.CylinderGeometry(0.15, 0.25, branchLength, 5);
      const branch = new THREE.Mesh(branchGeometry, trunkMaterial);

      // Position branch along trunk
      const branchHeight = trunkHeight * (0.5 + i * 0.2);
      branch.position.y = branchHeight;

      // Rotate branch outward
      const branchAngle = Math.PI / 4 + (Math.random() * Math.PI / 4);
      const branchDirection = Math.random() * Math.PI * 2;

      branch.rotation.z = branchAngle;
      branch.rotation.y = branchDirection;

      // Move branch origin to end
      branch.position.x = Math.sin(branchDirection) * Math.sin(branchAngle) * branchLength / 2;
      branch.position.z = Math.cos(branchDirection) * Math.sin(branchAngle) * branchLength / 2;

      tree.add(branch);
    }

    // Create leaf cluster (using instanced mesh for better performance)
    const leafCount = 40 + Math.floor(Math.random() * 60);
    const leafSize = 0.8 + Math.random() * 0.4;

    // Create leaf group for animation
    const leafGroup = new THREE.Group();

    // Create several leaf clusters
    const clusterCount = 3 + Math.floor(Math.random() * 3);

    for (let c = 0; c < clusterCount; c++) {
      // Vary the leaf color slightly
      const hue = 0.25 + (Math.random() * 0.15);
      const saturation = 0.4 + (Math.random() * 0.3);
      const lightness = 0.25 + (Math.random() * 0.15);

      const leafMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, saturation, lightness),
        side: THREE.DoubleSide,
        flatShading: true
      });

      // Create leaf geometry (simple for performance)
      const leafGeometry = new THREE.SphereGeometry(leafSize, 4, 3);
      leafGeometry.scale(1, 0.5, 1);

      // Create leaf cluster
      const cluster = new THREE.Mesh(
        new THREE.SphereGeometry(2 + Math.random(), 6, 5),
        leafMaterial
      );

      // Position cluster
      cluster.position.y = trunkHeight + Math.random() * 2;
      cluster.position.x = (Math.random() - 0.5) * 4;
      cluster.position.z = (Math.random() - 0.5) * 4;

      // Store original position for wind animation
      cluster.userData.originalY = cluster.position.y;
      cluster.userData.originalPosition = cluster.position.clone();
      cluster.userData.originalRotation = { x: cluster.rotation.x, y: cluster.rotation.y, z: cluster.rotation.z };
      cluster.userData.windFactor = Math.random() * 0.5 + 0.5; // Random wind factor

      leafGroup.add(cluster);
    }

    tree.add(leafGroup);
    leafGroups.push(leafGroup); // Store for animation
  }

  // Position tree
  tree.position.copy(position);

  // Scale tree
  tree.scale.set(scale, scale, scale);

  return tree;
}

// Create forest with trees
function createForest() {
  // Create trees
  for (let i = 0; i < TREE_COUNT; i++) {
    // Position tree randomly in the world
    const x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    const z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;

    // Avoid placing trees in the center (player spawn) and in the lake
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    if (distanceFromCenter < 10 || (Math.abs(z + WORLD_SIZE / 4) < WORLD_SIZE / 6 && Math.abs(x) < WORLD_SIZE / 6)) {
      i--; // Try again
      continue;
    }

    // Create tree with natural variation
    const treeType = Math.random() > 0.4 ? 0 : 1; // 60% pine, 40% deciduous
    const scale = 0.5 + Math.random() * 0.7; // More size variation
    const tree = createNaturalTree(treeType, new THREE.Vector3(x, 0, z), scale);

    // Add tree to scene and store reference
    scene.add(tree);
    trees.push({
      mesh: tree,
      radius: 0.7 * scale // Collision radius
    });
  }
}

// Create undergrowth (bushes, grass, etc.)
function createUndergrowth() {
  // Bush geometry and materials
  const bushGeometries = [
    new THREE.SphereGeometry(1, 6, 4),
    new THREE.SphereGeometry(0.8, 5, 3)
  ];

  // Different shades of green for variation
  const bushMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x1e4d2b, flatShading: true, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x2d5f3e, flatShading: true, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x1a3a24, flatShading: true, roughness: 0.9 })
  ];

  // Create undergrowth
  for (let i = 0; i < UNDERGROWTH_COUNT; i++) {
    // Position randomly in the world
    const x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    const z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;

    // Avoid placing in the center (player spawn) and in the lake
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    if (distanceFromCenter < 10 || (Math.abs(z + WORLD_SIZE / 4) < WORLD_SIZE / 6 && Math.abs(x) < WORLD_SIZE / 6)) {
      i--; // Try again
      continue;
    }

    // Create bush or grass
    const isGrass = Math.random() > 0.7;
    let undergrowthItem;

    if (isGrass) {
      // Simple grass tuft
      const grassGeometry = new THREE.CylinderGeometry(0.1, 0.3, 0.8, 5, 1);
      const grassMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a5f34,
        flatShading: true,
        roughness: 0.9
      });

      undergrowthItem = new THREE.Group();

      // Create several grass blades
      const bladeCount = 3 + Math.floor(Math.random() * 5);

      for (let b = 0; b < bladeCount; b++) {
        const blade = new THREE.Mesh(grassGeometry, grassMaterial);
        blade.position.x = (Math.random() - 0.5) * 0.5;
        blade.position.z = (Math.random() - 0.5) * 0.5;
        blade.rotation.x = (Math.random() - 0.5) * 0.2;
        blade.rotation.z = (Math.random() - 0.5) * 0.2;
        undergrowthItem.add(blade);
      }
    } else {
      // Bush
      const bushGeometry = bushGeometries[Math.floor(Math.random() * bushGeometries.length)];
      const bushMaterial = bushMaterials[Math.floor(Math.random() * bushMaterials.length)];

      undergrowthItem = new THREE.Mesh(bushGeometry, bushMaterial);

      // Add some variation
      undergrowthItem.scale.x = 0.5 + Math.random() * 1.0;
      undergrowthItem.scale.y = 0.5 + Math.random() * 0.7;
      undergrowthItem.scale.z = 0.5 + Math.random() * 1.0;
      undergrowthItem.rotation.y = Math.random() * Math.PI * 2;
    }

    // Position
    undergrowthItem.position.set(x, 0.2, z);
    undergrowthItem.castShadow = true;
    undergrowthItem.receiveShadow = true;

    // Add to scene
    scene.add(undergrowthItem);
    undergrowth.push(undergrowthItem);
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

// Animate leaves with wind
function animateWind(delta) {
  windTime += delta * WIND_SPEED;

  // Animate each leaf group
  for (const leafGroup of leafGroups) {
    // Apply different wind effect based on tree type
    for (let i = 0; i < leafGroup.children.length; i++) {
      const leaf = leafGroup.children[i];
      const windFactor = leaf.userData.windFactor || 1.0;

      // Calculate wind effect
      const windX = Math.sin(windTime + i) * WIND_STRENGTH * windFactor;
      const windZ = Math.cos(windTime * 0.7 + i * 0.2) * WIND_STRENGTH * 0.5 * windFactor;

      // Apply rotation for wind effect
      if (leaf.userData.originalRotation) {
        leaf.rotation.x = leaf.userData.originalRotation.x + windX * 0.05;
        leaf.rotation.z = leaf.userData.originalRotation.z + windZ * 0.05;
      }

      // Apply position offset for deciduous trees
      if (leaf.userData.originalPosition) {
        leaf.position.x = leaf.userData.originalPosition.x + windX * 0.2;
        leaf.position.z = leaf.userData.originalPosition.z + windZ * 0.2;
        leaf.position.y = leaf.userData.originalPosition.y + Math.sin(windTime * 0.5 + i) * 0.05 * windFactor;
      }
    }
  }

  // Animate undergrowth (just the grass)
  for (const item of undergrowth) {
    if (item.children && item.children.length > 0) { // It's grass
      for (let i = 0; i < item.children.length; i++) {
        const blade = item.children[i];
        const windEffect = Math.sin(windTime * 1.5 + i + item.position.x * 0.1) * 0.1;

        blade.rotation.x = (Math.random() - 0.5) * 0.05 + windEffect;
        blade.rotation.z = (Math.random() - 0.5) * 0.05 + windEffect;
      }
    }
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Animate wind effect on leaves
  animateWind(delta);

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
    velocity.y -= GRAVITY * moveDelta;

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
      velocity.z = direction.z * speed * moveDelta;
      velocity.x = direction.x * speed * moveDelta;
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
    camera.position.y += velocity.y * moveDelta;

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
