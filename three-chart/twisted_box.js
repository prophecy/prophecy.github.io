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
camera.position.z = 30;

// Create mesh
const geometry = new THREE.BoxGeometry(20, 20, 20, 20, 20, 20); 
const material = new THREE.MeshNormalMaterial({ wireframe: true }); 
const cube = new THREE.Mesh(geometry, material); 
scene.add(cube);

function twist(geometry, direction) {
  const quaternion = new THREE.Quaternion();

  for (let i = 0; i < geometry.vertices.length; i++) {
    // a single vertex Y position
    const yPos = geometry.vertices[i].y;
    const twistAmount = 10;
    //const upVec = new THREE.Vector3(0, 1, 0);
    const upVec = new THREE.Vector3(0, direction, 0);

    quaternion.setFromAxisAngle(
      upVec, 
      (Math.PI / 180) * (yPos / twistAmount)
    );

    geometry.vertices[i].applyQuaternion(quaternion);
  }
  
  // tells Three.js to re-render this mesh
  geometry.verticesNeedUpdate = true;
}

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

var direction = 1.0;
var deltaTime = 0;
var prevSec = 0;

var twistedTime = 0.0;

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

  twistedTime += deltaTime;

  if (twistedTime >= 3.0) {

    direction = -1.0 * direction
    twistedTime = 0.0;
  }

  twist(geometry, direction);

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);