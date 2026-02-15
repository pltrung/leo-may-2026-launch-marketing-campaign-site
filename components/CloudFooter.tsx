"use client";

export default function CloudFooter() {
  return (
    <footer className="cloud-footer" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-ethos">Climb the Clouds. Build a Culture.</div>
        <div className="footer-location">Ho Chi Minh City — 2026</div>
        <div className="footer-copyright-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/cloud-copyright.svg" alt="" aria-hidden />
        </div>
        <div className="footer-copyright-text">
          © Leo Mây Climbing Gym. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
