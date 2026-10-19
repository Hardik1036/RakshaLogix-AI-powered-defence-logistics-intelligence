import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'rakshalogix_sidebar_collapsed';

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
    // Default to collapsed on screens narrower than 1024px
    return window.innerWidth < 1024;
  });

  const notifyResize = useCallback(() => {
    // Notify charts and maps immediately and after the 200ms CSS transition completes
    window.dispatchEvent(new Event('sidebar-toggle'));
    window.dispatchEvent(new Event('resize'));

    setTimeout(() => {
      window.dispatchEvent(new Event('sidebar-toggle'));
      window.dispatchEvent(new Event('resize'));
    }, 210);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
    notifyResize();
  }, [notifyResize]);

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      setIsCollapsed(collapsed);
      localStorage.setItem(STORAGE_KEY, String(collapsed));
      notifyResize();
    },
    [notifyResize]
  );

  // Global Keyboard Shortcut: Ctrl+B (or Cmd+B) toggles the sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        // Prevent browser default bookmark shortcut if Ctrl+B/Cmd+B
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
