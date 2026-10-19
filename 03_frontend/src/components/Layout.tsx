import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  const navigate = useNavigate();

  // Tactical Keyboard Shortcuts: F1-F8 Screen Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger if typing in an input field
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) {
        return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          navigate('/dashboard');
          break;
        case 'F2':
          e.preventDefault();
          navigate('/inventory');
          break;
        case 'F3':
          e.preventDefault();
          navigate('/forecast');
          break;
        case 'F4':
          e.preventDefault();
          navigate('/map');
          break;
        case 'F5':
          e.preventDefault();
          navigate('/convoys');
          break;
        case 'F6':
          e.preventDefault();
          navigate('/alerts');
          break;
        case 'F7':
          e.preventDefault();
          navigate('/simulation');
          break;
        case 'F8':
          e.preventDefault();
          navigate('/reports');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar />
      <div className="flex flex-1 pt-16 min-h-[calc(100vh-4rem)]">
        <Sidebar />
        {/* Main Content Area: generous padding and max-w-[1600px] wrapper */}
        <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto w-full space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
