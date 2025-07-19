import React, { useState } from 'react';
import { 
  RefreshCw,
  LogOut,
  Check,
  X,
  Calendar,
  ChevronRight,
  AlertCircle,
  Eye,
  Download,
  Upload,
  FileText,
  ChevronLeft
} from 'lucide-react';

// Logo Component
const PoliLogo = () => (
  <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 30 Q50 15, 80 30 Q85 50, 70 70 Q50 80, 30 70 Q15 50, 20 30" fill="url(#gradient1)" opacity="0.8"/>
    <path d="M30 40 Q60 25, 85 45 Q80 65, 60 75 Q40 85, 25 65 Q20 45, 30 40" fill="url(#gradient2)" opacity="0.6"/>
    <defs>
      <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#03A6A6"/>
        <stop offset="100%" stopColor="#6192A9"/>
      </linearGradient>
      <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6192A9"/>
        <stop offset="100%" stopColor="#03A6A6"/>
      </linearGradient>
    </defs>
  </svg>
);

// Illustrazioni Menu
const ImportIllustration = () => (
  <div className="w-full h-32 flex items-center justify-center">
    <svg width="80" height="80" viewBox="0 0 120 120" fill="none">
      <rect x="25" y="15" width="70" height="90" rx="4" fill="#E9EDF2" stroke="#03A6A6" strokeWidth="2"/>
      <rect x="35" y="25" width="50" height="2" fill="#03A6A6" opacity="0.5"/>
      <rect x="35" y="35" width="40" height="2" fill="#03A6A6" opacity="0.5"/>
      <rect x="35" y="45" width="45" height="2" fill="#03A6A6" opacity="0.5"/>
      <rect x="35" y="55" width="35" height="2" fill="#03A6A6" opacity="0.5"/>
      <rect x="35" y="65" width="50" height="2" fill="#03A6A6" opacity="0.5"/>
      <rect x="35" y="75" width="30" height="2" fill="#03A6A6" opacity="0.5"/>
      <rect x="35" y="85" width="40" height="2" fill="#03A6A6" opacity="0.5"/>
      <path d="M60 90 L60 110 M50 100 L60 110 L70 100" stroke="#03A6A6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="95" cy="25" r="15" fill="#03A6A6" opacity="0.2"/>
      <path d="M90 25 L93 28 L100 21" stroke="#03A6A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const CalcolaIllustration = () => (
  <div className="w-full h-32 flex items-center justify-center">
    <svg width="80" height="80" viewBox="0 0 120 120" fill="none">
      <rect x="20" y="20" width="80" height="80" rx="8" fill="#E9EDF2" stroke="#6192A9" strokeWidth="2"/>
      <rect x="30" y="30" width="60" height="15" rx="2" fill="#6192A9" opacity="0.3"/>
      <text x="60" y="41" textAnchor="middle" fill="#6192A9" fontSize="12" fontWeight="bold">€ 1.250</text>
      <rect x="30" y="55" width="25" height="35" rx="2" fill="#03A6A6" opacity="0.4"/>
      <rect x="65" y="65" width="25" height="25" rx="2" fill="#6192A9" opacity="0.4"/>
      <circle cx="100" cy="100" r="18" fill="#6192A9" opacity="0.2"/>
      <text x="100" y="105" textAnchor="middle" fill="#6192A9" fontSize="16" fontWeight="bold">%</text>
    </svg>
  </div>
);

const MediciIllustration = () => (
  <div className="w-full h-32 flex items-center justify-center">
    <svg width="80" height="80" viewBox="0 0 120 120" fill="none">
      <circle cx="40" cy="35" r="15" fill="#8C786C" opacity="0.3"/>
      <circle cx="40" cy="35" r="10" fill="#8C786C" opacity="0.5"/>
      <path d="M25 55 Q40 50, 55 55 L55 70 Q40 75, 25 70 Z" fill="#8C786C" opacity="0.4"/>
      <circle cx="80" cy="35" r="15" fill="#D9AC9C" opacity="0.3"/>
      <circle cx="80" cy="35" r="10" fill="#D9AC9C" opacity="0.5"/>
      <path d="M65 55 Q80 50, 95 55 L95 70 Q80 75, 65 70 Z" fill="#D9AC9C" opacity="0.4"/>
      <rect x="20" y="85" width="80" height="20" rx="4" fill="#E9EDF2" stroke="#8C786C" strokeWidth="2"/>
      <circle cx="35" cy="95" r="3" fill="#03A6A6"/>
      <circle cx="50" cy="95" r="3" fill="#6192A9"/>
      <circle cx="65" cy="95" r="3" fill="#8C786C"/>
      <circle cx="80" cy="95" r="3" fill="#D9AC9C"/>
    </svg>
  </div>
);

const StatisticheIllustration = () => (
  <div className="w-full h-32 flex items-center justify-center">
    <svg width="80" height="80" viewBox="0 0 120 120" fill="none">
      <rect x="20" y="70" width="15" height="30" fill="#03A6A6" opacity="0.6"/>
      <rect x="40" y="50" width="15" height="50" fill="#6192A9" opacity="0.6"/>
      <rect x="60" y="40" width="15" height="60" fill="#8C786C" opacity="0.6"/>
      <rect x="80" y="60" width="15" height="40" fill="#D9AC9C" opacity="0.6"/>
      <path d="M20 30 Q40 25, 60 35 T100 25" stroke="#03A6A6" strokeWidth="2" fill="none"/>
      <circle cx="20" cy="30" r="3" fill="#03A6A6"/>
      <circle cx="60" cy="35" r="3" fill="#03A6A6"/>
      <circle cx="100" cy="25" r="3" fill="#03A6A6"/>
    </svg>
  </div>
);

const ImpostazioniIllustration = () => (
  <div className="w-full h-32 flex items-center justify-center">
    <svg width="80" height="80" viewBox="0 0 120 120" fill="none">
      <g transform="translate(60, 60)">
        <circle cx="0" cy="0" r="18" fill="#D9AC9C" opacity="0.4"/>
        <circle cx="0" cy="0" r="10" fill="#E9EDF2"/>
        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
          <rect
            key={angle}
            x="-4"
            y="-25"
            width="8"
            height="12"
            rx="2"
            fill="#D9AC9C"
            transform={`rotate(${angle})`}
          />
        ))}
      </g>
      <g transform="translate(85, 35)">
        <circle cx="0" cy="0" r="12" fill="#8C786C" opacity="0.3"/>
        <circle cx="0" cy="0" r="6" fill="#E9EDF2"/>
        {[0, 60, 120, 180, 240, 300].map(angle => (
          <rect
            key={angle}
            x="-3"
            y="-15"
            width="6"
            height="8"
            rx="1"
            fill="#8C786C"
            opacity="0.6"
            transform={`rotate(${angle})`}
          />
        ))}
      </g>
      <g transform="translate(35, 85)">
        <circle cx="0" cy="0" r="12" fill="#6192A9" opacity="0.3"/>
        <circle cx="0" cy="0" r="6" fill="#E9EDF2"/>
        {[0, 60, 120, 180, 240, 300].map(angle => (
          <rect
            key={angle}
            x="-3"
            y="-15"
            width="6"
            height="8"
            rx="1"
            fill="#6192A9"
            opacity="0.6"
            transform={`rotate(${angle})`}
          />
        ))}
      </g>
    </svg>
  </div>
);

const ArchivioIllustration = () => (
  <div className="w-full h-32 flex items-center justify-center">
    <svg width="80" height="80" viewBox="0 0 120 120" fill="none">
      <path d="M20 45 L20 95 L100 95 L100 40 L65 40 L55 30 L20 30 Z" 
            fill="#E9EDF2" 
            stroke="#8C786C" 
            strokeWidth="2"/>
      <path d="M20 40 L20 45 L100 45 L100 40 L65 40 L55 30 L20 30 Z" 
            fill="#8C786C" 
            opacity="0.4"/>
      <rect x="35" y="60" width="50" height="3" rx="1" fill="#8C786C" opacity="0.3"/>
      <rect x="35" y="68" width="40" height="3" rx="1" fill="#8C786C" opacity="0.3"/>
      <rect x="35" y="76" width="45" height="3" rx="1" fill="#8C786C" opacity="0.3"/>
      <path d="M25 50 L25 90 L95 90 L95 50" 
            fill="#8C786C" 
            opacity="0.1"/>
    </svg>
  </div>
);

export default function Dashboard() {
  // Stati
  const [currentUser, setCurrentUser] = useState({ 
    name: 'Maria Rossi', 
    role: 'admin',
    email: 'maria.rossi@poliestetica.com'
  });
  
  const [activeSection, setActiveSection] = useState('dashboard');
  const [currentMonth] = useState('Dicembre 2024');
  const [isMonthClosed] = useState(false);
  const [lastSync, setLastSync] = useState('10 minuti fa');
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'warning', message: '4 fatture con anomalie da risolvere', link: 'import' },
    { id: 2, type: 'info', message: 'Nuove fatture disponibili per import', link: 'import' }
  ]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Demo users
  const demoUsers = [
    { name: 'Maria Rossi', role: 'admin', email: 'maria.rossi@poliestetica.com' },
    { name: 'Giulia Bianchi', role: 'segretaria', email: 'giulia.bianchi@poliestetica.com' },
    { name: 'Paolo Verdi', role: 'responsabile', email: 'paolo.verdi@poliestetica.com' }
  ];

  const handleMenuClick = (menuId) => {
    console.log(`Navigating to: ${menuId}`);
    setActiveSection(menuId);
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'import', label: 'Import Fatture', icon: '📥' },
    { id: 'calcola', label: 'Calcola Compensi', icon: '💰' },
    { id: 'medici', label: 'Medici', icon: '👥' },
    { id: 'archivio', label: 'Archivio', icon: '📁' },
    { id: 'statistiche', label: 'Statistiche', icon: '📈', adminOnly: true },
    { id: 'impostazioni', label: 'Impostazioni', icon: '⚙️', adminOnly: true }
  ];

  const visibleNavItems = navigationItems.filter(item => 
    !item.adminOnly || currentUser.role === 'admin'
  );

  const menuItems = [
    {
      id: 'import',
      title: 'Import Fatture',
      description: 'Sincronizza con Fatture in Cloud',
      illustration: <ImportIllustration />,
      enabled: true,
      roles: ['admin', 'segretaria']
    },
    {
      id: 'calcola',
      title: 'Calcola Compensi',
      description: 'Elabora compensi e chiudi mese',
      illustration: <CalcolaIllustration />,
      enabled: !isMonthClosed,
      roles: ['admin', 'segretaria']
    },
    {
      id: 'medici',
      title: 'Gestione Medici',
      description: 'Configura regole e costi prodotti',
      illustration: <MediciIllustration />,
      enabled: true,
      roles: ['admin']
    },
    {
      id: 'statistiche',
      title: 'Statistiche',
      description: 'Dashboard analitiche e KPI',
      illustration: <StatisticheIllustration />,
      enabled: true,
      roles: ['admin']
    },
    {
      id: 'impostazioni',
      title: 'Impostazioni',
      description: 'Configurazioni sistema',
      illustration: <ImpostazioniIllustration />,
      enabled: true,
      roles: ['admin']
    },
    {
      id: 'archivio',
      title: 'Archivio',
      description: 'Storico periodi, report e confronti',
      illustration: <ArchivioIllustration />,
      enabled: true,
      roles: ['admin', 'segretaria', 'responsabile']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(currentUser.role)
  );

  const handleSync = async () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSync('ora');
      setNotifications(prev => [
        ...prev,
        { 
          id: Date.now(), 
          type: 'success', 
          message: '15 nuove fatture sincronizzate da Fatture in Cloud', 
          link: 'import' 
        }
      ]);
    }, 2000);
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Sezione demo placeholder
  const DemoSection = ({ title }) => (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">{title}</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-blue-800 mb-3">
          🚧 Sezione "{title}" in sviluppo
        </p>
        <p className="text-sm text-blue-600">
          Questa è una demo interattiva del sistema. Usa il menu di navigazione per esplorare le diverse sezioni.
        </p>
        <button
          onClick={() => setActiveSection('dashboard')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Torna alla Dashboard
        </button>
      </div>
      
      {/* Demo content per alcune sezioni */}
      {activeSection === 'import' && (
        <div className="mt-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Ultime fatture sincronizzate</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1">
                <span>FT/2024/1251</span>
                <span className="text-green-600">✅ Importata</span>
              </div>
              <div className="flex justify-between py-1">
                <span>FT/2024/1252</span>
                <span className="text-amber-600">⚠️ Medico mancante</span>
              </div>
              <div className="flex justify-between py-1">
                <span>FT/2024/1253</span>
                <span className="text-green-600">✅ Importata</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeSection === 'medici' && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Dott.ssa Scutari</h3>
            <p className="text-sm text-gray-600">Medicina Estetica</p>
            <p className="text-sm mt-2">Regola: 50% su netto</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Dott. Rossi</h3>
            <p className="text-sm text-gray-600">Medicina Estetica</p>
            <p className="text-sm mt-2">Regola: €50 ogni €200</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Logo e Brand */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <PoliLogo />
                <div>
                  <h1 className="text-2xl font-semibold text-gray-800">Poliestetica Pignatelli</h1>
                  <p className="text-sm text-gray-500">Sistema Gestione Compensi</p>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Periodo attivo:</span>
                <span className="font-semibold text-gray-800">{currentMonth}</span>
                {isMonthClosed && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    CHIUSO
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-4 pl-6 border-l border-gray-200">
                <select
                  value={currentUser.email}
                  onChange={(e) => {
                    const user = demoUsers.find(u => u.email === e.target.value);
                    setCurrentUser(user);
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                >
                  {demoUsers.map(user => (
                    <option key={user.email} value={user.email}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <LogOut className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="bg-[#FAFBFC] px-6 py-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  handleMenuClick(item.id);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap min-w-fit ${
                  activeSection === item.id
                    ? 'bg-[#03A6A6]/10 text-[#03A6A6] shadow-sm'
                    : 'text-gray-700 bg-transparent hover:bg-white hover:text-gray-900 hover:shadow-sm'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Notifications and Sync Bar */}
      {activeSection === 'dashboard' && (
        <>
          <div className="bg-gradient-to-r from-[#E9EDF2] to-[#F5F7FA] px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">Ultima sincronizzazione:</span>
              <span className="font-medium text-gray-800">{lastSync}</span>
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">
                {isSyncing ? 'Sincronizzazione...' : 'Sincronizza ora'}
              </span>
            </button>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="px-6 py-4 space-y-2">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`flex items-center justify-between p-4 rounded-lg shadow-sm ${
                    notification.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                    notification.type === 'success' ? 'bg-green-50 border border-green-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {notification.type === 'warning' ? (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    ) : notification.type === 'success' ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                    )}
                    <span className={`text-sm font-medium ${
                      notification.type === 'warning' ? 'text-amber-800' :
                      notification.type === 'success' ? 'text-green-800' :
                      'text-blue-800'
                    }`}>
                      {notification.message}
                    </span>
                    <button
                      onClick={() => handleMenuClick(notification.link)}
                      className="flex items-center gap-1 text-sm font-medium text-[#03A6A6] hover:text-[#028a8a] transition-colors"
                    >
                      Vai alla sezione
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="p-1 hover:bg-white/50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {activeSection === 'dashboard' ? (
            <>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Menu Principale</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMenuItems.map(item => {
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.enabled) {
                          setActiveSection(item.id);
                          handleMenuClick(item.id);
                        }
                      }}
                      disabled={!item.enabled}
                      className={`relative p-6 rounded-xl transition-all duration-200 ${
                        item.enabled 
                          ? 'hover:scale-105 hover:shadow-xl cursor-pointer bg-white' 
                          : 'opacity-50 cursor-not-allowed bg-gray-50'
                      } border border-gray-200 overflow-hidden group`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative z-10">
                        {item.illustration}
                        
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-4">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Info Box */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Dashboard Demo Interattiva
                </h3>
                <p className="text-blue-800 mb-3">
                  Benvenuto nel sistema di gestione compensi Poliestetica! Questa è una versione demo interattiva.
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Cambia ruolo utente dal menu in alto a destra per vedere le diverse visualizzazioni</li>
                  <li>• Clicca sulle card o usa il menu di navigazione per esplorare le sezioni</li>
                  <li>• Le notifiche e la sincronizzazione sono simulate per demo</li>
                </ul>
              </div>
            </>
          ) : (
            <DemoSection 
              title={navigationItems.find(item => item.id === activeSection)?.label || activeSection} 
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto px-6 py-4 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Sistema Compensi v1.0</span>
            <span className="text-gray-400">|</span>
            <span>Stato: <span className="text-green-600 font-medium">Demo Mode</span></span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-[#03A6A6] transition-colors">Manuale utente</a>
            <span className="text-gray-400">|</span>
            <a href="#" className="hover:text-[#03A6A6] transition-colors">Supporto tecnico</a>
          </div>
        </div>
      </footer>
    </div>
  );
}