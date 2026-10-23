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
  const [isRotating, setIsRotating] = useState(true);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const animFrameRef = useRef<number | null>(null);

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
    });

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
    const particleCount = 120;
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
      size: 0.05,
      transparent: true,
      opacity: 0.4,
    });
    const particleCloud = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleCloud);

    // 6. Interactive Raycasting for Node Hover/Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes.map((n) => n.mesh));
      if (intersects.length > 0) {
        const hit = nodeMeshes.find((n) => n.mesh === intersects[0].object);
        if (hit) {
          setSelectedNode(hit.data);
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
          networkGroup.rotation.y += 0.0025;
          networkGroup.rotation.x = Math.sin(Date.now() * 0.0005) * 0.15;
          particleCloud.rotation.y -= 0.0005;
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
      renderer.dispose();
      sphereGeometry.dispose();
      lineMaterial.dispose();
    };
  }, [isRotating]);

  return (
    <div className="network-3d-card">
      <div className="network-3d-header">
        <div className="network-title-group">
          <div className="network-badge">
            <Sparkles size={14} className="text-accent" />
            <span>Illustrative 3D WebGL</span>
          </div>
          <h3 className="network-title">Market Network & Relational Topology</h3>
          <p className="network-subtitle">
            3D relational graph connecting sample instruments to sectors and the market core. Drag to rotate.
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
              </div>
              <span className="node-hud-desc">{selectedNode.details}</span>
            </div>
          </div>
        )}
      </div>

      <div className="network-footer">
        <div className="network-legend">
          <span className="legend-chip">
            <span className="chip-dot" style={{ backgroundColor: "#10b981" }} /> Core Hub
          </span>
          <span className="legend-chip">
            <span className="chip-dot" style={{ backgroundColor: "#06b6d4" }} /> Securities
          </span>
          <span className="legend-chip">
            <span className="chip-dot" style={{ backgroundColor: "#8b5cf6" }} /> Sectors
          </span>
          <span className="legend-chip">
            <span className="chip-dot" style={{ backgroundColor: "#f59e0b" }} /> Unvalued
          </span>
        </div>
        <div className="network-hint">
          Click any node or drag to inspect Euclidean market clustering
        </div>
      </div>
    </div>
  );
}
