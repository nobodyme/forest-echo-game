// Animation functions for the forest environment

let windTime = 0; // Time variable for wind animation

/**
 * Animate leaves with wind effect
 * @param {number} delta - Time delta for animation
 * @param {Array} leafGroups - Array of leaf groups to animate
 * @param {Array} undergrowth - Array of undergrowth elements
 * @param {number} WIND_STRENGTH - Strength of wind effect
 * @param {number} WIND_SPEED - Speed of wind animation
 */
export function animateWind(delta, leafGroups, undergrowth, WIND_STRENGTH, WIND_SPEED) {
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
