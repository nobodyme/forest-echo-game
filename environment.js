// Environment creation functions
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import { WORLD_SIZE } from './constants.js';

/**
 * Create lighting for the scene
 * @param {THREE.Scene} scene - The scene to add lighting to
 */
export function createLighting(scene) {
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

/**
 * Create sky with atmosphere
 * @param {THREE.Scene} scene - The scene to add the sky to
 */
export function createSky(scene) {
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

/**
 * Create ground plane
 * @param {THREE.Scene} scene - The scene to add the ground to
 * @param {THREE.LoadingManager} loadingManager - Loading manager for textures
 */
export function createGround(scene, loadingManager) {
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

/**
 * Create water surface
 * @param {THREE.Scene} scene - The scene to add the water to
 * @returns {THREE.Mesh} - The water surface mesh
 */
export function createWater(scene) {
  const waterGeometry = new THREE.PlaneGeometry(WORLD_SIZE / 3, WORLD_SIZE / 3);

  const waterSurface = new Water(
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

  return waterSurface;
}
