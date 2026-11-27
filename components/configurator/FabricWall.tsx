"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Fabric, FurnitureModel, TextureSize } from "@/lib/types";
import type { PreparedModel } from "@/lib/three/prepare-model";
import { FurnitureObject } from "@/components/three/FurnitureObject";
import { StudioLights } from "@/components/three/Stage";
import { showPrimary } from "@/lib/three/layers";

// The fabric wall (Showroom package, job 12): up to 30 fabrics on the open
// model, side by side. Each tile is drawn by the same 3D code as the stage
// (same model, same material and scale), one after the other in a small
// canvas of its own, and kept for the visit (WALL_CACHE). Tiles appear as they
// are made; the screen stays responsive (one tile per frame or two).

export const WALL_MAX = 30;
const TILE = 320;
/** Tiles already made in this visit: model slug + fabric code → JPEG data URL. */
const WALL_CACHE = new Map<string, string>();
const key = (m: FurnitureModel, f: Fabric) => `${m.slug}:${m.kurulum ?? ""}:${f.code}`;

/** Points the camera at the piece from the front, a little to the right and above, as the stage first shows it. */
function Framer({ prepared, onFramed }: { prepared: PreparedModel | null; onFramed: () => void }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!prepared) return;
    const s = prepared.size;
    const r = Math.max(s.x, s.z, s.y) * 0.5;
    const dist = r / Math.sin(((camera.fov / 2) * Math.PI) / 180) * 1.05;
    const target = new THREE.Vector3(0, s.y * 0.42, 0);
    camera.position.copy(target).add(new THREE.Vector3(0.45, 0.42, 1).normalize().multiplyScalar(dist));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    invalidate();
    onFramed();
  }, [prepared, camera, invalidate, onFramed]);
  return null;
}

/** Reads the canvas once the current fabric is on and framed. */
function Grabber({ ready, onGrab }: { ready: boolean; onGrab: (url: string) => void }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (!ready) return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const s = get();
        s.gl.render(s.scene, s.camera);
        onGrab(s.gl.domElement.toDataURL("image/jpeg", 0.82));
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [ready, get, onGrab]);
  return null;
}

export function FabricWall({ model, fabrics, textureSize, title, onOpen, onCompare, onClose }: { model: FurnitureModel; fabrics: Fabric[]; textureSize: TextureSize; title: string; onOpen: (f: Fabric) => void; onCompare: (a: Fabric, b: Fabric) => void; onClose: () => void }) {
  const list = fabrics.slice(0, WALL_MAX);
  const [tiles, setTiles] = useState<Record<string, string>>(() => Object.fromEntries(list.flatMap((f) => (WALL_CACHE.has(key(model, f)) ? [[f.code, WALL_CACHE.get(key(model, f))!]] : []))));
  const todo = list.filter((f) => !tiles[f.code]);
  const current = todo[0] ?? null;
  const [prepared, setPrepared] = useState<PreparedModel | null>(null);
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [framed, setFramed] = useState(false);
  const [picked, setPicked] = useState<Fabric[]>([]);
  const started = useRef(0);
  useEffect(() => {
    started.current = performance.now();
  }, []);
  const [took, setTook] = useState<number | null>(null);

  const onPrepared = useCallback((p: PreparedModel) => setPrepared(p), []);
  const onShown = useCallback((code: string) => setShownCode(code), []);
  const onFramed = useCallback(() => setFramed(true), []);
  const onGrab = useCallback(
    (url: string) => {
      if (!current) return;
      WALL_CACHE.set(key(model, current), url);
      setTiles((t) => ({ ...t, [current.code]: url }));
    },
    [current, model],
  );
  useEffect(() => {
    if (!current && took === null) setTook((performance.now() - started.current) / 1000);
  }, [current, took]);

  const tap = (f: Fabric) => {
    if (picked.some((p) => p.code === f.code)) return setPicked(picked.filter((p) => p.code !== f.code));
    const next = [...picked, f];
    if (next.length === 2) return onCompare(next[0], next[1]);
    setPicked(next);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Kumaş duvarı" className="fixed inset-0 z-50 flex flex-col bg-kirik-beyaz text-antrasit">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-cizgi px-6 py-4 sm:px-8">
        <div>
          <h2 className="font-display text-[28px]">Kumaş duvarı</h2>
          <p className="text-[14px] text-antrasit-70">
            {model.name} · {title} · {list.length} kumaş. Bir kareye dokunun: 3D&apos;de açılır. İki kare seçin: karşılaştırma.
          </p>
        </div>
        <span className="text-[13px] text-antrasit-70" aria-live="polite" data-testid="duvar-durum">
          {current ? `Hazırlanıyor: ${list.length - todo.length} / ${list.length}` : `Hazır${took !== null ? ` (${took.toFixed(1)} sn)` : ""}`}
        </span>
        <button type="button" onClick={onClose} className="min-h-12 rounded-full border border-cizgi bg-white px-6 text-[16px]">
          Kapat
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8">
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6" aria-label="Kumaşlar">
          {list.map((f) => {
            const on = picked.some((p) => p.code === f.code);
            return (
              <li key={f.code}>
                <button
                  type="button"
                  onClick={() => tap(f)}
                  aria-pressed={on}
                  aria-label={`${f.code}, ${f.colorName}`}
                  className={`flex w-full flex-col overflow-hidden rounded-2xl border bg-white text-left ${on ? "border-antrasit ring-2 ring-antrasit" : "border-cizgi"}`}
                  data-testid="duvar-kare"
                >
                  {tiles[f.code] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tiles[f.code]} alt="" className="aspect-square w-full object-cover" data-hazir="" />
                  ) : (
                    <span className="aspect-square w-full animate-pulse" style={{ background: f.texture.avgColor }} />
                  )}
                  <span className="px-2 py-1.5 text-[13px]" translate="no">
                    {f.code} <span className="text-antrasit-50">{f.colorName}</span>
                  </span>
                </button>
                {on && <span className="sr-only">seçildi</span>}
              </li>
            );
          })}
        </ul>
        {picked.length === 1 && <p className="mt-3 text-[14px] text-antrasit-70">{picked[0].code} seçildi. Karşılaştırmak için bir kare daha seçin, ya da aynı kareye tekrar dokunun.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {picked.length === 1 && (
            <button type="button" onClick={() => onOpen(picked[0])} className="min-h-12 rounded-full bg-antrasit px-6 text-[15px] text-kagit">
              {picked[0].code} 3D&apos;de aç
            </button>
          )}
        </div>
      </div>
      {/* the tile maker: the stage's own model and material, drawn small, off to the side */}
      {current && (
        <div aria-hidden="true" className="pointer-events-none fixed -left-[9999px] top-0" style={{ width: TILE, height: TILE }}>
          <Canvas
            frameloop="demand"
            dpr={1}
            camera={{ fov: 30, near: 0.05, far: 60, position: [0, 1.2, 5] }}
            gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.NeutralToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
            onCreated={(s) => {
              showPrimary(s.camera);
              s.gl.setClearColor("#f2eee7", 1);
            }}
          >
            <StudioLights ambient={1} />
            <Suspense fallback={null}>
              <FurnitureObject model={model} fabric={current} textureSize={textureSize} onPrepared={onPrepared} onFabricShown={onShown} />
            </Suspense>
            <Framer prepared={prepared} onFramed={onFramed} />
            <Grabber key={current.code} ready={framed && shownCode === current.code} onGrab={onGrab} />
          </Canvas>
        </div>
      )}
    </div>
  );
}
