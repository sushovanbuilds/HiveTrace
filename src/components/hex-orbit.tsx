"use client";

import { useEffect, useRef } from "react";

type Vec3 = { x: number; y: number; z: number };

/**
 * Dependency-free port of the Stitch three.js honeycomb hero.
 * A flower of seven coplanar hexagons spinning in its own plane (projected
 * to 2D canvas), honey-deep wireframe edges, a fine dust field and a small,
 * bounded pointer tilt — never an unbounded Y-spin, which collapses the
 * honeycomb edge-on into a line.
 */
export function HexOrbit({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    // Pause the animation when the tab is hidden (saves CPU/battery), and
    // render a single static frame for users who prefer reduced motion.
    let visible = document.visibilityState !== "hidden";
    // Pause when the canvas scrolls out of view — the hero animation should
    // never burn CPU while the user reads sections below it.
    let inView = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

    // 7-hex flower: center + ring of 6 — deliberately coplanar. Per-hex tilt
    // was what broke the honeycomb apart into seven separately angled plates.
    const hexes = [
      { v: hexVerts(1), tx: 0, ty: 0 },
    ];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      hexes.push({
        v: hexVerts(1),
        tx: Math.cos(a) * 1.85,
        ty: Math.sin(a) * 1.85,
      });
    }

    // Particles — fine dust, not blobs. Radius is derived from depth and
    // clamped, so a particle near the camera can never balloon into a smear.
    const particleCount = 44;
    const particles: Vec3[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
        z: (Math.random() - 0.5) * 8,
      });
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
    // In-plane spin: keeps the honeycomb facing the viewer at all times.
    const rotZ = (p: Vec3, t: number): Vec3 => ({
      x: p.x * Math.cos(t) - p.y * Math.sin(t),
      y: p.x * Math.sin(t) + p.y * Math.cos(t),
      z: p.z,
    });

    /** Orientation of one point: coplanar spin, then bounded mouse tilt. */
    const place = (p: Vec3, spin: number, tiltX: number, tiltY: number): Vec3 =>
      rotY(rotX(rotZ(p, spin), tiltX), tiltY);

    let mouseX = 0;
    let mouseY = 0;
    const onMouse = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    let t = 0;

    const drawHex = (verts2d: Array<{ x: number; y: number }>, fillOpacity: number, strokeOpacity: number) => {
      ctx.beginPath();
      ctx.moveTo(verts2d[0].x, verts2d[0].y);
      for (let i = 1; i < verts2d.length; i++) ctx.lineTo(verts2d[i].x, verts2d[i].y);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,184,0,${fillOpacity})`;
      ctx.fill();
      // Honey-deep edge — amber strokes disappear on the cream surfaces this
      // canvas is used on, brown ones hold the honeycomb shape.
      ctx.strokeStyle = `rgba(124,88,0,${strokeOpacity})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const draw = () => {
      raf = 0;
      t += 0.004;
      ctx.clearRect(0, 0, width, height);
      const focal = FOCAL(height);

      // Motion is bounded on purpose: the flower only spins in its own plane
      // (it can never turn edge-on and collapse to a line), and the pointer
      // adds a small tilt on top of a fixed base tilt.
      const spin = t * 0.35;
      const tiltX = 0.3 + mouseY * 0.12;
      const tiltY = mouseX * 0.16;
      const parallaxX = mouseX * 18;
      const parallaxY = mouseY * 14;
      const cx = width / 2 + parallaxX;
      const cy = height / 2 + parallaxY;

      // Dust field — 0.6–1.6px, 0.18–0.40 alpha, no smears.
      for (const p of particles) {
        let r = rotZ(p, t * 0.9);
        r = rotX(r, 0.45);
        const pr = project(r, focal);
        if (pr.s <= 0) continue;
        const twinkle = 0.5 + 0.5 * Math.sin(t * 6 + p.x * 10);
        const depthScale = pr.s / focal; // 1 / distance
        const radius = Math.min(1.6, Math.max(0.6, 0.5 + depthScale * 1.1));
        ctx.beginPath();
        ctx.arc(pr.x + parallaxX * 0.2, pr.y + parallaxY * 0.2, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124,88,0,${0.18 + twinkle * 0.22})`;
        ctx.fill();
      }

      // Warm core glow (kept low — it used to wash the honeycomb out).
      const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 190);
      glow.addColorStop(0, "rgba(255,184,0,0.10)");
      glow.addColorStop(1, "rgba(255,184,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Honeycomb — coplanar, depth-sorted so the near half draws last and
      // catches a little more light.
      const placed = hexes.map((h) => ({
        h,
        cz: place({ x: h.tx, y: h.ty, z: 0 }, spin, tiltX, tiltY).z,
      }));
      const zMin = Math.min(...placed.map((p) => p.cz));
      const zMax = Math.max(...placed.map((p) => p.cz));
      placed.sort((a, b) => b.cz - a.cz);

      for (const { h, cz } of placed) {
        const lit = zMax > zMin ? (cz - zMin) / (zMax - zMin) : 0.5;
        const pts = h.v.map((vtx) =>
          project(place({ x: vtx.x + h.tx, y: vtx.y + h.ty, z: vtx.z }, spin, tiltX, tiltY), focal)
        );
        const pts2d = pts.map((p) => ({ x: p.x + parallaxX, y: p.y + parallaxY }));
        drawHex(pts2d, 0.05 + lit * 0.09, 0.26 + lit * 0.32);

        // Vertex nodes — the trace points of the honeycomb, on the lit side.
        if (lit > 0.5) {
          for (const p of pts) {
            ctx.beginPath();
            ctx.arc(p.x + parallaxX, p.y + parallaxY, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(124,88,0,${0.35 + lit * 0.3})`;
            ctx.fill();
          }
        }
      }

      // Pulsing core node.
      const pulse = 0.55 + 0.45 * Math.sin(t * 3);
      const coreR = 4.5 + pulse * 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,184,0,${0.55 + pulse * 0.35})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(124,88,0,${0.45 - pulse * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Keep animating only while the page is visible, the canvas is in the
      // viewport, and motion is wanted.
      if (visible && inView && !reduceMotion) raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      visible = document.visibilityState !== "hidden";
      if (visible && inView && !reduceMotion && raf === 0) draw();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Pause rendering while the hero canvas is scrolled out of view.
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              inView = entries.some((e) => e.isIntersecting);
              if (inView && visible && !reduceMotion && raf === 0) draw();
            },
            { threshold: 0 }
          )
        : null;
    io?.observe(canvas);

    draw();

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className={`h-full w-full ${className}`} aria-label="Animated honeycomb traceability network" />;
}