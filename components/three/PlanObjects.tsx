"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import type { RoomSpec } from "@/lib/room/spec";
import { decorRect, DECOR_LABELS, DECOR_START, fixtureRect, FIXTURE_LABELS, type Decor, type Fixture } from "@/lib/oda/plan";

// The room plan's fixed things and decor (job 9), drawn as plain shapes: a
// door and a window on their wall, a column and a radiator standing out of
// it, a rug, a coffee table, a TV unit and a curtain. Generic shapes in quiet
// colours, so they never read as products. In the top plan each is labelled.

const COLOURS = { kapi: "#8a6f58", pencere: "#bcd3df", kolon: "#d9d4cb", radyator: "#f3f1ec", hali: "#cbbda6", sehpa: "#7d6b5a", tv: "#3d3b38", perde: "#e8e0d2" } as const;
const WALL_T = 0.04;

function Box({ x, y, z, w, h, d, color, opacity = 1 }: { x: number; y: number; z: number; w: number; h: number; d: number; color: string; opacity?: number }) {
  return (
    <mesh position={[x, y, z]} castShadow={opacity === 1} receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.85} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function Label({ x, z, y, text }: { x: number; z: number; y: number; text: string }) {
  return (
    <Html position={[x, y, z]} center zIndexRange={[19, 0]} style={{ pointerEvents: "none" }}>
      <span className="whitespace-nowrap rounded-full bg-kagit/90 px-1.5 py-0.5 text-[11px] text-antrasit-70">{text}</span>
    </Html>
  );
}

export function PlanObjects({ room, fixtures, decor, plan }: { room: RoomSpec; fixtures: Fixture[]; decor: Decor[]; plan: boolean }) {
  const height = room.heightCm / 100;
  const items = useMemo(
    () =>
      fixtures.map((f) => {
        const r = fixtureRect(room, f);
        const along = f.wall === "arka" || f.wall === "on";
        const cx = (r.minX + r.maxX) / 2;
        const cz = (r.minZ + r.maxZ) / 2;
        const w = along ? r.maxX - r.minX : Math.max(r.maxX - r.minX, WALL_T);
        const d = along ? Math.max(r.maxZ - r.minZ, WALL_T) : r.maxZ - r.minZ;
        return { f, cx, cz, w, d };
      }),
    [fixtures, room],
  );
  return (
    <group name="oda-plani">
      {items.map(({ f, cx, cz, w, d }) => {
        const label = `${FIXTURE_LABELS[f.kind]} ${f.widthCm} cm`;
        if (f.kind === "kapi") return <group key={f.id}><Box x={cx} y={1.05} z={cz} w={w} h={2.1} d={d} color={COLOURS.kapi} />{plan && <Label x={cx} z={cz} y={2.2} text={label} />}</group>;
        if (f.kind === "pencere") return <group key={f.id}><Box x={cx} y={1.55} z={cz} w={w} h={1.3} d={d} color={COLOURS.pencere} opacity={0.75} />{plan && <Label x={cx} z={cz} y={2.2} text={label} />}</group>;
        if (f.kind === "kolon") return <group key={f.id}><Box x={cx} y={height / 2} z={cz} w={w} h={height} d={d} color={COLOURS.kolon} />{plan && <Label x={cx} z={cz} y={height + 0.05} text={label} />}</group>;
        return <group key={f.id}><Box x={cx} y={0.4} z={cz} w={w} h={0.6} d={d} color={COLOURS.radyator} />{plan && <Label x={cx} z={cz} y={0.8} text={label} />}</group>;
      })}
      {decor.map((dec) => {
        const r = decorRect(dec);
        const cx = (r.minX + r.maxX) / 2;
        const cz = (r.minZ + r.maxZ) / 2;
        const w = r.maxX - r.minX;
        const d = r.maxZ - r.minZ;
        const h = DECOR_START[dec.kind].h / 100;
        const label = `${DECOR_LABELS[dec.kind]} ${dec.widthCm}×${dec.depthCm}`;
        return (
          <group key={dec.id}>
            {dec.kind === "hali" ? (
              <mesh position={[cx, 0.006, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[w, d]} />
                <meshStandardMaterial color={COLOURS.hali} roughness={1} />
              </mesh>
            ) : (
              <Box x={cx} y={h / 2} z={cz} w={w} h={h} d={d} color={COLOURS[dec.kind]} opacity={dec.kind === "perde" ? 0.9 : 1} />
            )}
            {plan && <Label x={cx} z={cz} y={Math.max(h, 0.05) + 0.05} text={label} />}
          </group>
        );
      })}
    </group>
  );
}
