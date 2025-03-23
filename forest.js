// Forest creation functions
import * as THREE from 'three';
import { WORLD_SIZE, TREE_COUNT, UNDERGROWTH_COUNT } from './constants.js';

// Store leaf groups for wind animation
let leafGroups = [];
// Store undergrowth elements
let undergrowth = [];
// Store trees
let trees = [];

/**
 * Create a more natural tree with animated leaves
 * @param {number} treeType - Type of tree (0 for pine, 1 for deciduous)
 * @param {THREE.Vector3} position - Position of the tree
 * @param {number} scale - Scale of the tree
 * @returns {THREE.Group} - The tree mesh
 */
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
      leafLayer.userData.windFactor = Math.random() * 0.7 + 0.6; // Increased random wind factor for more movement

      // Add slight initial rotation for more natural look
      leafLayer.rotation.x = (Math.random() - 0.5) * 0.1;
      leafLayer.rotation.z = (Math.random() - 0.5) * 0.1;

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
      cluster.userData.windFactor = Math.random() * 0.8 + 0.7; // Increased wind factor for more movement

      // Add slight initial rotation for more natural look
      cluster.rotation.x = (Math.random() - 0.5) * 0.2;
      cluster.rotation.y = (Math.random() - 0.5) * 0.2;
      cluster.rotation.z = (Math.random() - 0.5) * 0.2;

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

/**
 * Create forest with trees
 * @param {THREE.Scene} scene - The scene to add the forest to
 */
export function createForest(scene) {
  // Clear existing arrays
  trees = [];
  leafGroups = [];

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

/**
 * Create undergrowth (bushes, grass, etc.)
 * @param {THREE.Scene} scene - The scene to add the undergrowth to
 */
export function createUndergrowth(scene) {
  // Clear existing array
  undergrowth = [];

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

// Export arrays for use in other modules
export { trees, leafGroups, undergrowth };
