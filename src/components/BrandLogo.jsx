import { useEffect, useState } from 'react';

// The brand's two logos (English and Marathi/Hindi). Every `interval` ms the logo flips over to the other one.
const FRONT = { src: '/logo-red-en-600.png' };
const BACK = { src: '/logo-red-hi-600.png' };
const ASPECT = 1236 / 586; // width / height of both logo files

export default function BrandLogo({ height = 44, interval = 10000, className = '' }) {
  // `turn` only counts up, so the logo always keeps flipping the same way instead of swinging back.
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTurn((t) => t + 1), interval);
    return () => clearInterval(id);
  }, [interval]);

  return (
    <span className={`brand-flip ${className}`} style={{ width: Math.round(height * ASPECT), height }} role="img" aria-label="Shinde Shoes">
      <span className="brand-flip-inner" style={{ transform: `rotateY(${turn * 180}deg)` }}>
        <img src={FRONT.src} alt="" className="brand-face" draggable="false" />
        <img src={BACK.src} alt="" className="brand-face brand-face-back" draggable="false" />
      </span>
    </span>
  );
}
