import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Settings,
  CreditCard,
  Bell,
  HelpCircle,
  Globe,
  LogOut,
  ChevronDown,
  ExternalLink,
  X,
} from 'lucide-react';
import { useUserRole, canAccessBilling } from '@/hooks/useUserRole';
import { API_BASE_URL } from '@/api/client';

interface AccountDropdownProps {
  userInitials?: string;
  userName?: string;
}

function deriveUserInfo() {
  const email = localStorage.getItem('authUserEmail') || '';
  const role = localStorage.getItem('authUserRole') || '';
  // Try to build a name from email (before @)
  const namePart = email.split('@')[0] || 'User';
  const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/[._]/g, ' ');
  const initials = displayName.split(' ').map(w => w[0]?.toUpperCase() || '').join('').slice(0, 2) || 'U';
  return { displayName, initials, role, email };
}

export function AccountDropdown({
  userInitials,
  userName,
}: AccountDropdownProps) {
  const derived = deriveUserInfo();
  const finalInitials = userInitials || derived.initials;
  const finalName = userName || derived.displayName;
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = useUserRole();
  const canSeeBilling = canAccessBilling(user.role);

  // Check if mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    // Blacklist the refresh token before clearing local state
    const refreshToken = localStorage.getItem('refresh_token');
    const accessToken = localStorage.getItem('access_token');
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/api/manager/auth/jwt/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      } catch {
        // Best-effort — clear tokens regardless of network failure
      }
    }
    // Clear all auth state
    [
      'access_token',
      'refresh_token',
      'authToken',
      'auth_token',
      'authUserRole',
      'authUserEmail',
    ].forEach((k) => localStorage.removeItem(k));
    navigate('/login');
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="account-dropdown relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={toggleDropdown}
        className="account-dropdown-trigger flex items-center gap-2 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* User Avatar/Initials */}
        <div className="account-avatar flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-foreground">
          {finalInitials}
        </div>

        {/* User Name (hidden on small screens) */}
        <span className="account-name hidden sm:inline">{finalName}</span>

        {/* Dropdown Icon */}
        <ChevronDown
          className={`dropdown-icon h-4 w-4 text-muted-foreground transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          {isMobile && (
            <div
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
          )}

          {/* Dropdown Content */}
          <div
            className={`account-dropdown-menu ${
              isMobile
                ? 'fixed bottom-0 left-0 right-0 z-50 w-full rounded-t-xl'
                : 'absolute right-0 top-full z-50 mt-2 w-60 rounded-lg'
            } border border-border bg-card shadow-elevated`}
            data-open={isOpen}
          >
            {/* Mobile Close Button */}
            {isMobile && (
              <div className="flex items-center justify-between border-b border-border p-4">
                <span className="text-sm font-semibold text-foreground">
                  Account
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Account Section */}
            <div className="dropdown-section p-2">
              <Link
                to="/settings/account"
                className="dropdown-item flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="dropdown-icon h-4 w-4 text-muted-foreground" />
                <span>Account settings</span>
              </Link>

              {canSeeBilling && (
                <Link
                  to="/settings/billing"
                  className="dropdown-item flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                  onClick={() => setIsOpen(false)}
                >
                  <CreditCard className="dropdown-icon h-4 w-4 text-muted-foreground" />
                  <span>Billing</span>
                </Link>
              )}
            </div>

            {/* Divider */}
            <div className="dropdown-divider mx-0 my-1 h-px bg-border" />

            {/* Support Section */}
            <div className="dropdown-section p-2">
              <a
                href="/cleanproof/updates"
                target="_blank"
                rel="noopener noreferrer"
                className="dropdown-item flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Bell className="dropdown-icon h-4 w-4 text-muted-foreground" />
                <span>Product updates</span>
                <ExternalLink className="external-icon ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </a>

              <a
                href="/cleanproof/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="dropdown-item flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <HelpCircle className="dropdown-icon h-4 w-4 text-muted-foreground" />
                <span>Help / Contact</span>
                <ExternalLink className="external-icon ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </a>

              <a
                href="/cleanproof"
                target="_blank"
                rel="noopener noreferrer"
                className="dropdown-item flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Globe className="dropdown-icon h-4 w-4 text-muted-foreground" />
                <span>Company website</span>
                <ExternalLink className="external-icon ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </div>

            {/* Divider */}
            <div className="dropdown-divider mx-0 my-1 h-px bg-border" />

            {/* Sign Out Section */}
            <div className="dropdown-section p-2">
              <button
                onClick={handleLogout}
                className="dropdown-item dropdown-item-danger flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="dropdown-icon h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
