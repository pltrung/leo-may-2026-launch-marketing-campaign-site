export default function LoadingScreen() {
  return (
    <div id="loading-screen" className="loading-screen" aria-hidden>
      <div className="loading-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.svg" className="loading-logo" alt="" />
        <div className="loading-cloud">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/cloud-copyright.svg" alt="" />
        </div>
        <div className="loading-text">Preparing the sky</div>
      </div>
    </div>
  );
}
