import { Outlet } from "react-router-dom";
import bannerImage from "../../assets/banner.jpg";
import logo from "../../assets/logo.png";

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <aside className="auth-visual" aria-label="University campus">
        <img className="auth-visual-image" src={bannerImage} alt="" />
        <div className="auth-visual-overlay" />
        <img
          className="auth-visual-logo animate-bounce"
          src={logo}
          alt="Rev. Fr. Moses Orshio Adasu University logo"
        />
        <div className="auth-visual-heading">
          <h1>ALABATT HUB</h1>
          <p>The Centre for Sport Unit</p>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-brand">
          <img
            className="auth-mobile-logo"
            src={logo}
            alt="Rev. Fr. Moses Orshio Adasu University logo"
          />
          <div className="auth-mobile-brand-copy">
            <h1>ALABATT HUB</h1>
            <p>The Centre for Sport Unit</p>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
