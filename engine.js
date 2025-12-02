import * as THREE from 'three';
import { createWallGeometry, createFurnitureMesh, loadTexture } from './utils.js';

export class Engine {
  constructor(container, onSelect) {
    this.container = container;
    this.onSelect = onSelect;

    // Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(15, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    // Grid System
    this.gridSize = 20;
    this.gridDivisions = 40; // 0.5 unit cells
    const gridHelper = new THREE.GridHelper(this.gridSize, this.gridDivisions, 0x888888, 0xcccccc);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
    this.gridHelper = gridHelper;

    // Terrain
    const geometry = new THREE.PlaneGeometry(20, 20, 39, 39);
    geometry.rotateX(-Math.PI / 2);
    this.terrainMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x55aa55, 
      roughness: 0.8,
      side: THREE.DoubleSide
    });
    this.terrain = new THREE.Mesh(geometry, this.terrainMaterial);
    this.terrain.receiveShadow = true;
    this.terrain.name = 'terrain';
    this.scene.add(this.terrain);

    // Interaction Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Object Containers
    this.wallsGroup = new THREE.Group();
    this.floorsGroup = new THREE.Group();
    this.objectsGroup = new THREE.Group();
    this.previewGroup = new THREE.Group();
    this.scene.add(this.wallsGroup);
    this.scene.add(this.floorsGroup);
    this.scene.add(this.objectsGroup);
    this.scene.add(this.previewGroup);

    // Selection Highlight
    this.highlightMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true, transparent: true, opacity: 0.5 })
    );
    this.scene.add(this.highlightMesh);
    this.highlightMesh.visible = false;

    // Controls State
    this.isDragging = false;
    this.lastMouse = new THREE.Vector2();
    this.cameraMode = 'free';
    this.orbitRadius = 20;
    this.orbitTheta = Math.PI / 4;
    this.orbitPhi = Math.PI / 4;
    this.panOffset = new THREE.Vector3(0, 0, 0);

    // Bindings
    this.onResize = this.onResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);

    window.addEventListener('resize', this.onResize);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });

    this.animate();
  }

  // --- Interaction Logic ---

  getIntersection(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Prioritize objects, then walls, then terrain
    const objects = this.raycaster.intersectObjects([...this.objectsGroup.children, ...this.wallsGroup.children, ...this.floorsGroup.children, this.terrain], true);

    if (objects.length > 0) {
      // Find first valid object (traverse up to find root group of an object)
      let hit = objects[0];
      let obj = hit.object;
      while (obj.parent && obj.parent !== this.objectsGroup && obj.parent !== this.wallsGroup && obj.parent !== this.floorsGroup && obj !== this.scene) {
        obj = obj.parent;
      }
      return { point: hit.point, object: obj, face: hit.face };
    }

    // Fallback to infinite plane for building outside terrain bounds
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, target);
    if (target) return { point: target, object: null };

    return null;
  }

  snapToGrid(val) {
    return Math.round(val * 2) / 2;
  }

  // --- Camera Controls ---

  updateCamera() {
    // Spherical to Cartesian
    const x = this.orbitRadius * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);
    const y = this.orbitRadius * Math.cos(this.orbitPhi);
    const z = this.orbitRadius * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);

    this.camera.position.set(x + this.panOffset.x, y + this.panOffset.y, z + this.panOffset.z);
    this.camera.lookAt(this.panOffset);
  }

  onPointerDown(e) {
    this.isDragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.lastMouse.set(e.clientX, e.clientY);
    this.touchStartTime = Date.now();
  }

  onPointerMove(e) {
    const hit = this.getIntersection(e.clientX, e.clientY);

    // Tool Preview Logic (Ghost)
    if (this.currentToolCallback && hit) {
      this.currentToolCallback(hit.point, false); // isClick = false
    }

    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouse.x;
    const deltaY = e.clientY - this.lastMouse.y;
    this.lastMouse.set(e.clientX, e.clientY);

    // Orbit (Left click or Touch)
    if (e.buttons === 1 || e.pointerType === 'touch') {
        this.orbitTheta -= deltaX * 0.005;
        this.orbitPhi -= deltaY * 0.005;
        this.orbitPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.orbitPhi)); // Clamp vertical
        this.updateCamera();
    }
    // Pan (Right click)
    else if (e.buttons === 2) {
        const panSpeed = 0.02 * (this.orbitRadius / 10);
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, this.camera.up).normalize();

        this.panOffset.addScaledVector(right, -deltaX * panSpeed);
        this.panOffset.addScaledVector(forward, deltaY * panSpeed);
        this.updateCamera();
    }
  }

  onPointerUp(e) {
    this.isDragging = false;
    // Click detection (small movement + short time)
    const dist = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
    const time = Date.now() - this.touchStartTime;

    if (dist < 5 && time < 300) {
      const hit = this.getIntersection(e.clientX, e.clientY);
      if (hit) {
        // Run active tool OR select object
        if (this.currentToolCallback) {
          this.currentToolCallback(hit.point, true); // isClick = true
        } else if (hit.object && hit.object !== this.terrain && hit.object.uuid !== this.highlightMesh.uuid) {
          // Select object
          this.selectObject(hit.object);
        } else {
            this.deselect();
        }
      }
    }
  }

  onWheel(e) {
    e.preventDefault();
    this.orbitRadius += e.deltaY * 0.01;
    this.orbitRadius = Math.max(2, Math.min(50, this.orbitRadius));
    this.updateCamera();
  }

  // --- Selection & Editing ---

  selectObject(obj) {
    this.selectedObject = obj;
    this.highlightMesh.visible = true;

    // Scale highlight to match object bounding box
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    this.highlightMesh.position.copy(center);
    this.highlightMesh.scale.copy(size).multiplyScalar(1.05);
    this.highlightMesh.rotation.copy(obj.rotation);

    if (this.onSelect) this.onSelect(obj.userData);
  }

  deselect() {
    this.selectedObject = null;
    this.highlightMesh.visible = false;
    if (this.onSelect) this.onSelect(null);
  }

  // --- External Control API ---

  setTool(callback) {
    this.currentToolCallback = callback;
    this.previewGroup.clear(); // Clear old ghosts
    if (callback) this.deselect();
  }

  // Wall Builder
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
    // Baseboard/Molding simple colors
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const baseMesh = new THREE.Mesh(baseGeo, trimMat);
    const moldMesh = new THREE.Mesh(moldGeo, trimMat);

    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    group.add(wallMesh, baseMesh, moldMesh);

    // Pivot is at start point
    group.position.set(start.x, 0, start.z);
    group.rotation.y = -angle;

    group.userData = { id, type: 'wall', ...wallData };
    this.wallsGroup.add(group);

    // Apply texture if exists
    if (texture) this.updateMaterialTexture(group, texture);
  }

  // Floor Builder
  addFloor(floorData) {
    const { id, x, z, texture } = floorData;
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI/2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, 0.02, z + 0.5); // Grid center + slight offset
    mesh.receiveShadow = true;
    mesh.userData = { id, type: 'floor', ...floorData };
    this.floorsGroup.add(mesh);

    if (texture) this.updateMaterialTexture(mesh, texture);
  }

  // Object Placer
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

  // Terrain Modifier
  modifyTerrain(x, z, radius, strength, mode = 'raise') {
      const posAttr = this.terrain.geometry.attributes.position;
      const count = posAttr.count;
      const brushRadSq = radius * radius;

      // Convert world x,z to local
      // Plane is 20x20 centered at 0. Bounds -10 to 10.
      // Segments 39 -> 40 vertices.

      let modified = false;

      for(let i=0; i < count; i++) {
          const px = posAttr.getX(i);
          const pz = posAttr.getY(i); // Rotated geometry, so Y is Z in local
          // Actually we rotated the mesh, not geometry data entirely? 
          // Wait, plane geo is XY. We rotated mesh -90 X. 
          // So local X = world X. Local Y = world -Z.
          // World Y is height (Local Z).

          const dx = px - x;
          const dy = pz - (-z); // Account for rotation coordinate flip
          const distSq = dx*dx + dy*dy;

          if(distSq < brushRadSq) {
              const falloff = 0.5 * (1 + Math.cos(Math.PI * Math.sqrt(distSq) / radius));
              const currentH = posAttr.getZ(i);
              let newH = currentH;

              if (mode === 'raise') newH += strength * falloff;
              else if (mode === 'lower') newH -= strength * falloff;
              else if (mode === 'flatten') newH = newH + (strength - newH) * falloff * 0.5; // Lerp to target

              // Clamp
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

  // Texture Applier
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

  removeObject(id) {
    // Helper to find and remove from groups
    const findAndRemove = (group) => {
        const child = group.children.find(c => c.userData.id === id);
        if (child) {
            group.remove(child);
            return true;
        }
        return false;
    };

    findAndRemove(this.wallsGroup) || findAndRemove(this.floorsGroup) || findAndRemove(this.objectsGroup);
    if (this.selectedObject && this.selectedObject.userData.id === id) this.deselect();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
      // Cleanup events
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
  }
}