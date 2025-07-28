// src/components/ParticleBackground.tsx
'use client';

import { useEffect, useRef } from 'react';

// --- Tipe Data untuk Partikel ---
// Mendefinisikan class di luar useEffect agar lebih rapi
class Particle {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  size: number;
  color: string;
  ctx: CanvasRenderingContext2D; // Partikel perlu tahu context untuk menggambar

  constructor(x: number, y: number, directionX: number, directionY: number, size: number, color: string, ctx: CanvasRenderingContext2D) {
    this.x = x;
    this.y = y;
    this.directionX = directionX;
    this.directionY = directionY;
    this.size = size;
    this.color = color;
    this.ctx = ctx; // Simpan context
  }

  draw() {
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
    this.ctx.fillStyle = this.color;
    this.ctx.fill();
  }

  update(canvas: HTMLCanvasElement) {
    if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
    if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
    this.x += this.directionX;
    this.y += this.directionY;
    this.draw();
  }
}


export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Guard clause untuk canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // Guard clause untuk context

    let particlesArray: Particle[];
    let animationFrameId: number;

    const init = () => {
      particlesArray = [];
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      let numberOfParticles = (canvas.height * canvas.width) / 12000;
      for (let i = 0; i < numberOfParticles; i++) {
        let size = Math.random() * 1.5 + 1;
        let x = Math.random() * (window.innerWidth - size * 2) + size * 2;
        let y = Math.random() * (window.innerHeight - size * 2) + size * 2;
        let directionX = Math.random() * 0.4 - 0.2;
        let directionY = Math.random() * 0.4 - 0.2;
        let color = 'rgba(229, 231, 235, 0.5)';
        particlesArray.push(new Particle(x, y, directionX, directionY, size, color, ctx));
      }
    };

    const connect = () => {
      let opacityValue = 1;
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          let distance = (particlesArray[a].x - particlesArray[b].x) ** 2 + (particlesArray[a].y - particlesArray[b].y) ** 2;
          if (distance < (canvas.width / 7) * (canvas.height / 7)) {
            opacityValue = 1 - distance / 20000;
            ctx.strokeStyle = `rgba(164, 126, 101, ${opacityValue})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particlesArray.forEach(p => p.update(canvas));
      connect();
    };

    const handleResize = () => {
      init();
    };

    init();
    animate();
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []); // Dependensi kosong agar hanya berjalan sekali

  return <canvas ref={canvasRef} id="particle-canvas" className="fixed top-0 left-0 w-full h-full z-0"></canvas>;
}
