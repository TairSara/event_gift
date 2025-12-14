import { useEffect, useState } from 'react';
import './Confetti.css';

export default function Confetti() {
  const [confetti, setConfetti] = useState([]);
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Create confetti pieces
    const pieces = [];
    const colors = ['#4A5236', '#6B7F3D', '#8BA644', '#F5D547', '#FFE066', '#FFEB99'];

    for (let i = 0; i < 80; i++) {
      pieces.push({
        id: i,
        left: Math.random() * 100,
        animationDelay: Math.random() * 3,
        animationDuration: 3 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 8,
        rotation: Math.random() * 360
      });
    }

    setConfetti(pieces);

    // Hide confetti after 5 seconds
    const timer = setTimeout(() => {
      setShow(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="confetti-container">
      {confetti.map(piece => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.animationDelay}s`,
            animationDuration: `${piece.animationDuration}s`,
            backgroundColor: piece.color,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            transform: `rotate(${piece.rotation}deg)`
          }}
        />
      ))}
    </div>
  );
}
