import { Link, NavLink } from 'react-router-dom';
import {
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  BuildingOffice2Icon,
  CogIcon,
} from '@heroicons/react/24/outline';
import mohLogo from '../../assets/rwanda-moh-logo-full.png';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: ChartBarIcon },
  { to: '/facilities', label: 'Facilities', icon: BuildingOffice2Icon },
  { to: '/compliance', label: 'Compliance', icon: ClipboardDocumentCheckIcon },
  { to: '/deviations', label: 'Deviations', icon: ExclamationTriangleIcon },
  { to: '/compliance/patients', label: 'Patients', icon: ClipboardDocumentCheckIcon },
  { to: '/events', label: 'Events', icon: SignalIcon },
  { to: '/ingestion', label: 'Ingestion', icon: CogIcon },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-gray-200 bg-white">
      <Link
        to="/"
        className="flex h-[72px] items-center gap-2 border-b border-gray-100 px-4 transition-colors hover:bg-gray-50"
        aria-label="CCE Insights home"
      >
        <img src={mohLogo} alt="Republic of Rwanda — Ministry of Health" className="h-8 w-8 object-contain" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-[#1d5fae]">CCE Insights</span>
          <span className="text-[11px] text-gray-500">MOH Digital Health</span>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/' || to === '/compliance'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
