// Physics and collision detection functions

/**
 * Check for collisions with trees
 * @param {THREE.Vector3} position - Character position
 * @param {number} radius - Character collision radius
 * @param {Array} trees - Array of tree objects with mesh and radius properties
 * @returns {boolean} - Whether a collision occurred
 */
export function checkTreeCollisions(position, radius, trees) {
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

/**
 * Check if position is in water
 * @param {THREE.Vector3} position - Position to check
 * @param {THREE.Mesh} waterSurface - Water surface mesh
 * @param {number} WORLD_SIZE - Size of the world
 * @returns {boolean} - Whether the position is in water
 */
export function isInWater(position, waterSurface, WORLD_SIZE) {
  if (!waterSurface) return false;

  const waterPos = waterSurface.position;
  const waterSize = WORLD_SIZE / 6;

  return (
    Math.abs(position.x - waterPos.x) < waterSize &&
    Math.abs(position.z - waterPos.z) < waterSize
  );
}
