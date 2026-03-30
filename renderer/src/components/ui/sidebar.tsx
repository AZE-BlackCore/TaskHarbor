import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface SidebarProps {
  children: ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside className={cn('flex flex-col h-full', className)}>
      {children}
    </aside>
  );
}

interface SidebarHeaderProps {
  children: ReactNode;
  className?: string;
}

export function SidebarHeader({ children, className }: SidebarHeaderProps) {
  return (
    <div className={cn('flex-shrink-0', className)}>
      {children}
    </div>
  );
}

interface SidebarContentProps {
  children: ReactNode;
  className?: string;
}

export function SidebarContent({ children, className }: SidebarContentProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      {children}
    </div>
  );
}

interface SidebarFooterProps {
  children: ReactNode;
  className?: string;
}

export function SidebarFooter({ children, className }: SidebarFooterProps) {
  return (
    <div className={cn('flex-shrink-0', className)}>
      {children}
    </div>
  );
}

interface SidebarMenuProps {
  children: ReactNode;
  className?: string;
}

export function SidebarMenu({ children, className }: SidebarMenuProps) {
  return (
    <ul className={cn('space-y-1', className)}>
      {children}
    </ul>
  );
}

interface SidebarMenuItemProps {
  children: ReactNode;
  className?: string;
}

export function SidebarMenuItem({ children, className }: SidebarMenuItemProps) {
  return (
    <li className={cn('', className)}>
      {children}
    </li>
  );
}

interface SidebarMenuButtonProps {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function SidebarMenuButton({
  children,
  onClick,
  active,
  icon,
  className,
}: SidebarMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1 text-left">{children}</span>
    </button>
  );
}
