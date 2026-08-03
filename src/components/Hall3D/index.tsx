import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { screenApi } from '../../api';

type SafetyCoordItem = {
  booth_no?: string | null;
  exhibitor?: string;
  area?: string | null;
  raw_texts?: string[];
  bbox?: [number, number, number, number];
  center?: [number, number];
  width?: number;
  height?: number;
};

type SafetyCoordResponse = {
  dataJson?: string;
  image_size?: { width?: number; height?: number };
  booths?: SafetyCoordItem[];
  data?: {
    dataJson?: string;
    image_size?: { width?: number; height?: number };
    booths?: SafetyCoordItem[];
  };
};

type DemoBooth = {
  booth_no: string | null;
  exhibitor: string;
  area: string | null;
  raw_texts?: string[];
  bbox: [number, number, number, number];
  center: [number, number];
  width: number;
  height: number;
};

type Hall3DProps = {
  hallId: string;
  expoName: string;
  exhibitionId: string;
};

const HALL_PALETTE = ['#56c8ff', '#3dd6d0', '#77f0a1', '#ffd36b', '#ff9966', '#b084ff'];

function normalizeSafetyCoordResponse(response: SafetyCoordResponse | null | undefined) {
  const payload = response?.data ?? response;
  const parsed = payload?.dataJson ? JSON.parse(payload.dataJson) : null;
  const booths = (parsed?.booths ?? payload?.booths ?? []) as SafetyCoordItem[];
  const imageSize = parsed?.image_size ?? payload?.image_size;
  const imageWidth = Number(imageSize?.width);
  const imageHeight = Number(imageSize?.height);
  return {
    imageWidth: Number.isFinite(imageWidth) ? imageWidth : null,
    imageHeight: Number.isFinite(imageHeight) ? imageHeight : null,
    booths,
  };
}

function normalizeBooth(item: SafetyCoordItem): DemoBooth | null {
  const bbox = item.bbox;
  const center = item.center;
  const width = Number(item.width ?? (bbox ? bbox[2] - bbox[0] : NaN));
  const height = Number(item.height ?? (bbox ? bbox[3] - bbox[1] : NaN));
  if (!bbox || !center || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  return {
    booth_no: item.booth_no ?? null,
    exhibitor: String(item.exhibitor ?? ''),
    area: item.area ?? null,
    raw_texts: item.raw_texts,
    bbox,
    center,
    width,
    height,
  };
}

function getHall3DColor(booth: DemoBooth, index: number) {
  const seed = `${booth.booth_no ?? ''}-${booth.exhibitor}-${index}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return HALL_PALETTE[hash % HALL_PALETTE.length];
}

function labelText(booth: DemoBooth) {
  return `${booth.booth_no || '—'}\n${booth.exhibitor || '未命名'}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function Hall3D({ hallId, expoName, exhibitionId }: Hall3DProps) {
  const [imageWidth, setImageWidth] = useState(3640);
  const [imageHeight, setImageHeight] = useState(7070);
  const [booths, setBooths] = useState<DemoBooth[]>([]);
  const [selectedBooth, setSelectedBooth] = useState<DemoBooth | null>(null);
  const [hoveredBooth, setHoveredBooth] = useState<DemoBooth | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number | null>(null);
  const boothMeshesRef = useRef<THREE.Mesh[]>([]);
  const titleText = expoName || '工业级数字孪生展馆';
  const boothCount = booths.length;
  const hallScaleLabel = imageWidth > 0 && imageHeight > 0 ? `${Math.max(1, Math.round(imageWidth / 100))}m × ${Math.max(1, Math.round(imageHeight / 100))}m` : '—';
  const layoutBooths = useMemo(() => {
    if (!booths.length) return [];
    return booths.map((booth, index) => {
      const widthFactor = clamp(booth.width / 240, 0.85, 2.8);
      const heightFactor = clamp(booth.height / 360, 0.85, 2.8);
      const padding = 4;
      const usableWidth = imageWidth > 0 ? Math.max(36, imageWidth / 100) : 72;
      const usableHeight = imageHeight > 0 ? Math.max(36, imageHeight / 100) : 72;
      const x = ((booth.center[0] / (imageWidth || 1)) - 0.5) * usableWidth + padding * Math.sin(index * 0.31);
      const z = ((0.5 - booth.center[1] / (imageHeight || 1))) * usableHeight + padding * Math.cos(index * 0.29);
      return {
        booth,
        index,
        x,
        z,
        widthFactor,
        heightFactor,
      };
    });
  }, [booths]);

  useEffect(() => {
    const fetchSafetyCoord = async () => {
      if (!hallId || hallId === 'all') {
        setBooths([]);
        setSelectedBooth(null);
        setHoveredBooth(null);
        return;
      }
      const response = await screenApi.getSafetyCoordByHallId(hallId);
      const normalized = normalizeSafetyCoordResponse(response as SafetyCoordResponse);
      const nextBooths = normalized.booths.map(normalizeBooth).filter(Boolean) as DemoBooth[];
      setImageWidth(normalized.imageWidth ?? 3640);
      setImageHeight(normalized.imageHeight ?? 7070);
      setBooths(nextBooths);
      setSelectedBooth(nextBooths[0] ?? null);
      setHoveredBooth(null);
    };
    void fetchSafetyCoord();
  }, [hallId]);

  useGSAP(() => {
    if (!chartRef.current) return;

    const container = chartRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04111d, 0.025);
    scene.background = new THREE.Color(0x030812);

    const frustumSize = 92;
    const aspect = width / height;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      800,
    );
    camera.position.set(0, 88, 0.01);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, -1);
    camera.rotation.x = -Math.PI / 2;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xb7d9ff, 0.55);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x99cfff, 0x07121c, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0x9ed7ff, 3.2);
    keyLight.position.set(28, 52, 26);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 140;
    keyLight.shadow.camera.left = -70;
    keyLight.shadow.camera.right = 70;
    keyLight.shadow.camera.top = 70;
    keyLight.shadow.camera.bottom = -70;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x4fe2ff, 1.35);
    rimLight.position.set(-24, 18, -32);
    scene.add(rimLight);

    const orangeAccent = new THREE.PointLight(0xff8a3d, 8, 110, 2);
    orangeAccent.position.set(22, 10, 18);
    scene.add(orangeAccent);

    const cyanAccent = new THREE.PointLight(0x2fe1ff, 18, 180, 2);
    cyanAccent.position.set(-34, 12, -26);
    scene.add(cyanAccent);

    const floorGroup = new THREE.Group();
    scene.add(floorGroup);

    const floorGeo = new THREE.BoxGeometry(160, 1.2, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b1826,
      metalness: 0.72,
      roughness: 0.38,
      envMapIntensity: 1.4,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    floor.position.y = -6.2;
    floorGroup.add(floor);

    const floorTop = new THREE.Mesh(
      new THREE.BoxGeometry(156, 0.18, 156),
      new THREE.MeshStandardMaterial({
        color: 0x071423,
        metalness: 0.9,
        roughness: 0.24,
        transparent: true,
        opacity: 0.92,
      }),
    );
    floorTop.position.y = -5.55;
    floorTop.receiveShadow = true;
    floorGroup.add(floorTop);

    const floorBorder = new THREE.Mesh(
      new THREE.RingGeometry(48, 74, 64),
      new THREE.MeshBasicMaterial({ color: 0x2fe1ff, transparent: true, opacity: 0.06, side: THREE.DoubleSide }),
    );
    floorBorder.rotation.x = -Math.PI / 2;
    floorBorder.position.y = -5.46;
    scene.add(floorBorder);

    const scannerRing = new THREE.Mesh(
      new THREE.RingGeometry(12, 34, 96),
      new THREE.MeshBasicMaterial({ color: 0x69d8ff, transparent: true, opacity: 0.1, side: THREE.DoubleSide }),
    );
    scannerRing.rotation.x = -Math.PI / 2;
    scannerRing.position.y = -5.35;
    scene.add(scannerRing);

    const grid = new THREE.GridHelper(160, 40, 0x2f8dff, 0x12324f);
    (grid.material as THREE.Material & { transparent?: boolean; opacity?: number }).transparent = true;
    (grid.material as THREE.Material & { transparent?: boolean; opacity?: number }).opacity = 0.42;
    grid.position.y = -5.48;
    scene.add(grid);

    const gridGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(156, 156),
      new THREE.MeshBasicMaterial({ color: 0x0e3f66, transparent: true, opacity: 0.08 }),
    );
    gridGlow.rotation.x = -Math.PI / 2;
    gridGlow.position.y = -5.45;
    scene.add(gridGlow);

    const boothGroup = new THREE.Group();
    boothGroup.position.set(0, -1.8, 0);
    scene.add(boothGroup);
    const boothMeshes: THREE.Mesh[] = [];

    const baseScale = clamp(Math.max(imageWidth, imageHeight) / 1200, 1.1, 2.8);

    layoutBooths.forEach(({ booth, index, x, z, widthFactor, heightFactor }) => {
      const color = new THREE.Color(getHall3DColor(booth, index));
      const scaleW = clamp(widthFactor * 1.6 / baseScale, 1.6, 4.9);
      const scaleD = clamp(heightFactor * 1.6 / baseScale, 1.6, 4.9);
      const scaleH = clamp((booth.height / 520) / baseScale + 1.4, 2.2, 8.5);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(scaleW * 1.45, 0.55, scaleD * 1.45),
        new THREE.MeshStandardMaterial({
          color: 0x13293e,
          metalness: 0.88,
          roughness: 0.44,
          emissive: new THREE.Color(0x06111f),
          emissiveIntensity: 0.15,
        }),
      );
      base.position.set(x, -5.2, z);
      base.castShadow = true;
      base.receiveShadow = true;
      boothGroup.add(base);
      boothMeshes.push(base);

      const core = new THREE.Mesh(
        new THREE.BoxGeometry(scaleW, scaleH, scaleD),
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.96,
          roughness: 0.26,
          emissive: color.clone().multiplyScalar(0.12),
          emissiveIntensity: 0.75,
        }),
      );
      core.position.set(x, -3.55 + scaleH * 0.5, z);
      core.castShadow = true;
      core.receiveShadow = true;
      core.userData = { booth, kind: 'core' };
      boothGroup.add(core);
      boothMeshes.push(core);

      const shell = new THREE.Mesh(
        new THREE.BoxGeometry(scaleW * 1.08, scaleH * 1.08, scaleD * 1.08),
        new THREE.MeshStandardMaterial({
          color: 0x06101a,
          metalness: 0.82,
          roughness: 0.18,
          transparent: true,
          opacity: 0.18,
          emissive: new THREE.Color(0x0a2240),
          emissiveIntensity: 0.32,
        }),
      );
      shell.position.copy(core.position);
      shell.castShadow = true;
      shell.receiveShadow = true;
      boothGroup.add(shell);
      boothMeshes.push(shell);

      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(scaleW * 1.12, scaleH * 1.12, scaleD * 1.12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12 }),
      );
      edge.position.copy(core.position);
      boothGroup.add(edge);
      boothMeshes.push(edge);

      const topLight = new THREE.Mesh(
        new THREE.BoxGeometry(scaleW * 0.78, 0.18, scaleD * 0.78),
        new THREE.MeshBasicMaterial({ color: 0x7de2ff, transparent: true, opacity: 0.72 }),
      );
      topLight.position.set(x, core.position.y + scaleH * 0.53, z);
      boothGroup.add(topLight);
      boothMeshes.push(topLight);

      const warnLight = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.12, scaleW * 0.12), 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.9 }),
      );
      warnLight.position.set(x + scaleW * 0.24, core.position.y + scaleH * 0.18, z + scaleD * 0.24);
      boothGroup.add(warnLight);
      boothMeshes.push(warnLight);

      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(scaleW * 1.58, 0.22, scaleD * 1.58),
        new THREE.MeshBasicMaterial({ color: 0x3dd6d0, transparent: true, opacity: 0.18 }),
      );
      glow.position.set(x, -5.02, z);
      boothGroup.add(glow);
      boothMeshes.push(glow);

      const connector = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, scaleH * 0.9, 0.16),
        new THREE.MeshBasicMaterial({ color: 0x7de2ff, transparent: true, opacity: 0.34 }),
      );
      connector.position.set(x, core.position.y + scaleH * 0.18, z);
      boothGroup.add(connector);
      boothMeshes.push(connector);
    });
    boothMeshesRef.current = boothMeshes;

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(220, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x04111c, side: THREE.BackSide }),
    );
    scene.add(skyDome);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const applySelection = (booth: DemoBooth | null) => {
      setSelectedBooth(booth);
      setHoveredBooth(booth);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(boothMeshes, false);
      const booth = hits.find((hit) => hit.object.userData?.booth)?.object.userData?.booth as DemoBooth | undefined;
      if (booth) applySelection(booth);
    };

    const onPointerLeave = () => {
      setHoveredBooth(null);
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);

    const animate = () => {
      renderer.render(scene, camera);
      frameRef.current = window.requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!chartRef.current || !cameraRef.current || !rendererRef.current) return;
      const nextWidth = chartRef.current.clientWidth;
      const nextHeight = chartRef.current.clientHeight;
      const nextAspect = nextWidth / nextHeight;
      const frustumSize = 92;
      cameraRef.current.left = (-frustumSize * nextAspect) / 2;
      cameraRef.current.right = (frustumSize * nextAspect) / 2;
      cameraRef.current.top = frustumSize / 2;
      cameraRef.current.bottom = -frustumSize / 2;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nextWidth, nextHeight);
    });
    resizeObserver.observe(container);

    const intro = gsap.fromTo(
      boothGroup.scale,
      { x: 0.9, y: 0.9, z: 0.9 },
      { x: 1, y: 1, z: 1, duration: 1.1, ease: 'power3.out' },
    );
    const scannerTween = gsap.to(scannerRing.scale, {
      x: 1.6,
      y: 1.6,
      z: 1.6,
      duration: 2.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
    const scannerOpacity = gsap.to(scannerRing.material, {
      opacity: 0.03,
      duration: 2.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    return () => {
      intro.kill();
      scannerTween.kill();
      scannerOpacity.kill();
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      boothMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      });
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      if (rendererRef.current) {
        const canvas = rendererRef.current.domElement;
        rendererRef.current.dispose();
        if (canvas.parentNode === container) container.removeChild(canvas);
      }
    };
  }, { dependencies: [booths], scope: chartRef, revertOnUpdate: true });

  const boothLabel = useMemo(() => {
    const booth = hoveredBooth ?? selectedBooth;
    if (!booth) return '未选中';
    return labelText(booth);
  }, [hoveredBooth, selectedBooth]);

  return (
    <div className="flex h-full min-h-screen w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_center,rgba(26,74,124,0.24),transparent_32%),radial-gradient(circle_at_top,rgba(30,98,160,0.18),transparent_26%),linear-gradient(180deg,#02070f_0%,#07111d_42%,#040810_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(62,183,255,0.14),transparent_18%),radial-gradient(circle_at_bottom,rgba(0,153,255,0.08),transparent_24%)]" />
      <div className="relative flex items-center justify-between border-b border-cyan-400/15 bg-[linear-gradient(180deg,rgba(4,13,23,0.92),rgba(4,11,19,0.72))] px-6 py-4 backdrop-blur-md">
        <div>
          <div className="text-[clamp(18px,1.4vw,28px)] font-semibold tracking-[0.06em] text-slate-50">工业级数字孪生展馆 · Three.js 实时渲染</div>
          <div className="mt-1 text-sm text-cyan-100/72">{titleText} · 展会 {exhibitionId} · 冷光金属质感工业场景</div>
        </div>
        <div className="flex items-center gap-3 text-sm text-sky-100/80">
          <div className="rounded-full border border-cyan-300/15 bg-white/5 px-3 py-2 shadow-[inset_0_0_20px_rgba(90,185,255,0.08)]">
            <span className="text-sky-100/70">当前展厅：</span>
            <span className="text-cyan-100">{hallId === 'all' ? '全部' : hallId}</span>
          </div>
          <button
            type="button"
            className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-cyan-100 shadow-[0_0_24px_rgba(61,214,208,0.14)] transition hover:border-cyan-200/35 hover:bg-cyan-300/15"
            onClick={() => window.location.assign(window.location.pathname + window.location.search.replace(/([?&])view=hall3d(&|$)/, '$1').replace(/[?&]$/, ''))}
          >
            返回大屏
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(4,12,20,0.98),rgba(7,22,38,0.95))] shadow-[0_0_50px_rgba(0,140,255,0.18),inset_0_0_40px_rgba(52,169,255,0.08)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(44,178,255,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_26%,rgba(0,0,0,0.08))]" />
          <div ref={chartRef} className="relative h-full min-h-[560px] w-full" />
          {!booths.length && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center text-sky-100/60">
              请选择一个展厅查看工业级数字孪生展馆
            </div>
          )}
        </div>

        <aside className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,18,29,0.92),rgba(4,11,18,0.96))] p-4 shadow-[inset_0_0_34px_rgba(61,214,208,0.06)] backdrop-blur-md">
          <div className="text-xs uppercase tracking-[0.34em] text-sky-100/45">Real-time Telemetry</div>
          <div className="mt-3 text-2xl font-semibold text-white">{selectedBooth?.booth_no || '—'}</div>
          <div className="mt-1 text-sm text-sky-100/70">{selectedBooth?.exhibitor || '悬停或点击展位查看'}</div>

          <div className="mt-6 space-y-3 text-sm text-sky-50/80">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[inset_0_0_22px_rgba(61,214,208,0.05)]">
              <div className="text-white/55">展位数量</div>
              <div className="mt-1 text-lg font-medium text-cyan-200">{boothCount}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[inset_0_0_22px_rgba(61,214,208,0.05)]">
              <div className="text-white/55">画布尺寸</div>
              <div className="mt-1 text-lg font-medium text-cyan-200">{imageWidth} × {imageHeight}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[inset_0_0_22px_rgba(61,214,208,0.05)]">
              <div className="text-white/55">展馆尺度</div>
              <div className="mt-1 text-lg font-medium text-cyan-200">{hallScaleLabel}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[inset_0_0_22px_rgba(61,214,208,0.05)]">
              <div className="text-white/55">交互</div>
              <div className="mt-1 leading-6 text-sky-100/80">当前为俯瞰总览视角，悬停展位更新右侧信息，适合工业孪生监控与展位总览。</div>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 shadow-[0_0_28px_rgba(61,214,208,0.08)]">
              <div className="text-white/55">当前展位标签</div>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-cyan-50">{boothLabel}</pre>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Hall3D;
