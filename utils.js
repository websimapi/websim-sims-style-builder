import * as THREE from 'three';

// Cache for loaded textures
const textureCache = {};

export async function loadTexture(url) {
  if (textureCache[url]) return textureCache[url];

  return new Promise((resolve) => {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      textureCache[url] = tex;
      resolve(tex);
    }, undefined, () => {
      // Fallback
      resolve(null);
    });
  });
}

export function createWallGeometry(length, height, thickness) {
  // Main wall
  const wallGeo = new THREE.BoxGeometry(length, height, thickness);
  wallGeo.translate(length / 2, height / 2, 0); // Pivot at start bottom center

  // Baseboard
  const baseGeo = new THREE.BoxGeometry(length, 0.15, thickness + 0.04);
  baseGeo.translate(length / 2, 0.075, 0);

  // Molding
  const moldGeo = new THREE.BoxGeometry(length, 0.1, thickness + 0.04);
  moldGeo.translate(length / 2, height - 0.05, 0);

  // Merge (simulate via group in engine, or geometry merge here if complex)
  // For simplicity in update loop, we return a Group or just the main geometry data
  // We will handle composition in the Engine to allow material swapping on parts easily
  return { wallGeo, baseGeo, moldGeo };
}

export function createFurnitureMesh(type, dims, color) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
  const [w, h, d] = dims;

  if (type === 'chair') {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), material);
    seat.position.y = h * 0.45;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.55, 0.1), material);
    back.position.set(0, h * 0.725, -d/2 + 0.05);
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, h * 0.45, 0.05), material);
    leg1.position.set(w/2 - 0.05, h * 0.225, d/2 - 0.05);
    const leg2 = leg1.clone(); leg2.position.set(-w/2 + 0.05, h * 0.225, d/2 - 0.05);
    const leg3 = leg1.clone(); leg3.position.set(w/2 - 0.05, h * 0.225, -d/2 + 0.05);
    const leg4 = leg1.clone(); leg4.position.set(-w/2 + 0.05, h * 0.225, -d/2 + 0.05);
    group.add(seat, back, leg1, leg2, leg3, leg4);
  } else if (type === 'table') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), material);
    top.position.y = h;
    const legGeo = new THREE.CylinderGeometry(0.05, 0.03, h, 8);
    const leg1 = new THREE.Mesh(legGeo, material); leg1.position.set(w/2 - 0.2, h/2, d/2 - 0.2);
    const leg2 = new THREE.Mesh(legGeo, material); leg2.position.set(-w/2 + 0.2, h/2, d/2 - 0.2);
    const leg3 = new THREE.Mesh(legGeo, material); leg3.position.set(w/2 - 0.2, h/2, -d/2 + 0.2);
    const leg4 = new THREE.Mesh(legGeo, material); leg4.position.set(-w/2 + 0.2, h/2, -d/2 + 0.2);
    group.add(top, leg1, leg2, leg3, leg4);
  } else if (type === 'sofa') {
     const base = new THREE.Mesh(new THREE.BoxGeometry(w, h*0.4, d), material);
     base.position.y = h*0.2;
     const back = new THREE.Mesh(new THREE.BoxGeometry(w, h*0.6, 0.2), material);
     back.position.set(0, h*0.7, -d/2 + 0.1);
     const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, h*0.6, d), material);
     leftArm.position.set(-w/2 + 0.1, h*0.3, 0);
     const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, h*0.6, d), material);
     rightArm.position.set(w/2 - 0.1, h*0.3, 0);
     group.add(base, back, leftArm, rightArm);
  } else {
    // Default Box
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    box.position.y = h/2;
    group.add(box);
  }

  // Shadow setup
  group.traverse(child => {
    if(child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}