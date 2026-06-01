import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
import { prescriptionApi } from '../api/prescriptions';
import { useAuth } from '../components/AuthContext';

function RxDetails({ rx, onDispenseItem, dispensingId, disabled }) {
  const fields = [
    ['Patient Name', rx.patient_name],
    ['Patient IC / ID', rx.patient_ic],
    ['Prescribing Doctor', rx.doctor_name],
    ['Date Issued', new Date(rx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
  ];
  const medicines = rx.medicines || [];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.85rem 1.25rem', marginBottom: '1rem' }}>
        {fields.map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
              {label}
            </div>
            <div style={{ fontSize: '0.95rem' }}>{value}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
          Medicines
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.4rem 0.5rem', borderBottom: '2px solid var(--color-border)' }}>Medicine</th>
              <th style={{ textAlign: 'left', padding: '0.4rem 0.5rem', borderBottom: '2px solid var(--color-border)' }}>Dosage</th>
              <th style={{ textAlign: 'left', padding: '0.4rem 0.5rem', borderBottom: '2px solid var(--color-border)' }}>Duration</th>
              {onDispenseItem && <th style={{ padding: '0.4rem 0.5rem', borderBottom: '2px solid var(--color-border)' }} />}
            </tr>
          </thead>
          <tbody>
            {medicines.map(m => (
              <tr key={m.id}>
                <td style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                  {m.medication}
                  {m.notes ? <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>↳ {m.notes}</div> : null}
                </td>
                <td style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--color-border)' }}>{m.dosage}</td>
                <td style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--color-border)' }}>{m.duration_days} {m.duration_days === 1 ? 'day' : 'days'}</td>
                {onDispenseItem && (
                  <td style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>
                    {m.status === 'dispensed' ? (
                      <span className="badge badge-dispensed">dispensed</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        disabled={disabled || dispensingId === m.id}
                        onClick={() => onDispenseItem(m.id)}
                      >
                        {dispensingId === m.id ? 'Recording…' : 'Dispense'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ScanVerify() {
  const { token, user } = useAuth();
  const [mode, setMode] = useState('idle'); // idle | scanning | result | dispensed
  const [verifyResult, setVerifyResult] = useState(null);
  const [error, setError] = useState('');
  const [dispensing, setDispensing] = useState(false);
  const [dispensingId, setDispensingId] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  async function processQRPayload(raw) {
    stopCamera();
    setError('');
    setMode('result');
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.id || !parsed.hash) throw new Error('Invalid QR code — not a QRypticRx prescription code');
      const data = await prescriptionApi.verify({ id: parsed.id, hash: parsed.hash }, token);
      setVerifyResult(data);
    } catch (err) {
      setError(err.message);
      setMode('idle');
    }
  }

  function tickScan() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tickScan);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code) {
      processQRPayload(code.data);
    } else {
      rafRef.current = requestAnimationFrame(tickScan);
    }
  }

  async function startCamera() {
    setError('');
    setVerifyResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setMode('scanning');
      rafRef.current = requestAnimationFrame(tickScan);
    } catch {
      setError('Camera access denied. Please use the Upload QR option instead.');
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
      URL.revokeObjectURL(url);
      if (!code) {
        setError('No QR code found in the uploaded image. Please try a clearer image.');
        return;
      }
      processQRPayload(code.data);
    };
    img.onerror = () => setError('Failed to load image');
    img.src = url;
    e.target.value = '';
  }

  async function handleDispenseItem(itemId) {
    if (!verifyResult?.prescription) return;
    setDispensing(true);
    setDispensingId(itemId);
    setError('');
    try {
      const result = await prescriptionApi.dispenseItem(verifyResult.prescription.id, itemId, token);
      setVerifyResult(prev => {
        const medicines = prev.prescription.medicines.map(m =>
          m.id === itemId ? { ...m, status: 'dispensed' } : m
        );
        return { ...prev, prescription: { ...prev.prescription, medicines } };
      });
      if (result.prescription_status === 'dispensed') {
        setMode('dispensed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDispensing(false);
      setDispensingId(null);
    }
  }

  function reset() {
    stopCamera();
    setMode('idle');
    setVerifyResult(null);
    setError('');
    setDispensingId(null);
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <Link to="/pharmacist" style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>← Back to Dashboard</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.5rem' }}>
          Verify Prescription
        </h1>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

      {mode === 'dispensed' && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem', fontSize: '1rem', fontWeight: 600 }}>
          ✅ Prescription dispensed successfully. Audit log recorded.
        </div>
      )}

      {(mode === 'idle' || mode === 'scanning') && (
        <div className="card">
          <div
            style={{
              position: 'relative',
              background: '#000',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              marginBottom: '1.25rem',
              minHeight: 240,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <video
              ref={videoRef}
              style={{ width: '100%', display: mode === 'scanning' ? 'block' : 'none', borderRadius: 'var(--radius)' }}
              muted
              playsInline
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {mode !== 'scanning' && (
              <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
                <div>Camera preview will appear here</div>
              </div>
            )}
            {mode === 'scanning' && (
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 180, height: 180,
                border: '2px solid rgba(255,255,255,0.6)',
                borderRadius: '12px',
                pointerEvents: 'none',
              }} />
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {mode !== 'scanning' ? (
              <button onClick={startCamera} className="btn btn-primary" style={{ flex: 1 }}>
                📷 Start Camera Scan
              </button>
            ) : (
              <button onClick={() => { stopCamera(); setMode('idle'); }} className="btn btn-danger" style={{ flex: 1 }}>
                Stop Camera
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              📁 Upload QR Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
        </div>
      )}

      {(mode === 'result' || mode === 'dispensed') && verifyResult && (
        <div>
          {verifyResult.valid ? (
            <div className="card" style={{ borderLeft: '4px solid var(--color-success)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.3rem' }}>✅</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '1rem' }}>Prescription Valid</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Digital signature and hash verified — authentic, signed by the prescribing doctor, and unmodified</div>
                </div>
              </div>
              <RxDetails
                rx={verifyResult.prescription}
                onDispenseItem={handleDispenseItem}
                dispensingId={dispensingId}
                disabled={dispensing}
              />
              {(verifyResult.prescription.medicines || []).every(m => m.status === 'dispensed') ? (
                <div style={{ marginTop: '1.25rem' }}>
                  <div className="alert alert-success" style={{ marginBottom: '1rem', fontWeight: 600 }}>
                    ✅ All medicines dispensed. Audit logs recorded.
                  </div>
                  <button onClick={reset} className="btn btn-primary">Scan Another</button>
                </div>
              ) : (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                  <button onClick={reset} className="btn btn-secondary">Cancel</button>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ borderLeft: `4px solid var(--color-danger)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.3rem' }}>🚫</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '1rem' }}>
                    {verifyResult.reason?.includes('tamper') ? 'Tampered Prescription Detected' :
                     verifyResult.reason?.includes('ignature') ? 'Signature Verification Failed' :
                     verifyResult.reason?.includes('dispensed') ? 'Already Dispensed' :
                     verifyResult.reason?.includes('expired') ? 'Prescription Expired' : 'Prescription Invalid'}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    {verifyResult.reason}
                  </div>
                </div>
              </div>
              {verifyResult.prescription && <RxDetails rx={verifyResult.prescription} />}
              <div style={{ marginTop: '1.25rem' }}>
                <button onClick={reset} className="btn btn-secondary">Scan Another</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
