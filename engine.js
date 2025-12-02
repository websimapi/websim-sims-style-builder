import * as THREE from 'three';
import { SceneSetup } from './scene-setup.js';
import { BuildingSystem } from './building-system.js';

export class Engine {
  constructor(container, onSelect) {
    this.container = container;
    this.onSelect = onSelect;

    // Sub-systems
    this.setup = new SceneSetup(container);
    this.scene = this.setup.scene;
    this.camera = this.setup.camera;
    this.renderer = this.setup.renderer;
    
    // Legacy Accessors (for main.jsx compatibility if it accesses scene/groups directly)
    this.terrain = this.setup.terrain;
    this.wallsGroup = this.setup.wallsGroup;
    this.floorsGroup = this.setup.floorsGroup;
    this.objectsGroup = this.setup.objectsGroup;
    this.previewGroup = this.setup.previewGroup;
    this.selectedObject = null;

    this.building = new BuildingSystem(this.setup);

    // Interaction Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Controls State
    this.isDragging = false;
    this.lastMouse = new THREE.Vector2();
    this.orbitRadius = 20;
    this.orbitTheta = Math.PI / 4;
    this.orbitPhi = Math.PI / 4;
    this.panOffset = new THREE.Vector3(0, 0, 0);

    // Pointer State
    this.pointerCache = new Map();
    this.pinchDist = 0;
    this.pinchCenter = new THREE.Vector2();
    this.isPinching = false;
    this.touchStartTime = 0;
    this.hasMoved = false;
    this.isToolInteraction = false;

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
    window.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

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
    const result = this.raycaster.ray.intersectPlane(this.plane, target);
    if (result) return { point: result, object: null };

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

  panCamera(deltaX, deltaY) {
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

  onPointerDown(e) {
    this.pointerCache.set(e.pointerId, e);

    if (this.pointerCache.size === 1) {
      const hit = this.getIntersection(e.clientX, e.clientY);
      
      // Check if tool handles this (1 finger + active tool + hit)
      if (this.currentToolCallback && hit) {
          this.isToolInteraction = true;
          this.currentToolCallback(hit.point, 'start');
      } else {
          // Camera interaction
          this.isDragging = true;
          this.startX = e.clientX;
          this.startY = e.clientY;
          this.lastMouse.set(e.clientX, e.clientY);
          this.touchStartTime = Date.now();
          this.hasMoved = false;
      }
    } else if (this.pointerCache.size === 2) {
      this.isPinching = true;
      this.isDragging = false; 
      this.isToolInteraction = false;
      
      const points = Array.from(this.pointerCache.values());
      const p1 = points[0];
      const p2 = points[1];
      
      this.pinchDist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      this.pinchCenter.set((p1.clientX + p2.clientX) / 2, (p1.clientY + p2.clientY) / 2);
    }
  }

  onPointerMove(e) {
    this.pointerCache.set(e.pointerId, e);

    // Multi-touch Pan/Zoom
    if (this.pointerCache.size === 2) {
      const points = Array.from(this.pointerCache.values());
      const p1 = points[0];
      const p2 = points[1];
      
      const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const center = new THREE.Vector2((p1.clientX + p2.clientX) / 2, (p1.clientY + p2.clientY) / 2);

      if (this.isPinching) {
          const deltaX = center.x - this.pinchCenter.x;
          const deltaY = center.y - this.pinchCenter.y;
          
          // Pan (Scaled for better feel on touch)
          this.panCamera(deltaX * 2.5, deltaY * 2.5);

          // Zoom
          const zoomDelta = dist - this.pinchDist;
          this.orbitRadius -= zoomDelta * 0.05;
          this.orbitRadius = Math.max(2, Math.min(50, this.orbitRadius));
          this.updateCamera();
      }
      
      this.pinchDist = dist;
      this.pinchCenter.copy(center);
      return;
    }

    const hit = this.getIntersection(e.clientX, e.clientY);

    // Tool Interaction (Drag)
    if (this.isToolInteraction && hit) {
       this.currentToolCallback(hit.point, 'move');
       return;
    }

    // Tool Preview (Hover) - Only if not dragging/pinching
    if (!this.isDragging && !this.isPinching && this.currentToolCallback && hit) {
       this.currentToolCallback(hit.point, 'hover');
    }

    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouse.x;
    const deltaY = e.clientY - this.lastMouse.y;

    // Check significant movement for click cancellation
    if (Math.hypot(e.clientX - this.startX, e.clientY - this.startY) > 5) {
       this.hasMoved = true;
    }
    
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
        this.panCamera(deltaX, deltaY);
    }
  }

  onPointerUp(e) {
    this.pointerCache.delete(e.pointerId);
    
    // Reset Multi-touch state if dropping below 2 fingers
    if (this.pointerCache.size < 2) {
      this.isPinching = false;
    }

    // End Tool Interaction
    if (this.isToolInteraction) {
        const hit = this.getIntersection(e.clientX, e.clientY);
        if (hit) this.currentToolCallback(hit.point, 'end');
        
        if (this.pointerCache.size === 0) {
           this.isToolInteraction = false;
        }
        return;
    }

    // Seamless transition: if 1 finger remains, anchor it for potential orbit
    if (this.pointerCache.size === 1) {
      const p = this.pointerCache.values().next().value;
      this.lastMouse.set(p.clientX, p.clientY);
    } else {
       this.isDragging = false;
    }

    // Click detection
    // Valid only if no pinch occurred and we have 0 fingers left and didn't move much
    if (!this.isPinching && this.pointerCache.size === 0) {
        const dist = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
        const time = Date.now() - this.touchStartTime;

        if (dist < 10 && time < 400) {
          const hit = this.getIntersection(e.clientX, e.clientY);
          if (hit) {
            // Run active tool OR select object
            if (this.currentToolCallback) {
              this.currentToolCallback(hit.point, true); // isClick = true
            } else if (hit.object && hit.object !== this.terrain && hit.object.uuid !== this.setup.highlightMesh.uuid) {
              // Select object
              this.selectObject(hit.object);
            } else {
                this.deselect();
            }
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
    this.setup.highlightMesh.visible = true;

    // Scale highlight to match object bounding box
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    this.setup.highlightMesh.position.copy(center);
    this.setup.highlightMesh.scale.copy(size).multiplyScalar(1.05);
    this.setup.highlightMesh.rotation.copy(obj.rotation);

    if (this.onSelect) this.onSelect(obj.userData);
  }

  deselect() {
    this.selectedObject = null;
    this.setup.highlightMesh.visible = false;
    if (this.onSelect) this.onSelect(null);
  }

  // --- Delegation to BuildingSystem ---

  setTool(callback) {
    this.currentToolCallback = callback;
    this.previewGroup.clear(); // Clear old ghosts
    if (callback) this.deselect();
  }

  updateWallPreview(start, end, isValid) {
      this.building.updateWallPreview(start, end, isValid);
  }

  addWall(wallData) {
      this.building.addWall(wallData);
  }

  addFloor(floorData) {
      this.building.addFloor(floorData);
  }

  addObject(objData) {
      this.building.addObject(objData);
  }

  modifyTerrain(x, z, radius, strength, mode) {
      this.building.modifyTerrain(x, z, radius, strength, mode);
  }

  updateMaterialTexture(object, textureUrl) {
      this.building.updateMaterialTexture(object, textureUrl);
  }

  removeObject(id) {
      const wasSelected = this.building.removeObject(id, this.selectedObject);
      if (wasSelected) this.deselect();
  }

  onResize() {
    this.setup.resize();
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
      this.setup.dispose();
  }
}