import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { prescriptionApi } from '../api/prescriptions';
import { useAuth } from '../components/AuthContext';
import QRCodeDisplay from '../components/QRCodeDisplay';

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.97rem', color: 'var(--color-text)' }}>{value}</div>
    </div>
  );
}

export default function PrescriptionDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [rx, setRx] = useState(null);
  const [qrPayload, setQrPayload] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    prescriptionApi.get(id, token)
      .then(d => {
        setRx(d.prescription);
        setQrPayload(JSON.stringify({ id: d.prescription.id, hash: d.prescription.hash }));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  function handlePrint() {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const w = window.open('', '_blank');
    w.document.write(`
      <!doctype html><html><head>
        <title>QRypticRx Prescription</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; color: #1c2833; padding: 2rem; }
          .print-header { border-bottom: 2px solid #1a5276; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
          .print-header h1 { color: #1a5276; font-size: 1.5rem; }
          .field { margin-bottom: 0.9rem; }
          .field-label { font-size: 0.75rem; font-weight: 700; color: #5d6d7e; text-transform: uppercase; letter-spacing: 0.05em; }
          .field-value { font-size: 0.97rem; margin-top: 0.15rem; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }
          table.rx-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-top: 0.5rem; }
          table.rx-table th { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 2px solid #1a5276; }
          table.rx-table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #dce3ec; }
          .qr-section { text-align: center; margin-top: 1.5rem; }
          canvas { border: 1px solid #dce3ec; border-radius: 6px; }
          .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #dce3ec; font-size: 0.78rem; color: #5d6d7e; text-align: center; }
        </style>
      </head><body>${printContent}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  }

  async function handleDownloadPDF() {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const imgH = (canvas.height * pageW) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgH);
    pdf.save(`QRypticRx-${rx.id.slice(0, 8)}.pdf`);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Loading…</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!rx) return null;

  const statusColors = { active: 'badge-active', dispensed: 'badge-dispensed', expired: 'badge-expired' };

  const medicines = rx.items || [];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/doctor" style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>← Back to Dashboard</Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>Prescription Details</h1>
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button onClick={handlePrint} className="btn btn-secondary btn-sm">Print</button>
            <button onClick={handleDownloadPDF} className="btn btn-secondary btn-sm">Download PDF</button>
          </div>
        </div>
      </div>

      <div ref={printRef}>
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
                QRypticRx E-Prescription
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                ID: <code style={{ background: 'var(--color-bg)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.78rem' }}>{rx.id}</code>
              </div>
            </div>
            <span className={`badge ${statusColors[rx.status] || ''}`}>{rx.status}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem 1.5rem', marginBottom: '1.25rem' }}>
            <Field label="Patient Name" value={rx.patient_name} />
            <Field label="Patient IC / ID" value={rx.patient_ic} />
            <Field label="Prescribing Doctor" value={rx.doctor_name} />
            <Field label="Date Issued" value={new Date(rx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <Field label="Valid Until" value={new Date(rx.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Medicines
            </div>
            <table className="rx-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.6rem', borderBottom: '2px solid var(--color-border)' }}>Medicine</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.6rem', borderBottom: '2px solid var(--color-border)' }}>Dosage</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.6rem', borderBottom: '2px solid var(--color-border)' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map(m => (
                  <React.Fragment key={m.id}>
                    <tr>
                      <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--color-border)' }}>{m.medication}</td>
                      <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--color-border)' }}>{m.dosage}</td>
                      <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--color-border)' }}>{m.duration_days} {m.duration_days === 1 ? 'day' : 'days'}</td>
                    </tr>
                    {m.notes && (
                      <tr>
                        <td colSpan={3} style={{ padding: '0.1rem 0.6rem 0.5rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                          ↳ {m.notes}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Verification QR Code
              </div>
              {qrPayload && <QRCodeDisplay value={qrPayload} size={180} />}
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                SHA-256 Hash
              </div>
              <code style={{ display: 'block', fontSize: '0.72rem', wordBreak: 'break-all', background: 'var(--color-bg)', padding: '0.5rem 0.6rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
                {rx.hash}
              </code>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.6rem', lineHeight: 1.5 }}>
                Pharmacist scans the QR code to instantly verify authenticity and retrieve full prescription details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
