import { Link } from 'react-router-dom';
import { APP_NAME } from '../utils/constants';
import './AuthLayout.css';

/**
 * AuthLayout — wrapper chung cho tất cả auth pages
 * Props: title, subtitle, children, footerText, footerLink, footerLinkText
 */
const AuthLayout = ({
  title,
  subtitle,
  children,
  footerText,
  footerLink,
  footerLinkText,
}) => {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-card__header">
          <h1 className="auth-card__app-name">{APP_NAME}</h1>
          <h2 className="auth-card__title">{title}</h2>
          {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
        </div>

        <div className="auth-card__body">{children}</div>

        {footerText && footerLink && (
          <div className="auth-card__footer">
            <span>{footerText} </span>
            <Link to={footerLink}>{footerLinkText}</Link>
          </div>
        )}
      </div>
    </div>
  );
};

function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-layout__bg">
        <div className="auth-layout__bg-shape auth-layout__bg-shape--1" />
        <div className="auth-layout__bg-shape auth-layout__bg-shape--2" />
        <div className="auth-layout__bg-shape auth-layout__bg-shape--3" />
      </div>

      <div className="auth-layout__content">
        {/* Brand */}
        <div className="auth-layout__brand">
          <div className="auth-layout__brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <span className="auth-layout__brand-name">HealthCare Portal</span>
        </div>

        {/* Page content (Login / Register / etc.) */}
        <div className="auth-layout__card">
          <Outlet />
        </div>

        <p className="auth-layout__footer">
          © {new Date().getFullYear()} HealthCare Portal. Bảo lưu mọi quyền.
        </p>
      </div>
    </div>
  );
}

export default AuthLayout;
