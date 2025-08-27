'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home,
  FileSpreadsheet,
  Calculator,
  Users,
  Archive,
  BarChart,
  Settings
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface NavigationBarProps {
  userRole?: 'admin' | 'segretaria' | 'responsabile';
}

export default function NavigationBar({ userRole = 'admin' }: NavigationBarProps) {
  const pathname = usePathname();
  
  const navigationItems: NavItem[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      href: '/', 
      icon: <Home className="w-4 h-4" />
    },
    { 
      id: 'import', 
      label: 'Import Fatture', 
      href: '/import', 
      icon: <FileSpreadsheet className="w-4 h-4" />
    },
    { 
      id: 'compensi', 
      label: 'Calcola Compensi', 
      href: '/compensi', 
      icon: <Calculator className="w-4 h-4" />
    },
    { 
      id: 'medici', 
      label: 'Medici', 
      href: '/medici', 
      icon: <Users className="w-4 h-4" />
    },
    { 
      id: 'archivio', 
      label: 'Archivio', 
      href: '/archivio', 
      icon: <Archive className="w-4 h-4" />,
      adminOnly: false
    },
    { 
      id: 'statistiche', 
      label: 'Statistiche', 
      href: '/statistiche', 
      icon: <BarChart className="w-4 h-4" />,
      adminOnly: true
    },
    { 
      id: 'impostazioni', 
      label: 'Impostazioni', 
      href: '/impostazioni', 
      icon: <Settings className="w-4 h-4" />,
      adminOnly: true
    }
  ];

  const visibleNavItems = navigationItems.filter(item => 
    !item.adminOnly || userRole === 'admin'
  );

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-[#FAFBFC] px-6 py-2 border-t border-gray-200">
      <div className="flex items-center gap-1 overflow-x-auto">
        {visibleNavItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap min-w-fit ${
              isActive(item.href)
                ? 'bg-[#03A6A6]/10 text-[#03A6A6] shadow-sm'
                : 'text-gray-700 bg-transparent hover:bg-white hover:text-gray-900 hover:shadow-sm'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}