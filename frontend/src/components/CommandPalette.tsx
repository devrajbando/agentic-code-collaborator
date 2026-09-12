import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Navigation targets
  const routes = [
    { label: 'Go to Dashboard', path: '/dashboard', icon: '⊞' },
    { label: 'Create New Project', path: '/dashboard?action=new', icon: '＋' },
    { label: 'Account Settings', path: '/settings', icon: '⚙' },
    { label: 'Return to Landing', path: '/', icon: '⌂' },
  ];

  const filteredRoutes = routes.filter(route => 
    route.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      // Small delay to ensure render before focus
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredRoutes.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredRoutes.length) % filteredRoutes.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredRoutes[selectedIndex]) {
          navigate(filteredRoutes[selectedIndex].path);
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleModalKeyDown);
    return () => window.removeEventListener('keydown', handleModalKeyDown);
  }, [isOpen, filteredRoutes, selectedIndex, navigate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-[#2b2622]/80 backdrop-blur-sm">
      <div 
        className="w-full max-w-lg bg-[#383330] border border-[#3f3a36] rounded-[4px] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center border-b border-[#3f3a36] px-4 py-3">
          <span className="text-[#aea69c] font-mono mr-3">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-[#f7f5f0] placeholder-[#aea69c] focus:outline-none font-mono text-[13px]"
            placeholder="Type a command or search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
        </div>
        
        <ul className="p-2 max-h-[300px] overflow-y-auto">
          {filteredRoutes.length === 0 ? (
            <li className="px-3 py-4 text-center text-[#aea69c] font-mono text-[13px]">
              No matching commands.
            </li>
          ) : (
            filteredRoutes.map((route, idx) => {
              const isActive = idx === selectedIndex;
              return (
                <li key={route.path}>
                  <button 
                    onClick={() => {
                      navigate(route.path);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 mt-1 rounded-[3px] text-[14px] font-sans transition-colors ${
                      isActive 
                        ? 'bg-[#2b2622] text-[#f7f5f0]' 
                        : 'text-[#c9c0ad] hover:text-[#f7f5f0] hover:bg-[#2b2622]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#aea69c]">{route.icon}</span>
                      <span className={isActive ? 'font-medium' : ''}>{route.label}</span>
                    </div>
                    {isActive && (
                      <span className="text-[var(--color-glow-teal)] font-mono text-[13px]">
                        ↵
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        
        <div className="bg-[#2b2622] p-3 text-[12px] text-[#aea69c] border-t border-[#3f3a36] flex justify-between font-sans">
          <div className="flex gap-4">
            <span><kbd className="font-mono bg-[#383330] px-1 py-0.5 rounded-[2px] border border-[#3f3a36]">↑</kbd> <kbd className="font-mono bg-[#383330] px-1 py-0.5 rounded-[2px] border border-[#3f3a36]">↓</kbd> navigate</span>
            <span><kbd className="font-mono bg-[#383330] px-1 py-0.5 rounded-[2px] border border-[#3f3a36]">↵</kbd> select</span>
          </div>
          <span><kbd className="font-mono bg-[#383330] px-1 py-0.5 rounded-[2px] border border-[#3f3a36]">esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}