// src/app/spill/components/GoBoard3D.tsx
"use client";

import React, { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BOARD_SIZE as ENGINE_BOARD_SIZE } from "../../lib/goEngine";
import { motion } from "framer-motion";

export interface GoBoard3DProps {
  initialBoardState: number[][];
  onMakeMove?: (x: number, y: number) => void;
  currentPlayer: number;
}

const MODERN_GLASS_THEME = {
  boardBaseColor: 0xffffff,
  boardOpacity: 0.75,
  boardRoughness: 0.15,
  boardMetalness: 0.1,
  lineColor: 0x1a1a1a,
  starPointColor: 0x000000,
  blackStoneColor: 0x080808,
  whiteStoneColor: 0xececec,
  stoneRoughness: 0.1,
  stoneMetalness: 0.0,
  hemisphereSky: 0xadd8e6,
  hemisphereGround: 0x696969,
  hemisphereIntensity: 0.8,
  directionalLightColor: 0xffffff,
  directionalIntensity: 0.9,
  hoverMarkerColor: 0xffffff,
  hoverMarkerOpacity: 0.6,
  toneMappingExposure: 0.9,
};

const GoBoard3D: React.FC<GoBoard3DProps> = ({
  initialBoardState,
  onMakeMove,
  currentPlayer,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const stonesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const hoverMarkerRef = useRef<THREE.Mesh | null>(null);
  const boardMeshRef = useRef<THREE.Mesh | null>(null);
  const gridLinesRef = useRef<THREE.LineSegments | null>(null);
  const starPointsGroupRef = useRef<THREE.Group>(new THREE.Group());

  const ambientLightRef = useRef<THREE.HemisphereLight | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);

  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  const BOARD_DIMENSION: number = ENGINE_BOARD_SIZE;
  const CELL_SIZE = 1;
  const STONE_RADIUS = CELL_SIZE * 0.43;
  const STONE_HEIGHT_SCALE = 0.4;
  const BOARD_THICKNESS = CELL_SIZE * 0.25;
  const GRID_OFFSET = ((BOARD_DIMENSION - 1) * CELL_SIZE) / 2;

  const worldToGrid = useCallback(
    (worldX: number, worldZ: number): { x: number; y: number } | null => {
      const boardX = Math.round((worldX + GRID_OFFSET) / CELL_SIZE);
      const boardY = Math.round((worldZ + GRID_OFFSET) / CELL_SIZE);
      if (
        boardX >= 0 &&
        boardX < BOARD_DIMENSION &&
        boardY >= 0 &&
        boardY < BOARD_DIMENSION
      ) {
        return { x: boardX, y: boardY };
      }
      return null;
    },
    [BOARD_DIMENSION, GRID_OFFSET, CELL_SIZE]
  );

  const gridToWorld = useCallback(
    (gridX: number, gridY: number): THREE.Vector3 => {
      return new THREE.Vector3(
        gridX * CELL_SIZE - GRID_OFFSET,
        BOARD_THICKNESS / 2 + (STONE_RADIUS * STONE_HEIGHT_SCALE) / 2,
        gridY * CELL_SIZE - GRID_OFFSET
      );
    },
    [BOARD_THICKNESS, STONE_RADIUS, STONE_HEIGHT_SCALE, CELL_SIZE, GRID_OFFSET]
  );

  useEffect(() => {
    if (!mountRef.current || rendererRef.current) return;

    const currentMount = mountRef.current;

    sceneRef.current = new THREE.Scene();

    cameraRef.current = new THREE.PerspectiveCamera(
      55,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    cameraRef.current.position.set(
      GRID_OFFSET * 0.4,
      BOARD_DIMENSION * 1.0,
      GRID_OFFSET * 1.6
    );

    rendererRef.current = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    rendererRef.current.setPixelRatio(window.devicePixelRatio);
    rendererRef.current.shadowMap.enabled = true;
    rendererRef.current.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current.toneMapping = THREE.ACESFilmicToneMapping;
    rendererRef.current.toneMappingExposure =
      MODERN_GLASS_THEME.toneMappingExposure;
    rendererRef.current.setClearAlpha(0.0);
    currentMount.appendChild(rendererRef.current.domElement);

    controlsRef.current = new OrbitControls(
      cameraRef.current,
      rendererRef.current.domElement
    );
    controlsRef.current.enableDamping = true;
    controlsRef.current.dampingFactor = 0.04;
    controlsRef.current.screenSpacePanning = false;
    controlsRef.current.minDistance = BOARD_DIMENSION * 0.4;
    controlsRef.current.maxDistance = BOARD_DIMENSION * 3.0;
    controlsRef.current.target.set(0, BOARD_THICKNESS / 2, 0);
    controlsRef.current.maxPolarAngle = Math.PI / 2 - 0.05;

    const boardMaterial = new THREE.MeshStandardMaterial({
      color: MODERN_GLASS_THEME.boardBaseColor,
      roughness: MODERN_GLASS_THEME.boardRoughness,
      metalness: MODERN_GLASS_THEME.boardMetalness,
      transparent: true,
      opacity: MODERN_GLASS_THEME.boardOpacity,
    });
    const boardGeometry = new THREE.BoxGeometry(
      BOARD_DIMENSION * CELL_SIZE,
      BOARD_THICKNESS,
      BOARD_DIMENSION * CELL_SIZE
    );
    boardMeshRef.current = new THREE.Mesh(boardGeometry, boardMaterial);
    boardMeshRef.current.receiveShadow = true;
    boardMeshRef.current.name = "goBoardPlane";
    sceneRef.current.add(boardMeshRef.current);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: MODERN_GLASS_THEME.lineColor,
      linewidth: 1.5,
    });
    const points = [];
    const lineYOffset = BOARD_THICKNESS / 2 + 0.008;
    for (let i = 0; i < BOARD_DIMENSION; i++) {
      points.push(
        new THREE.Vector3(
          -GRID_OFFSET,
          lineYOffset,
          i * CELL_SIZE - GRID_OFFSET
        )
      );
      points.push(
        new THREE.Vector3(GRID_OFFSET, lineYOffset, i * CELL_SIZE - GRID_OFFSET)
      );
      points.push(
        new THREE.Vector3(
          i * CELL_SIZE - GRID_OFFSET,
          lineYOffset,
          -GRID_OFFSET
        )
      );
      points.push(
        new THREE.Vector3(i * CELL_SIZE - GRID_OFFSET, lineYOffset, GRID_OFFSET)
      );
    }
    const gridGeometry = new THREE.BufferGeometry().setFromPoints(points);
    gridLinesRef.current = new THREE.LineSegments(gridGeometry, lineMaterial);
    sceneRef.current.add(gridLinesRef.current);

    // Capture current starPointsGroup for cleanup
    const starPointsGroup = starPointsGroupRef.current;
    starPointsGroup.clear();
    if (BOARD_DIMENSION === 13) {
      const starPointGeometry = new THREE.CircleGeometry(CELL_SIZE * 0.07, 16);
      const starPointMaterial = new THREE.MeshBasicMaterial({
        color: MODERN_GLASS_THEME.starPointColor,
      });
      const starPointsCoords = [
        { x: 3, y: 3 },
        { x: 3, y: 9 },
        { x: 9, y: 3 },
        { x: 9, y: 9 },
        { x: 6, y: 6 },
      ];
      starPointsCoords.forEach((coord) => {
        const starPointMesh = new THREE.Mesh(
          starPointGeometry.clone(),
          starPointMaterial.clone()
        );
        const pos = gridToWorld(coord.x, coord.y);
        starPointMesh.position.set(pos.x, BOARD_THICKNESS / 2 + 0.009, pos.z);
        starPointMesh.rotation.x = -Math.PI / 2;
        starPointsGroup.add(starPointMesh);
      });
    }
    sceneRef.current.add(starPointsGroup);

    sceneRef.current.add(stonesGroupRef.current);

    const markerGeometry = new THREE.TorusGeometry(
      STONE_RADIUS * 0.75,
      STONE_RADIUS * 0.08,
      8,
      32
    );
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: MODERN_GLASS_THEME.hoverMarkerColor,
      transparent: true,
      opacity: MODERN_GLASS_THEME.hoverMarkerOpacity,
    });
    hoverMarkerRef.current = new THREE.Mesh(markerGeometry, markerMaterial);
    hoverMarkerRef.current.rotation.x = Math.PI / 2;
    hoverMarkerRef.current.visible = false;
    sceneRef.current.add(hoverMarkerRef.current);

    ambientLightRef.current = new THREE.HemisphereLight(
      MODERN_GLASS_THEME.hemisphereSky,
      MODERN_GLASS_THEME.hemisphereGround,
      MODERN_GLASS_THEME.hemisphereIntensity
    );
    sceneRef.current.add(ambientLightRef.current);

    directionalLightRef.current = new THREE.DirectionalLight(
      MODERN_GLASS_THEME.directionalLightColor,
      MODERN_GLASS_THEME.directionalIntensity
    );
    directionalLightRef.current.castShadow = true;
    directionalLightRef.current.shadow.mapSize.width = 2048;
    directionalLightRef.current.shadow.mapSize.height = 2048;
    directionalLightRef.current.shadow.camera.near = BOARD_DIMENSION * 0.05;
    directionalLightRef.current.shadow.camera.far = BOARD_DIMENSION * 4;
    directionalLightRef.current.shadow.camera.left = -BOARD_DIMENSION * 1.2;
    directionalLightRef.current.shadow.camera.right = BOARD_DIMENSION * 1.2;
    directionalLightRef.current.shadow.camera.top = BOARD_DIMENSION * 1.2;
    directionalLightRef.current.shadow.camera.bottom = -BOARD_DIMENSION * 1.2;
    directionalLightRef.current.shadow.bias = -0.0008;
    directionalLightRef.current.position.set(
      BOARD_DIMENSION * 0.7,
      BOARD_DIMENSION * 1.8,
      BOARD_DIMENSION * 0.9
    );
    sceneRef.current.add(directionalLightRef.current);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controlsRef.current?.update();
      rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
    };
    animate();

    const handleResize = () => {
      if (currentMount && rendererRef.current && cameraRef.current) {
        const width = currentMount.clientWidth;
        const height = currentMount.clientHeight;
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    const onMouseMove = (event: MouseEvent) => {
      if (
        !currentMount ||
        !cameraRef.current ||
        !sceneRef.current ||
        !hoverMarkerRef.current ||
        !boardMeshRef.current
      )
        return;
      const rect = currentMount.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObject(
        boardMeshRef.current
      );
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const gridPos = worldToGrid(point.x, point.z);
        if (gridPos && initialBoardState[gridPos.y][gridPos.x] === 0) {
          const worldPos = gridToWorld(gridPos.x, gridPos.y);
          hoverMarkerRef.current.position.set(
            worldPos.x,
            BOARD_THICKNESS / 2 + 0.012,
            worldPos.z
          );
          hoverMarkerRef.current.visible = true;
        } else {
          hoverMarkerRef.current.visible = false;
        }
      } else {
        hoverMarkerRef.current.visible = false;
      }
    };
    currentMount.addEventListener("mousemove", onMouseMove);

    const onClick = () => {
      if (
        !currentMount ||
        !cameraRef.current ||
        !sceneRef.current ||
        !boardMeshRef.current
      )
        return;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObject(
        boardMeshRef.current
      );
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const gridPos = worldToGrid(point.x, point.z);
        if (gridPos && onMakeMove) {
          onMakeMove(gridPos.x, gridPos.y);
        }
      }
    };
    currentMount.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      currentMount.removeEventListener("mousemove", onMouseMove);
      currentMount.removeEventListener("click", onClick);
      rendererRef.current?.dispose();
      if (rendererRef.current?.domElement.parentNode === currentMount) {
        currentMount.removeChild(rendererRef.current!.domElement);
      }
      rendererRef.current = null;
      boardMeshRef.current?.geometry.dispose();
      (boardMeshRef.current?.material as THREE.Material)?.dispose();
      gridLinesRef.current?.geometry.dispose();
      (gridLinesRef.current?.material as THREE.Material)?.dispose();

      // Use captured starPointsGroup for cleanup
      starPointsGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });

      hoverMarkerRef.current?.geometry.dispose();
      (hoverMarkerRef.current?.material as THREE.Material)?.dispose();
      sceneRef.current?.clear();
    };
  }, [
    BOARD_DIMENSION,
    CELL_SIZE,
    GRID_OFFSET,
    STONE_RADIUS,
    STONE_HEIGHT_SCALE,
    BOARD_THICKNESS,
    gridToWorld,
    worldToGrid,
    onMakeMove,
    initialBoardState,
  ]);

  useEffect(() => {
    if (!stonesGroupRef.current) return;
    while (stonesGroupRef.current.children.length > 0) {
      const stoneMesh = stonesGroupRef.current.children[0] as THREE.Mesh;
      stoneMesh.geometry.dispose();
      (stoneMesh.material as THREE.Material).dispose();
      stonesGroupRef.current.remove(stoneMesh);
    }

    const blackStoneMaterial = new THREE.MeshStandardMaterial({
      color: MODERN_GLASS_THEME.blackStoneColor,
      roughness: MODERN_GLASS_THEME.stoneRoughness,
      metalness: MODERN_GLASS_THEME.stoneMetalness,
    });
    const whiteStoneMaterial = new THREE.MeshStandardMaterial({
      color: MODERN_GLASS_THEME.whiteStoneColor,
      roughness: MODERN_GLASS_THEME.stoneRoughness,
      metalness: MODERN_GLASS_THEME.stoneMetalness,
    });
    const stoneGeometry = new THREE.SphereGeometry(STONE_RADIUS, 24, 18);
    stoneGeometry.scale(1, STONE_HEIGHT_SCALE, 1);

    for (let y = 0; y < BOARD_DIMENSION; y++) {
      for (let x = 0; x < BOARD_DIMENSION; x++) {
        if (initialBoardState[y][x] !== 0) {
          const material =
            initialBoardState[y][x] === 1
              ? blackStoneMaterial
              : whiteStoneMaterial;
          const stone = new THREE.Mesh(stoneGeometry.clone(), material.clone());
          const pos = gridToWorld(x, y);
          stone.position.copy(pos);
          stone.scale.set(0.1, 0.1, 0.1);
          stone.castShadow = true;
          stone.receiveShadow = true;
          stonesGroupRef.current.add(stone);

          let currentScale = 0.1;
          const targetScale = 1.0;
          const animationDuration = 150;
          const startTime = performance.now();
          function animateScale() {
            const elapsedTime = performance.now() - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);
            currentScale = 0.1 + progress * (targetScale - 0.1);
            stone.scale.set(currentScale, currentScale, currentScale);
            if (progress < 1) {
              requestAnimationFrame(animateScale);
            }
          }
          requestAnimationFrame(animateScale);
        }
      }
    }
    return () => {
      blackStoneMaterial.dispose();
      whiteStoneMaterial.dispose();
      stoneGeometry.dispose();
    };
  }, [
    initialBoardState,
    BOARD_DIMENSION,
    gridToWorld,
    STONE_RADIUS,
    STONE_HEIGHT_SCALE,
  ]);

  useEffect(() => {
    if (hoverMarkerRef.current) {
      const markerMaterial = hoverMarkerRef.current
        .material as THREE.MeshBasicMaterial;
      if (currentPlayer === 1) {
        markerMaterial.color.setHex(MODERN_GLASS_THEME.blackStoneColor);
        markerMaterial.opacity = MODERN_GLASS_THEME.hoverMarkerOpacity * 0.8;
      } else {
        markerMaterial.color.setHex(MODERN_GLASS_THEME.whiteStoneColor);
        markerMaterial.opacity = MODERN_GLASS_THEME.hoverMarkerOpacity;
      }
    }
  }, [currentPlayer]);

  return (
    <motion.div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "inherit",
        overflow: "hidden",
        cursor: "pointer",
      }}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    />
  );
};

export default GoBoard3D;
