import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export default function QRCodeDisplay({ value, size = 220 }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: '#1a5276', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }).catch(err => setError(err.message));
  }, [value, size]);

  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}
      aria-label="Prescription QR Code"
    />
  );
}
