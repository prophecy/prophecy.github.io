// https://medium.com/@crazypixel/geometry-manipulation-in-three-js-twisting-c53782c38bb

import * as THREE from './js/three.module.js';

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({canvas});
const scene = new THREE.Scene();

// Set up camera
const fov = 75;
const aspect = 2;  // the canvas default
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
//camera.position.z = 5;

// Create mesh
const geometry = new THREE.PlaneGeometry(80, 40, 32, 32);
const material = new THREE.MeshNormalMaterial({ wireframe: true }); 
const cube = new THREE.Mesh(geometry, material);

cube.position.y = 20;
cube.position.z = -40;

cube.rotation.x = -50 / 180 * Math.PI;
cube.rotation.z = 90 / 180 * Math.PI;

scene.add(cube);

// Test to update vert
const magnitude = 5
for (var i=0; i<geometry.vertices.length; ++i) {

  var sVal = Math.cos(i / 100.0)

  geometry.vertices[i].z += (sVal * magnitude);
}

geometry.verticesNeedUpdate = true;

// Logic function 
function update(deltaTime) {

}

// ----------------------------------------------------------------
// Core

var direction = 1.0;
var deltaTime = 0;
var prevSec = 0;

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

// Render the frames
function render(time) {

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  // Get delta time 
  const curSec = time * 0.001;
  deltaTime = curSec - prevSec;
  prevSec = curSec;

  // Update
  update(deltaTime);

  // Render
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
