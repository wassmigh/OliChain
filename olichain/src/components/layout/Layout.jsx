import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Droplets, LayoutDashboard, Leaf, Factory, Truck, Store, ShieldCheck, Wallet } from 'lucide-react';
import { useWeb3 } from '../../hooks/index';

export default function Layout() {
  const { account, connectWallet } = useWeb3();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: <Droplets size={20} />, label: 'Accueil' },
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/producer', icon: <Leaf size={20} />, label: 'Producteur' },
    { path: '/mill', icon: <Factory size={20} />, label: 'Moulin' },
    { path: '/transport', icon: <Truck size={20} />, label: 'Transport' },
    { path: '/distributor', icon: <Store size={20} />, label: 'Distributeur' },
    { path: '/admin', icon: <ShieldCheck size={20} />, label: 'Admin' },
  ];

  const getPageTitle = () => {
    const currentItem = navItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.label : 'OliChain Portal';
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <div className="brand-icon">
            <Droplets size={24} />
          </div>
          OliChain
        </NavLink>

        <nav className="nav-menu">
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <h2 className="page-title">{getPageTitle()}</h2>
          <button className="wallet-btn" onClick={connectWallet}>
            <Wallet size={18} />
            {account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : 'Connect Wallet'}
          </button>
        </header>
        
        <div className="animate-fade-in" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
