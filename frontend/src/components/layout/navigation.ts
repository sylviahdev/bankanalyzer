import {
  BarChart3,
  LayoutDashboard,
  Receipt,
  Settings,
  Upload,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/transactions', label: 'Transactions', icon: Receipt },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/upload', label: 'Upload Statement', icon: Upload },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]
