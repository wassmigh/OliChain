import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Web3Provider } from "./context/Web3Context";
import { useWeb3 } from "./hooks/index";

import Layout from "./components/layout/Layout";

import { HomePage, DashboardPage, ProducerPage } from "./pages/index";
import { MillPage, TransportPage, DistributorPage, AdminPage , TrackPage} from "./pages/other-pages";

import './App.css';

function PrivateRoute({ children, requiredRole }) {
  const { account, role } = useWeb3();
  if (!account) return <Navigate to="/" replace />;
  if (requiredRole && role !== requiredRole && role !== "admin")
    return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Web3Provider>
      <BrowserRouter>
        <Routes>
          <Route path="/track/:lotId" element={<TrackPage />} />
          <Route element={<Layout />}>
            <Route path="/"            element={<HomePage />} />
            <Route path="/dashboard"   element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/producer"    element={<PrivateRoute requiredRole="producer"><ProducerPage /></PrivateRoute>} />
            <Route path="/mill"        element={<PrivateRoute requiredRole="mill"><MillPage /></PrivateRoute>} />
            <Route path="/transport"   element={<PrivateRoute requiredRole="transport"><TransportPage /></PrivateRoute>} />
            <Route path="/distributor" element={<PrivateRoute requiredRole="distributor"><DistributorPage /></PrivateRoute>} />
            <Route path="/admin"       element={<PrivateRoute requiredRole="admin"><AdminPage /></PrivateRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Web3Provider>
  );
}
