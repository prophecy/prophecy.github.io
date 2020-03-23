import * as THREE from './js/three.module.js';

function main() {

  const canvas = document.querySelector('#c');

  const renderer = new THREE.WebGLRenderer({canvas});

  const fov = 75;
  const aspect = 2;  // the canvas default
  const near = 0.1;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 5;

  const scene = new THREE.Scene();

  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
  }

  const geometry = new THREE.Geometry();
  geometry.vertices.push(
    new THREE.Vector3(-1, -1,  1),  // 0
    new THREE.Vector3( 1, -1,  1),  // 1
    new THREE.Vector3(-1,  1,  1),  // 2
    new THREE.Vector3( 1,  1,  1),  // 3
    new THREE.Vector3(-1, -1, -1),  // 4
    new THREE.Vector3( 1, -1, -1),  // 5
    new THREE.Vector3(-1,  1, -1),  // 6
    new THREE.Vector3( 1,  1, -1),  // 7
  );

  /*
       6----7
      /|   /|
     2----3 |
     | |  | |
     | 4--|-5
     |/   |/
     0----1
  */

  geometry.faces.push(
     // front
     new THREE.Face3(0, 3, 2),
     new THREE.Face3(0, 1, 3),
     // right
     new THREE.Face3(1, 7, 3),
     new THREE.Face3(1, 5, 7),
     // back
     new THREE.Face3(5, 6, 7),
     new THREE.Face3(5, 4, 6),
     // left
     new THREE.Face3(4, 2, 6),
     new THREE.Face3(4, 0, 2),
     // top
     new THREE.Face3(2, 7, 6),
     new THREE.Face3(2, 3, 7),
     // bottom
     new THREE.Face3(4, 1, 0),
     new THREE.Face3(4, 5, 1),
  );

  geometry.computeFaceNormals();

  function makeInstance(geometry, color, x) {

    const material = new THREE.MeshBasicMaterial({
      color: color,
      wireframe: true
    });

    var geo = new THREE.EdgesGeometry( geometry );
    var line = new THREE.LineSegments(geo, material);
    scene.add(line);
    line.position.x = x;
    return line;
  }

  const cubes = [
    makeInstance(geometry, 0x44FF44,  0),
    makeInstance(geometry, 0x4444FF, -4),
    makeInstance(geometry, 0xFF4444,  4),
  ];

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

  // ---------------------------------------------------------------------
//  var wireGeometry = new THREE.SphereBufferGeometry( 100, 100, 100 );

//  var wireframe = new THREE.WireframeGeometry( wireGeometry );

//  var line = new THREE.LineSegments( wireframe );
//  line.material.depthTest = false;
//  line.material.opacity = 0.25;
//  line.material.transparent = true;

//  scene.add( line );
  // ---------------------------------------------------------------------
  function render(time) {
    time *= 0.001;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    cubes.forEach((cube, ndx) => {
      const speed = 1 + ndx * .1;
      const rot = time * speed;
      cube.rotation.x = rot;
      cube.rotation.y = rot;
    });

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
