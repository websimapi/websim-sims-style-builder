import * as THREE from 'three';

export class SceneSetup {
  constructor(container) {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);

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

    // Grid
    const gridHelper = new THREE.GridHelper(20, 40, 0x888888, 0xcccccc);
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

    // Groups
    this.wallsGroup = new THREE.Group();
    this.floorsGroup = new THREE.Group();
    this.objectsGroup = new THREE.Group();
    this.previewGroup = new THREE.Group();
    
    this.scene.add(this.wallsGroup);
    this.scene.add(this.floorsGroup);
    this.scene.add(this.objectsGroup);
    this.scene.add(this.previewGroup);

    // Highlight Mesh
    this.highlightMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true, transparent: true, opacity: 0.5 })
    );
    this.scene.add(this.highlightMesh);
    this.highlightMesh.visible = false;
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    this.renderer.dispose();
  }
}