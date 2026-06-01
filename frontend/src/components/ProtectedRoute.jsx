import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, redirectFor } from './AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={redirectFor(user.role)} replace />;
  }

  return children;
}
