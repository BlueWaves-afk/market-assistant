import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Network, Pause, Play, Sparkles, ArrowUpDown } from "lucide-react";

interface NodeData {
  id: string;
  label: string;
  type: "hub" | "stock" | "sector";
  color: string;
  size: number;
  position: [number, number, number];
  details: string;
}

const NODES: NodeData[] = [
  {
    id: "hub",
    label: "Market Core",
    type: "hub",
    color: "#10b981",
    size: 0.9,
    position: [0, 0, 0],
    details: "Synthetic Demo Universe · 4 Tracked Securities",
  },
  {
    id: "northstar",
    label: "NORTHSTAR",
    type: "stock",
    color: "#06b6d4",
    size: 0.65,
    position: [-2.4, 1.2, 0.8],
    details: "Northstar Components Ltd · Industrials (NSE)",
  },
  {
    id: "riverstone",
    label: "RIVERSTONE",
    type: "stock",
    color: "#3b82f6",
    size: 0.75,
    position: [2.2, 1.4, -0.6],
    details: "Riverstone Foods Ltd · Consumer Staples (NSE)",
  },
  {
    id: "cedartech",
    label: "CEDARTECH",
    type: "stock",
    color: "#8b5cf6",
    size: 0.7,
    position: [-1.6, -1.8, 1.0],
    details: "Cedar Technologies Ltd · Information Technology (BSE)",
  },
  {
    id: "maplebio",
    label: "MAPLEBIO",
    type: "stock",
    color: "#f59e0b",
    size: 0.55,
    position: [2.0, -1.5, 0.4],
    details: "Maple Bio Ltd · Healthcare (NSE) · Unvalued Fixture",
  },
  // Sector hubs
  {
    id: "ind",
    label: "Industrials",
    type: "sector",
    color: "#0284c7",
    size: 0.45,
    position: [-3.2, 2.2, 0.2],
    details: "Capital Goods & Manufacturing Sector",
  },
  {
    id: "staples",
    label: "Consumer Staples",
    type: "sector",
    color: "#2563eb",
    size: 0.45,
    position: [3.4, 2.0, -1.2],
    details: "Fast Moving Consumer Goods & Food Sector",
  },
  {
    id: "tech",
    label: "InfoTech",
    type: "sector",
    color: "#7c3aed",
    size: 0.45,
    position: [-2.6, -2.6, 1.4],
    details: "Enterprise Software & Cloud Platforms Sector",
  },
  {
    id: "health",
    label: "Healthcare",
    type: "sector",
    color: "#d97706",
    size: 0.45,
    position: [3.0, -2.4, 0.8],
    details: "Pharmaceuticals & Biotech Sector",
  },
];

const EDGES: [string, string][] = [
  ["hub", "northstar"],
  ["hub", "riverstone"],
  ["hub", "cedartech"],
  ["hub", "maplebio"],
  ["northstar", "ind"],
  ["riverstone", "staples"],
  ["cedartech", "tech"],
  ["maplebio", "health"],
  ["northstar", "cedartech"],
  ["riverstone", "maplebio"],
];

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function createNodeLabelSprite(
  node: NodeData,
  isSelected: boolean
): {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  updateSelection: (selected: boolean) => void;
} {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const dummy = new THREE.Sprite();
    return {
      sprite: dummy,
      texture: new THREE.CanvasTexture(canvas),
      updateSelection: () => {},
    };
  }

  const scale = 2;
  const isPrimary = node.type === "stock" || node.type === "hub";
  const fontSize = (isPrimary ? 13 : 11) * scale;
  const paddingX = 10 * scale;
  const paddingY = 5 * scale;
  const dotRadius = (isPrimary ? 3.5 : 2.5) * scale;
  const dotSpacing = 7 * scale;

  const fontString = `600 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  const renderCanvas = (selected: boolean) => {
    ctx.font = fontString;
    const textMetrics = ctx.measureText(node.label);
    const contentWidth = dotRadius * 2 + dotSpacing + textMetrics.width;
    const width = Math.ceil(contentWidth + paddingX * 2);
    const height = Math.ceil(fontSize + paddingY * 2.2);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    ctx.font = fontString;
    ctx.textBaseline = "middle";

    const radius = 5 * scale;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(1, 1, width - 2, height - 2, radius);
    } else {
      ctx.rect(1, 1, width - 2, height - 2);
    }

    ctx.fillStyle = selected ? "rgba(15, 23, 42, 0.96)" : "rgba(10, 16, 26, 0.88)";
    ctx.fill();

    ctx.lineWidth = (selected ? 2 : 1) * scale;
    ctx.strokeStyle = selected ? node.color : "rgba(148, 163, 184, 0.32)";
    ctx.stroke();

    const dotX = paddingX + dotRadius;
    const dotY = height / 2;
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.fill();

    ctx.fillStyle = selected ? "#ffffff" : isPrimary ? "#f8fafc" : "#cbd5e1";
    ctx.fillText(node.label, dotX + dotRadius + dotSpacing, height / 2);
  };

  renderCanvas(isSelected);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  const aspect = canvas.width / canvas.height;
  const spriteHeight = isPrimary ? 0.42 : 0.34;
  sprite.scale.set(spriteHeight * aspect, spriteHeight, 1);

  const yOffset = node.size * 0.95 + (isPrimary ? 0.38 : 0.28);
  sprite.position.set(node.position[0], node.position[1] + yOffset, node.position[2]);

  return {
    sprite,
    texture,
    updateSelection: (selected: boolean) => {
      renderCanvas(selected);
      texture.needsUpdate = true;
    },
  };
}

export interface MarketNetwork3DProps {
  position?: "top" | "bottom";
  onTogglePosition?: () => void;
}

export default function MarketNetwork3D({
  position = "bottom",
  onTogglePosition,
}: MarketNetwork3DProps = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(NODES[0]);
  const selectedNodeRef = useRef<NodeData | null>(NODES[0]);
  const [isRotating, setIsRotating] = useState(true);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const animFrameRef = useRef<number | null>(null);
  const labelUpdatersRef = useRef<{ id: string; update: (selected: boolean) => void }[]>([]);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
    labelUpdatersRef.current.forEach(({ id, update }) => {
      update(id === selectedNode?.id);
    });
  }, [selectedNode]);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setWebGLSupported(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setIsRotating(false);
    }

    const width = container.clientWidth || 600;
    const height = 340;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 8.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. Network Group
    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    // 3. Node Meshes & Mapping
    const sphereGeometry = new THREE.SphereGeometry(1, 24, 24);
    const nodeMeshes: { mesh: THREE.Mesh; data: NodeData }[] = [];
    const nodePositionsMap = new Map<string, THREE.Vector3>();

    // Sprites & Textures tracking for clean disposal
    const labelSprites: { sprite: THREE.Sprite; texture: THREE.CanvasTexture; data: NodeData }[] = [];
    const updaters: { id: string; update: (selected: boolean) => void }[] = [];

    NODES.forEach((node) => {
      const position = new THREE.Vector3(...node.position);
      nodePositionsMap.set(node.id, position);

      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.color),
        wireframe: node.type === "hub",
      });

      const mesh = new THREE.Mesh(sphereGeometry, material);
      mesh.scale.setScalar(node.size);
      mesh.position.copy(position);
      mesh.userData = { node };

      networkGroup.add(mesh);
      nodeMeshes.push({ mesh, data: node });

      // Add a subtle outer glow ring for stocks and hub
      if (node.type !== "sector") {
        const ringGeo = new THREE.RingGeometry(node.size * 1.25, node.size * 1.35, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(node.color),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.35,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.copy(position);
        networkGroup.add(ringMesh);
      }

      // Add high-DPI billboard text label sprite directly above node
      const label = createNodeLabelSprite(node, node.id === selectedNodeRef.current?.id);
      label.sprite.userData = { node };
      networkGroup.add(label.sprite);
      labelSprites.push({ sprite: label.sprite, texture: label.texture, data: node });
      updaters.push({ id: node.id, update: label.updateSelection });
    });

    labelUpdatersRef.current = updaters;

    // Active Selection Targeting Ring
    const selectionRingGeo = new THREE.RingGeometry(0.85, 0.98, 36);
    const selectionRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const selectionRing = new THREE.Mesh(selectionRingGeo, selectionRingMat);
    networkGroup.add(selectionRing);

    // 4. Edges
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x475569,
      transparent: true,
      opacity: 0.45,
    });

    EDGES.forEach(([srcId, dstId]) => {
      const p1 = nodePositionsMap.get(srcId);
      const p2 = nodePositionsMap.get(dstId);
      if (p1 && p2) {
        const points = [p1, p2];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, lineMaterial);
        networkGroup.add(line);
      }
    });

    // 5. Starfield / Constellation Particle Cloud
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 14;
      positions[i + 1] = (Math.random() - 0.5) * 10;
      positions[i + 2] = (Math.random() - 0.5) * 10;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x64748b,
      size: 0.045,
      transparent: true,
      opacity: 0.35,
    });
    const particleCloud = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleCloud);

    // 6. Interactive Raycasting for Node / Label Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const targets = [
        ...nodeMeshes.map((n) => n.mesh),
        ...labelSprites.map((l) => l.sprite),
      ];
      const intersects = raycaster.intersectObjects(targets);
      if (intersects.length > 0) {
        const hitData = (intersects[0].object.userData?.node as NodeData) || null;
        if (hitData) {
          setSelectedNode(hitData);
        }
      }
    };

    renderer.domElement.addEventListener("click", onPointerDown);

    // 7. Mouse drag to rotate
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      networkGroup.rotation.y += deltaX * 0.005;
      networkGroup.rotation.x += deltaY * 0.005;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // 8. Viewport Intersection Observer & Visibility Change for Low Power
    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(container);

    const onVisibilityChange = () => {
      isVisible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 9. Animation Loop
    let running = true;
    const animate = () => {
      if (!running) return;
      animFrameRef.current = requestAnimationFrame(animate);

      if (isVisible) {
        if (isRotating && !isDragging) {
          networkGroup.rotation.y += 0.0022;
          networkGroup.rotation.x = Math.sin(Date.now() * 0.0005) * 0.12;
          particleCloud.rotation.y -= 0.0004;
        }

        // Update targeting selection ring
        const currentSelected = selectedNodeRef.current;
        if (currentSelected) {
          selectionRing.visible = true;
          selectionRing.position.set(...currentSelected.position);
          selectionRing.scale.setScalar(currentSelected.size * 1.52);
          selectionRing.rotation.z += 0.015;
          (selectionRing.material as THREE.MeshBasicMaterial).color.set(currentSelected.color);
        } else {
          selectionRing.visible = false;
        }

        renderer.render(scene, camera);
      }
    };
    animate();

    // 10. Responsive resize handler
    const onResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("click", onPointerDown);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      labelSprites.forEach(({ sprite, texture }) => {
        texture.dispose();
        (sprite.material as THREE.SpriteMaterial).dispose();
      });
      renderer.dispose();
      sphereGeometry.dispose();
      selectionRingGeo.dispose();
      selectionRingMat.dispose();
      lineMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, [isRotating]);

  return (
    <div className="network-3d-card">
      <div className="network-3d-header">
        <div className="network-title-group">
          <div className="network-badge">
            <Sparkles size={14} className="text-accent" />
            <span>Interactive 3D WebGL</span>
          </div>
          <h3 className="network-title">Market Network & Relational Topology</h3>
          <p className="network-subtitle">
            Relational topology connecting sample instruments to sectors and market core with dynamic labels. Drag to rotate.
          </p>
        </div>

        <div className="network-controls">
          {onTogglePosition && (
            <button
              type="button"
              className="control-icon-btn position-dock-btn"
              onClick={onTogglePosition}
              title={position === "bottom" ? "Dock at Top of page" : "Dock at Bottom of page"}
              aria-label={position === "bottom" ? "Dock at Top of page" : "Dock at Bottom of page"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 8px",
                width: "auto",
                height: "26px",
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--text-secondary)",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              <ArrowUpDown size={12} />
              <span>{position === "bottom" ? "Dock at Top" : "Dock at Bottom"}</span>
            </button>
          )}
          <button
            type="button"
            className="control-icon-btn"
            onClick={() => setIsRotating((r) => !r)}
            title={isRotating ? "Pause rotation" : "Resume rotation"}
            aria-label={isRotating ? "Pause 3D rotation" : "Resume 3D rotation"}
          >
            {isRotating ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <span className="data-badge badge-gray">Illustrative Fixture</span>
        </div>
      </div>

      <div className="network-canvas-container" style={{ position: "relative", minHeight: 340 }}>
        {webGLSupported ? (
          <div ref={containerRef} className="three-viewport" style={{ width: "100%", height: 340 }} />
        ) : (
          <div className="webgl-fallback">
            <Network size={36} className="text-accent" />
            <strong>2D Network Topology (WebGL Fallback)</strong>
            <p>WebGL is unavailable on this device. Displaying relational schematic:</p>
            <div className="fallback-pills">
              {NODES.map((n) => (
                <span key={n.id} className="fallback-pill" style={{ borderColor: n.color }}>
                  {n.label} ({n.type})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Selected Node Floating HUD */}
        {selectedNode && (
          <div className="node-hud-card">
            <div className="node-hud-indicator" style={{ backgroundColor: selectedNode.color }} />
            <div className="node-hud-text">
              <div className="node-hud-title">
                <strong>{selectedNode.label}</strong>
                <span className="data-badge badge-gray">{selectedNode.type.toUpperCase()}</span>
                {selectedNode.id === "maplebio" && (
                  <span className="data-badge badge-amber">Unvalued</span>
                )}
              </div>
              <span className="node-hud-desc">{selectedNode.details}</span>
            </div>
          </div>
        )}
      </div>

      <div className="network-footer">
        <div className="network-legend">
          <button
            type="button"
            className={`legend-chip interactive ${selectedNode?.id === "hub" ? "active" : ""}`}
            onClick={() => setSelectedNode(NODES[0])}
            title="Click to select Core Hub"
          >
            <span className="chip-dot chip-ring" style={{ borderColor: "#10b981", backgroundColor: "transparent" }} />
            <span>Core Hub</span>
          </button>
          <button
            type="button"
            className={`legend-chip interactive ${selectedNode?.type === "stock" && selectedNode?.id !== "maplebio" ? "active" : ""}`}
            onClick={() => setSelectedNode(NODES[1])}
            title="Click to select Tracked Securities"
          >
            <span className="chip-dot" style={{ backgroundColor: "#06b6d4" }} />
            <span>Tracked Securities</span>
          </button>
          <button
            type="button"
            className={`legend-chip interactive ${selectedNode?.type === "sector" ? "active" : ""}`}
            onClick={() => setSelectedNode(NODES[5])}
            title="Click to select Sector Clusters"
          >
            <span className="chip-dot" style={{ backgroundColor: "#8b5cf6" }} />
            <span>Sectors</span>
          </button>
          <button
            type="button"
            className={`legend-chip interactive ${selectedNode?.id === "maplebio" ? "active" : ""}`}
            onClick={() => setSelectedNode(NODES[4])}
            title="Click to select Unvalued Fixture"
          >
            <span className="chip-dot" style={{ backgroundColor: "#f59e0b" }} />
            <span>Unvalued Fixture</span>
          </button>
        </div>
        <div className="network-hint">
          Click any node or label to inspect topology
        </div>
      </div>
    </div>
  );
}
