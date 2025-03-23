// Animation functions for the forest environment

let windTime = 0; // Time variable for wind animation
let windDirection = { x: Math.random() - 0.5, z: Math.random() - 0.5 }; // Random wind direction
let windGustTime = 0; // Time variable for wind gusts
let currentGustStrength = 0; // Current gust strength
let targetGustStrength = 0; // Target gust strength
let gustTransition = 0; // Transition between gust states
let gustDuration = 5; // Duration of current gust state

/**
 * Animate leaves with wind effect
 * @param {number} delta - Time delta for animation
 * @param {Array} leafGroups - Array of leaf groups to animate
 * @param {Array} undergrowth - Array of undergrowth elements
 * @param {number} WIND_STRENGTH - Base strength of wind effect
 * @param {number} WIND_SPEED - Base speed of wind animation
 */
export function animateWind(delta, leafGroups, undergrowth, WIND_STRENGTH, WIND_SPEED) {
  // Update wind time
  windTime += delta * WIND_SPEED;
  windGustTime += delta;

  // Handle wind gusts and direction changes
  updateWindParameters(delta);

  // Calculate effective wind strength with gusts
  const effectiveWindStrength = WIND_STRENGTH * (1 + currentGustStrength);

  // Animate tree trunks and branches
  animateTreeTrunks(leafGroups, effectiveWindStrength, windDirection);

  // Animate leaf groups with enhanced movement
  animateLeaves(leafGroups, effectiveWindStrength, windDirection);

  // Animate undergrowth with improved motion
  animateUndergrowth(undergrowth, effectiveWindStrength, windDirection);
}

/**
 * Update wind parameters like gusts and direction changes
 * @param {number} delta - Time delta for animation
 */
function updateWindParameters(delta) {
  // Handle wind gust cycle
  if (windGustTime > gustDuration) {
    // Reset gust timer
    windGustTime = 0;

    // Set new gust duration (3-8 seconds)
    gustDuration = 3 + Math.random() * 5;

    // Set new target gust strength (0-1.5x multiplier) with a reasonable upper limit
    targetGustStrength = Math.random() * 1.5;

    // Occasionally change wind direction (20% chance)
    if (Math.random() < 0.2) {
      // Gradually shift wind direction
      const targetDirection = {
        x: Math.random() - 0.5,
        z: Math.random() - 0.5
      };

      // Normalize direction vector
      const length = Math.sqrt(targetDirection.x * targetDirection.x + targetDirection.z * targetDirection.z);
      windDirection.x = targetDirection.x / length;
      windDirection.z = targetDirection.z / length;
    }
  }

  // Smoothly transition between gust states
  currentGustStrength += (targetGustStrength - currentGustStrength) * delta * 0.5;
}

/**
 * Animate tree trunks and branches with wind sway
 * @param {Array} leafGroups - Array of leaf groups to animate
 * @param {number} windStrength - Current wind strength
 * @param {Object} windDir - Wind direction vector
 */
function animateTreeTrunks(leafGroups, windStrength, windDir) {
  for (const leafGroup of leafGroups) {
    // Get the parent tree (trunk)
    const tree = leafGroup.parent;
    if (!tree) continue;

    // Find trunk (first child of tree group)
    const trunk = tree.children[0];
    if (!trunk) continue;

    // Store original rotation if not already stored
    if (!trunk.userData.originalRotation) {
      trunk.userData.originalRotation = {
        x: trunk.rotation.x,
        y: trunk.rotation.y,
        z: trunk.rotation.z
      };
    }

    // Calculate trunk sway based on wind and tree size
    const treeScale = tree.scale.y || 1;
    const trunkFactor = 0.02 / treeScale; // Larger trees sway less

    // Apply directional sway based on wind direction
    const swayX = Math.sin(windTime * 0.5) * windStrength * trunkFactor * windDir.z;
    const swayZ = Math.sin(windTime * 0.4) * windStrength * trunkFactor * windDir.x;

    // Apply rotation for trunk sway
    trunk.rotation.x = trunk.userData.originalRotation.x + swayX;
    trunk.rotation.z = trunk.userData.originalRotation.z + swayZ;

    // Animate branches if they exist (for deciduous trees)
    for (let i = 2; i < tree.children.length; i++) {
      const branch = tree.children[i];

      // Skip if not a branch
      if (!branch || !branch.isMesh) continue;

      // Store original rotation if not already stored
      if (!branch.userData.originalRotation) {
        branch.userData.originalRotation = {
          x: branch.rotation.x,
          y: branch.rotation.y,
          z: branch.rotation.z
        };
      }

      // Branches sway more than trunk
      const branchFactor = 0.08;
      const branchPhaseOffset = i * 0.5; // Different phase for each branch

      // Apply enhanced branch sway
      const branchSwayX = Math.sin(windTime * 0.7 + branchPhaseOffset) * windStrength * branchFactor * windDir.z;
      const branchSwayZ = Math.sin(windTime * 0.6 + branchPhaseOffset) * windStrength * branchFactor * windDir.x;

      // Apply rotation for branch sway
      branch.rotation.x = branch.userData.originalRotation.x + branchSwayX;
      branch.rotation.z = branch.userData.originalRotation.z + branchSwayZ;
    }
  }
}

/**
 * Animate leaves with enhanced natural movement
 * @param {Array} leafGroups - Array of leaf groups to animate
 * @param {number} windStrength - Current wind strength
 * @param {Object} windDir - Wind direction vector
 */
function animateLeaves(leafGroups, windStrength, windDir) {
  for (const leafGroup of leafGroups) {
    // Apply different wind effect based on tree type
    for (let i = 0; i < leafGroup.children.length; i++) {
      const leaf = leafGroup.children[i];
      const windFactor = leaf.userData.windFactor || 1.0;

      // Add unique flutter pattern for each leaf
      const flutterSpeed = 1.5 + windFactor * 0.5;
      const flutterStrength = 0.1 * windStrength;
      const flutter = Math.sin(windTime * flutterSpeed + i * 2.5) * flutterStrength;

      // Calculate directional wind effect
      const windX = Math.sin(windTime + i) * windStrength * windFactor * windDir.x;
      const windZ = Math.cos(windTime * 0.7 + i * 0.2) * windStrength * windFactor * windDir.z;

      // Add turbulence for more natural movement
      const turbulence = {
        x: Math.sin(windTime * 2.3 + i * 0.7) * windStrength * 0.2,
        y: Math.sin(windTime * 1.8 + i * 0.5) * windStrength * 0.15,
        z: Math.sin(windTime * 2.1 + i * 0.3) * windStrength * 0.2
      };

      // Apply enhanced rotation for wind effect
      if (leaf.userData.originalRotation) {
        leaf.rotation.x = leaf.userData.originalRotation.x + windX * 0.08 + turbulence.x + flutter;
        leaf.rotation.y = leaf.userData.originalRotation.y + flutter * 0.5;
        leaf.rotation.z = leaf.userData.originalRotation.z + windZ * 0.08 + turbulence.z + flutter;
      }

      // Apply enhanced position offset for deciduous trees
      if (leaf.userData.originalPosition) {
        // More pronounced movement for leaf clusters
        leaf.position.x = leaf.userData.originalPosition.x + windX * 0.3 + turbulence.x * 0.5;
        leaf.position.z = leaf.userData.originalPosition.z + windZ * 0.3 + turbulence.z * 0.5;
        leaf.position.y = leaf.userData.originalPosition.y +
          Math.sin(windTime * 0.5 + i) * 0.08 * windFactor +
          turbulence.y * 0.5;
      }
    }
  }
}

/**
 * Animate undergrowth with improved motion
 * @param {Array} undergrowth - Array of undergrowth elements
 * @param {number} windStrength - Current wind strength
 * @param {Object} windDir - Wind direction vector
 */
function animateUndergrowth(undergrowth, windStrength, windDir) {
  for (const item of undergrowth) {
    if (item.children && item.children.length > 0) { // It's grass
      for (let i = 0; i < item.children.length; i++) {
        const blade = item.children[i];

        // Calculate directional wind effect
        const baseWindEffect = Math.sin(windTime * 1.5 + i + item.position.x * 0.1) * windStrength * 0.15;
        const dirWindEffect = {
          x: baseWindEffect * windDir.x,
          z: baseWindEffect * windDir.z
        };

        // Add random flutter for more natural movement
        const flutter = (Math.random() - 0.5) * 0.03 * windStrength;

        // Apply enhanced grass blade movement
        blade.rotation.x = (Math.random() - 0.5) * 0.02 + dirWindEffect.z + flutter;
        blade.rotation.z = (Math.random() - 0.5) * 0.02 + dirWindEffect.x + flutter;
      }
    } else if (item.isMesh) { // It's a bush
      // Store original rotation if not already stored
      if (!item.userData.originalRotation) {
        item.userData.originalRotation = {
          x: item.rotation.x,
          y: item.rotation.y,
          z: item.rotation.z
        };
      }

      // Calculate bush sway (less than trees)
      const bushFactor = 0.03;
      const swayX = Math.sin(windTime * 0.6 + item.position.x * 0.05) * windStrength * bushFactor * windDir.z;
      const swayZ = Math.sin(windTime * 0.5 + item.position.z * 0.05) * windStrength * bushFactor * windDir.x;

      // Apply rotation for bush sway
      item.rotation.x = item.userData.originalRotation.x + swayX;
      item.rotation.z = item.userData.originalRotation.z + swayZ;
    }
  }
}
