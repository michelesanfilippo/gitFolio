import type { ReactNode } from 'react';
import { withBasePath } from '@/config/brand';

/**
 * iPhone realizzato in CSS (nessuna libreria 3D): finitura arancio, Dynamic Island, barra di stato, leggero dondolio.
 * `children` è lo schermo: per ora una schermata statica della home; in seguito si potrà sostituire con un <video>.
 */
export function PhoneMock({ children }: { children?: ReactNode }) {
  return (
    <div className="phone-scene" aria-hidden>
      <div className="phone-shadow" />
      <div className="phone-sway">
        <div className="phone">
          <span className="phone-btn phone-btn-action" />
          <span className="phone-btn phone-btn-vol-up" />
          <span className="phone-btn phone-btn-vol-down" />
          <span className="phone-btn phone-btn-power" />
          <div className="phone-bezel">
            <div className="phone-screen">
              <span className="phone-island" />
              <div className="phone-status">
                <span>9:41</span>
                <span className="phone-status-icons">
                  <svg viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx=".8" /><rect x="5" y="5.5" width="3" height="6.5" rx=".8" /><rect x="10" y="3" width="3" height="9" rx=".8" /><rect x="15" y="0" width="3" height="12" rx=".8" /></svg>
                  <svg viewBox="0 0 26 12" fill="none" stroke="currentColor"><rect x=".6" y=".6" width="21" height="10.8" rx="3.2" opacity=".5" /><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" stroke="none" /><path d="M24 4v4" strokeWidth="1.6" strokeLinecap="round" opacity=".6" /></svg>
                </span>
              </div>
              {children ?? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="phone-img" src={withBasePath('/brand/phone-home.webp')} alt="" width={800} height={1648} loading="eager" draggable={false} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
