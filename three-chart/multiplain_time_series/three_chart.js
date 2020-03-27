// https://medium.com/@crazypixel/geometry-manipulation-in-three-js-twisting-c53782c38bb

import * as THREE from '../js/three.module.js';

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

const geometryWidth = 0.001
const geometryHeight = 40
const vertWidth = 1
const vertHeight = 66

// Create light
//var ambientLight = new THREE.AmbientLight( 0xaaaaaa );
//scene.add(ambientLight);

var pointLight = new THREE.PointLight( 0xaaaaaa, 2);
pointLight.position.set( 0, 0, 0 );
pointLight.castShadow = true;
scene.add( pointLight ); 

// Create mesh array
const geometryList = [
  new THREE.PlaneGeometry(geometryWidth, geometryHeight, vertWidth, vertHeight),
  new THREE.PlaneGeometry(geometryWidth, geometryHeight, vertWidth, vertHeight),
  new THREE.PlaneGeometry(geometryWidth, geometryHeight, vertWidth, vertHeight),
  new THREE.PlaneGeometry(geometryWidth, geometryHeight, vertWidth, vertHeight),
  new THREE.PlaneGeometry(geometryWidth, geometryHeight, vertWidth, vertHeight),
  new THREE.PlaneGeometry(geometryWidth, geometryHeight, vertWidth, vertHeight),
  new THREE.PlaneGeometry(geometryWidth, geometryHeight, vertWidth, vertHeight),
  new THREE.PlaneGeometry(geometryWidth, geometryHeight, vertWidth, vertHeight),
]

const materialList = [
  new THREE.MeshLambertMaterial( { color: 0xbb38E9 } ),
  new THREE.MeshLambertMaterial( { color: 0x8700E6 } ),
  new THREE.MeshLambertMaterial( { color: 0xE60087 } ),
  new THREE.MeshLambertMaterial( { color: 0x4705b6 } ),
  new THREE.MeshLambertMaterial( { color: 0x36b0e7 } ),
  new THREE.MeshLambertMaterial( { color: 0xa60087 } ),
  new THREE.MeshLambertMaterial( { color: 0x079026 } ),
  new THREE.MeshLambertMaterial( { color: 0xE28057 } ),
]

const plainList = []

// Create object for the plain
var root = new THREE.Group();
for (var i=0; i<geometryList.length; ++i) {
  
  const plain = new THREE.Mesh(geometryList[i], materialList[i]);
  plainList.push(plain)

  const offset = -10
  const space = 1
  const spaceDist = i*i*space*0.3 // Distance grows in power 2 

  plain.position.x = offset + spaceDist
  plain.rotation.y = -90 / 180 * Math.PI

  root.add(plain)
}

root.position.y = 0;
root.position.z = -25;

root.rotation.x = -50 / 180 * Math.PI;
root.rotation.z = 90 / 180 * Math.PI;

scene.add(root)

var targetVert = []
var translationVec = []
var originVec = []

var progress = 1

// Init target vert
for (var j=0; j<geometryList.length; ++j) {

  var ov = []
  var tarV = []
  var trV = []

  for (var i=0; i<geometryList[j].vertices.length; ++i) {

    var oVert = {}
    oVert.x = geometryList[j].vertices[i].x
    oVert.y = geometryList[j].vertices[i].y
    oVert.z = geometryList[j].vertices[i].z
    ov.push(oVert)
  
    var tVert = { x:0, y:0, z:0 }
    tVert.x = geometryList[j].vertices[i].x
    tVert.y = geometryList[j].vertices[i].y
    tVert.z = geometryList[j].vertices[i].z
    tarV.push(tVert)
  
    trV.push({ x:0, y:0, z:0 })
  }

  originVec.push(ov)
  targetVert.push(tarV)
  translationVec.push(trV)
}

export function updateChart(data) {

  var expressionList = transformData(data)

  for (var i=0; i<8; ++i)
    transitionDataAtRow(i, expressionList[i])
}

var expressionIndex = {
  "default": 0,
  "disgusted": 1,
  "sad": 2,
  "fearful": 3,
  "angry": 4, 
  "surprised": 5,
  "happy": 6,
  "neutral": 7
}

function transformData(data) {

  // Transform data by expression
  var expressionList = [
    [],[],[],[],
    [],[],[],[]
  ]

  for (var i=0; i<data.length; ++i) {

    var expSecData = [
      0, 0, 0, 0, 
      0, 0, 0, 0
    ]
  
    var curDat = data[i]

    for (var j=0; j<curDat.length; ++j) {

      var curDatExp = curDat[j]
      var curExpIndex = expressionIndex[curDatExp.expression]
      var curExpProb = curDatExp.probability

      expSecData[curExpIndex] = curExpProb
    }

    for (var j=0; j<expressionList.length; ++j)
      expressionList[j].push(expSecData[j])
  }

  return expressionList
}

function transitionDataAtRow(index, data) {

  const plain = plainList[index]
  const geometry = geometryList[index]

  const magnitudeRatio = 0.1

  for (var j=0; j<data.length; ++j) {

    var v = data[j] * magnitudeRatio

    //const i = rows[index][j]
    const i = j * 2 + 1

    originVec[index][i].x = geometry.vertices[i].x
    originVec[index][i].y = geometry.vertices[i].y
    originVec[index][i].z = geometry.vertices[i].z
  
    targetVert[index][i].x = v
    targetVert[index][i].y = geometry.vertices[i].y
    targetVert[index][i].z = geometry.vertices[i].z
  
    translationVec[index][i].x = targetVert[index][i].x - originVec[index][i].x
    translationVec[index][i].y = targetVert[index][i].y - originVec[index][i].y
    translationVec[index][i].z = targetVert[index][i].z - originVec[index][i].z
  }
  
  progress = 0
}

const ROTATION_STATE_NONE = 0
const ROTATION_STATE_LEFT = 1
const ROTATION_STATE_RIGHT = 2

var rotationState = ROTATION_STATE_NONE

const initRotZ = root.rotation.z

function panningRotation(deltaTime) {

  const rotRad = 20 / 180 * Math.PI
  const rotSpeed = 0.3
  const deltaRot = rotSpeed * deltaTime

  if (rotationState == ROTATION_STATE_NONE)
    rotationState = ROTATION_STATE_LEFT
  else if (rotationState == ROTATION_STATE_LEFT) {
    
    root.rotation.z -= deltaRot

    if (root.rotation.z < initRotZ + (rotRad * -1))
      rotationState = ROTATION_STATE_RIGHT
  }
  else if (rotationState == ROTATION_STATE_RIGHT) {

    root.rotation.z += deltaRot

    if (root.rotation.z > initRotZ + rotRad)
      rotationState = ROTATION_STATE_LEFT
  }
}

// Logic function 
function update(deltaTime) {

  // Rotation
  panningRotation(deltaTime)

  // Transition animation
  if (progress < 1) {

    const speed = 0.4
    progress += speed * deltaTime

    if (progress > 1)
      progress = 1

    for (var j=0; j<geometryList.length; ++j) {

      const geometry = geometryList[j]

      for (var i=0; i<geometry.vertices.length; ++i) {

        geometry.vertices[i].x = originVec[j][i].x + (translationVec[j][i].x * progress)
        geometry.vertices[i].y = originVec[j][i].y + (translationVec[j][i].y * progress)
        geometry.vertices[i].z = originVec[j][i].z + (translationVec[j][i].z * progress)
      }

      geometry.verticesNeedUpdate = true;
    }
  }
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

  // Clamp delta time
  if (deltaTime > 1/30)
    deltaTime = 1/30

  // Update
  update(deltaTime);

  // Render
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
