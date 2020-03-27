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

const geometryWidth = 20
const geometryHeight = 40
const vertWidth = 40
const vertHeight = 66

// Create light
//var ambientLight = new THREE.AmbientLight( 0xaaaaaa );
//scene.add(ambientLight);

var pointLight = new THREE.PointLight( 0xaaaaaa, 2);
pointLight.position.set( 1000, 250, 600 );
pointLight.castShadow = true;
scene.add( pointLight ); 

// Create mesh
const geometry = new THREE.PlaneGeometry(geometryWidth, geometryHeight, vertWidth, vertHeight);
const material = new THREE.MeshNormalMaterial({ wireframe: true });
//const material = new THREE.MeshLambertMaterial( { color: 0x0087E6 } );
//const material = new THREE.MeshPhongMaterial( { color: 0x0087E6, shininess: 100 } );
//const material = new THREE.MeshStandardMaterial( { color: 0x0087E6} );

const cube = new THREE.Mesh(geometry, material);

cube.position.y = 0;
cube.position.z = -25;

cube.rotation.x = -50 / 180 * Math.PI;
cube.rotation.z = 90 / 180 * Math.PI;

scene.add(cube);

var targetVert = []
var translationVec = []
var originVec = []

var progress = 1

// Create vertex indices
var cols = [] // y
var rows = [] // x
var similarDist = 0.0001

for (var i=0; i<geometry.vertices.length; ++i) {

  const v = geometry.vertices[i]

  // Col indexing
  var isColFound = false
  for (var j=0; j<cols.length; ++j) {
    var c = cols[j]

    if (c.length == 0)
      continue
    if (Math.abs(v.y - geometry.vertices[c[0]].y) < similarDist) {
      isColFound = true;
      cols[j].push(i)
    }
  }
  if (!isColFound)
    cols.push([i])

  // Row indexing
  var isRowFound = false
  for (var j=0; j<rows.length; ++j) {
    var r = rows[j]

    if (r.length == 0)
      continue
    if (Math.abs(v.x - geometry.vertices[r[0]].x) < similarDist) {
      isRowFound = true;
      rows[j].push(i)
    }
  }
  if (!isRowFound)
    rows.push([i])
}

// Init target vert
for (var i=0; i<geometry.vertices.length; ++i) {

  var oVert = {}
  oVert.x = geometry.vertices[i].x
  oVert.y = geometry.vertices[i].y
  oVert.z = geometry.vertices[i].z
  originVec.push(oVert)

  var tVert = { x:0, y:0, z:0 }
  tVert.x = geometry.vertices[i].x
  tVert.y = geometry.vertices[i].y
  tVert.z = geometry.vertices[i].z
  targetVert.push(tVert)

  translationVec.push({ x:0, y:0, z:0 })
}

export function updateChart(data) {

  var expressionList = transformData(data)

  const rowSpace = 5

  for (var i=0; i<8; ++i)
    transitionDataAtRow((i+1) * rowSpace, expressionList[i])
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

  const magnitudeRatio = 0.1

  for (var j=0; j<data.length; ++j) {

    var v = data[j] * magnitudeRatio

    const i = rows[index][j]

    originVec[i].x = geometry.vertices[i].x
    originVec[i].y = geometry.vertices[i].y
    originVec[i].z = geometry.vertices[i].z
  
    targetVert[i].x = geometry.vertices[i].x
    targetVert[i].y = geometry.vertices[i].y
    targetVert[i].z = v
  
    translationVec[i].x = targetVert[i].x - originVec[i].x
    translationVec[i].y = targetVert[i].y - originVec[i].y
    translationVec[i].z = targetVert[i].z - originVec[i].z
  }
  
  progress = 0
}

const ROTATION_STATE_NONE = 0
const ROTATION_STATE_LEFT = 1
const ROTATION_STATE_RIGHT = 2

var rotationState = ROTATION_STATE_NONE

const initRotZ = cube.rotation.z

function panningRotation(deltaTime) {

  const rotRad = 20 / 180 * Math.PI
  const rotSpeed = 0.3
  const deltaRot = rotSpeed * deltaTime

  if (rotationState == ROTATION_STATE_NONE)
    rotationState = ROTATION_STATE_LEFT
  else if (rotationState == ROTATION_STATE_LEFT) {
    
    cube.rotation.z -= deltaRot

    if (cube.rotation.z < initRotZ + (rotRad * -1))
      rotationState = ROTATION_STATE_RIGHT
  }
  else if (rotationState == ROTATION_STATE_RIGHT) {

    cube.rotation.z += deltaRot

    if (cube.rotation.z > initRotZ + rotRad)
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

    for (var i=0; i<geometry.vertices.length; ++i) {

      geometry.vertices[i].x = originVec[i].x + (translationVec[i].x * progress)
      geometry.vertices[i].y = originVec[i].y + (translationVec[i].y * progress)
      geometry.vertices[i].z = originVec[i].z + (translationVec[i].z * progress)
    }

    geometry.verticesNeedUpdate = true;
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
