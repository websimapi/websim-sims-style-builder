import * as THREE from 'three';
import { createWallGeometry, createFurnitureMesh, loadTexture } from './utils.js';

export class BuildingSystem {
  constructor(sceneSetup) {
    this.scene = sceneSetup.scene;
    this.wallsGroup = sceneSetup.wallsGroup;
    this.floorsGroup = sceneSetup.floorsGroup;
    this.objectsGroup = sceneSetup.objectsGroup;
    this.previewGroup = sceneSetup.previewGroup;
    this.terrain = sceneSetup.terrain;
  }

  updateWallPreview(start, end, isValid) {
    this.previewGroup.clear();
    const len = new THREE.Vector3(end.x - start.x, 0, end.z - start.z).length();
    if (len < 0.1) return;

    const angle = Math.atan2(end.z - start.z, end.x - start.x);
    const geo = new THREE.BoxGeometry(len, 2.7, 0.15);
    const mat = new THREE.MeshBasicMaterial({ 
        color: isValid ? 0x00ff00 : 0xff0000, 
        transparent: true, 
        opacity: 0.5 
    });
    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.set((start.x + end.x)/2, 1.35, (start.z + end.z)/2);
    mesh.rotation.y = -angle;
    this.previewGroup.add(mesh);
  }

  addWall(wallData) {
    const { id, start, end, height, texture } = wallData;
    const len = Math.hypot(end.x - start.x, end.z - start.z);
    const angle = Math.atan2(end.z - start.z, end.x - start.x);

    const { wallGeo, baseGeo, moldGeo } = createWallGeometry(len, height || 2.7, 0.15);
    const mat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });

    const group = new THREE.Group();
    const wallMesh = new THREE.Mesh(wallGeo, mat);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const baseMesh = new THREE.Mesh(baseGeo, trimMat);
    const moldMesh = new THREE.Mesh(moldGeo, trimMat);

    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    group.add(wallMesh, baseMesh, moldMesh);

    group.position.set(start.x, 0, start.z);
    group.rotation.y = -angle;

    group.userData = { id, type: 'wall', ...wallData };
    this.wallsGroup.add(group);

    if (texture) this.updateMaterialTexture(group, texture);
  }

  addFloor(floorData) {
    const { id, x, z, texture } = floorData;
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI/2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, 0.02, z + 0.5); 
    mesh.receiveShadow = true;
    mesh.userData = { id, type: 'floor', ...floorData };
    this.floorsGroup.add(mesh);

    if (texture) this.updateMaterialTexture(mesh, texture);
  }

  addObject(objData) {
     const { id, type, x, z, rotation, scale, catalogData } = objData;
     const dims = catalogData.dims;
     const mesh = createFurnitureMesh(catalogData.type, dims, objData.color || 0x8B4513);

     mesh.position.set(x, 0, z);
     mesh.rotation.y = rotation || 0;
     mesh.scale.setScalar(scale || 1);

     mesh.userData = { id, type: 'object', ...objData };
     this.objectsGroup.add(mesh);
  }

  modifyTerrain(x, z, radius, strength, mode = 'raise') {
      const posAttr = this.terrain.geometry.attributes.position;
      const count = posAttr.count;
      const brushRadSq = radius * radius;
      let modified = false;

      for(let i=0; i < count; i++) {
          const px = posAttr.getX(i);
          const pz = posAttr.getY(i); 

          const dx = px - x;
          const dy = pz - (-z); 
          const distSq = dx*dx + dy*dy;

          if(distSq < brushRadSq) {
              const falloff = 0.5 * (1 + Math.cos(Math.PI * Math.sqrt(distSq) / radius));
              const currentH = posAttr.getZ(i);
              let newH = currentH;

              if (mode === 'raise') newH += strength * falloff;
              else if (mode === 'lower') newH -= strength * falloff;
              else if (mode === 'flatten') newH = newH + (strength - newH) * falloff * 0.5;

              newH = Math.max(-2, Math.min(5, newH));

              posAttr.setZ(i, newH);
              modified = true;
          }
      }

      if(modified) {
          posAttr.needsUpdate = true;
          this.terrain.geometry.computeVertexNormals();
      }
  }

  async updateMaterialTexture(object, textureUrl) {
    const tex = await loadTexture(textureUrl);
    if (!tex) return;

    object.traverse(child => {
        if (child.isMesh) {
            child.material.map = tex;
            child.material.needsUpdate = true;
        }
    });
  }

  removeObject(id, selectedObject) {
    const findAndRemove = (group) => {
        const child = group.children.find(c => c.userData.id === id);
        if (child) {
            group.remove(child);
            return true;
        }
        return false;
    };

    findAndRemove(this.wallsGroup) || findAndRemove(this.floorsGroup) || findAndRemove(this.objectsGroup);
    return (selectedObject && selectedObject.userData.id === id);
  }
}

