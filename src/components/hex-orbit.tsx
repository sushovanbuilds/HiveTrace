"use client";

import { useEffect, useRef } from "react";

type Vec3 = { x: number; y: number; z: number };

/**
 * Dependency-free port of the Stitch three.js honeycomb hero.
 * A flower of translucent hexagons rotating in 3D (projected to 2D canvas),
 * wireframe edges, floating particle field and mouse parallax.
 */
export function HexOrbit({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Building hex verts in local XY plane (pointing +Z).
    const hexVerts = (r: number) => {
      const v: Vec3[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        v.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0 });
      }
      return v;
    };

    // 7-hex flower: center + ring of 6.
    const hexes = [
      { v: hexVerts(1), tx: 0, ty: 0, rz: 0.4 },
    ];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      hexes.push({
        v: hexVerts(1),
        tx: Math.cos(a) * 1.85,
        ty: Math.sin(a) * 1.85,
        rz: 0.4,
      });
    }

    // Particles.
    const particleCount = 70;
    const particles: Vec3[] = [];
    const pSpeed: number[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
        z: (Math.random() - 0.5) * 8,
      });
      pSpeed.push(0.001 + Math.random() * 0.003);
    }

    // Projection.
    const fov = 75;
    const FOCAL = (h: number) => h / 2 / Math.tan(((fov / 2) * Math.PI) / 180);

    const project = (p: Vec3, focal: number): { x: number; y: number; s: number } => {
      const z = p.z + 5;
      const s = focal / z;
      return { x: p.x * s + width / 2, y: -p.y * s + height / 2, s };
    };

    const rotY = (p: Vec3, t: number): Vec3 => ({
      x: p.x * Math.cos(t) + p.z * Math.sin(t),
      y: p.y,
      z: -p.x * Math.sin(t) + p.z * Math.cos(t),
    });
    const rotX = (p: Vec3, t: number): Vec3 => ({
      x: p.x,
      y: p.y * Math.cos(t) - p.z * Math.sin(t),
      z: p.y * Math.sin(t) + p.z * Math.cos(t),
    });

    let mouseX = 0;
    let mouseY = 0;
    const onMouse = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    let t = 0;

    const drawHex = (verts2d: Array<{ x: number; y: number }>, fillOpacity: number, strokeOpacity: number, bright: boolean) => {
      ctx.beginPath();
      ctx.moveTo(verts2d[0].x, verts2d[0].y);
      for (let i = 1; i < verts2d.length; i++) ctx.lineTo(verts2d[i].x, verts2d[i].y);
      ctx.closePath();
      ctx.fillStyle = bright
        ? `rgba(255,184,0,${fillOpacity})`
        : `rgba(124,88,0,${fillOpacity * 0.7})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,184,0,${strokeOpacity})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.004;
      ctx.clearRect(0, 0, width, height);
      const focal = FOCAL(height);

      const rotT = t;
      const tiltX = 0.35 + mouseY * 0.15;
      const parallaxX = mouseX * 24;
      const parallaxY = mouseY * 18;

      // Star field.
      for (const p of particles) {
        let r = rotY(p, t * 2);
        r = rotX(r, 0.4);
        const pr = project(r, focal);
        if (pr.s <= 0) continue;
        const twinkle = 0.5 + 0.5 * Math.sin(t * 6 + p.x * 10);
        ctx.beginPath();
        ctx.arc(pr.x + parallaxX * 0.2, pr.y + parallaxY * 0.2, Math.max(0.4, 1.2 * (pr.s / 6)), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124,88,0,${0.25 + twinkle * 0.35})`;
        ctx.fill();
      }

      // Light glow through flower.
      ctx.beginPath();
      ctx.arc(width / 2 + parallaxX, height / 2 + parallaxY, 170, 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(width / 2 + parallaxX, height / 2 + parallaxY, 10, width / 2 + parallaxX, height / 2 + parallaxY, 220);
      glow.addColorStop(0, "rgba(255,184,0,0.16)");
      glow.addColorStop(1, "rgba(255,184,0,0)");
      ctx.fillStyle = glow;
      ctx.fill();

      // Hex flower — depth-sort.
      const depthSorted = hexes
        .map((h, i) => ({ h, i, depth: Math.sin(rotT + h.tx * 0.4) }))
        .sort((a, b) => b.depth - a.depth);

      for (const { h, i, depth } of depthSorted) {
        const pts = h.v.map((vtx) => {
          let p = { ...vtx };
          p = rotX(p, h.rz);
          p = { x: p.x + h.tx, y: p.y + h.ty, z: p.z };
          p = rotY(p, rotT);
          p = rotX(p, tiltX);
          return project(p, focal);
        });
        const front = depth > 0;
        const fill = front ? 0.16 : 0.07;
        const stroke = front ? 0.5 : 0.22;
        const pts2d = pts.map((p) => ({ x: p.x + parallaxX, y: p.y + parallaxY }));
        drawHex(pts2d, fill, stroke, front);

        // Edge spark at each vertex.
        if (front) {
          for (const p of pts) {
            ctx.beginPath();
            ctx.arc(p.x + parallaxX, p.y + parallaxY, 1.6, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,184,0,0.9)";
            ctx.fill();
          }
        }

        // Connector line from center node to ring (signal feel).
        if (i !== 0 && depth > 0.25) {
          const c = pts[0];
          ctx.beginPath();
          ctx.moveTo(width / 2 + parallaxX, height / 2 + parallaxY);
          ctx.lineTo(c.x + parallaxX, c.y + parallaxY);
          ctx.strokeStyle = "rgba(124,88,0,0.18)";
          ctx.setLineDash([2, 6]);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Pulsing core node.
      const pulse = 0.55 + 0.45 * Math.sin(t * 3);
      ctx.beginPath();
      ctx.arc(width / 2 + parallaxX, height / 2 + parallaxY, 5 + pulse * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,184,0,${0.5 + pulse * 0.4})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width / 2 + parallaxX, height / 2 + parallaxY, 5 + pulse * 3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(124,88,0,${0.5 - pulse * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className={`h-full w-full ${className}`} aria-label="Animated honeycomb traceability network" />;
}