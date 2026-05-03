import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DoctorDashboard from './pages/DoctorDashboard';
import NewPrescription from './pages/NewPrescription';
import PrescriptionDetail from './pages/PrescriptionDetail';
import PharmacistDashboard from './pages/PharmacistDashboard';
import ScanVerify from './pages/ScanVerify';
import LandingPage from './pages/LandingPage';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'doctor') return <Navigate to="/doctor" replace />;
  return <Navigate to="/pharmacist" replace />;
}

export default function App() {
  return (
    <BrowserRouter basename="/QRypticRx">
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/about" element={<LandingPage />} />

            <Route path="/doctor" element={
              <ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>
            } />
            <Route path="/doctor/new" element={
              <ProtectedRoute role="doctor"><NewPrescription /></ProtectedRoute>
            } />
            <Route path="/doctor/prescription/:id" element={
              <ProtectedRoute role="doctor"><PrescriptionDetail /></ProtectedRoute>
            } />

            <Route path="/pharmacist" element={
              <ProtectedRoute role="pharmacist"><PharmacistDashboard /></ProtectedRoute>
            } />
            <Route path="/pharmacist/scan" element={
              <ProtectedRoute role="pharmacist"><ScanVerify /></ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
