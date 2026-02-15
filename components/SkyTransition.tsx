"use client";

interface SkyTransitionProps {
  mistActive: boolean;
  cloudLeftEnter: boolean;
  cloudRightEnter: boolean;
  skyTextEnter: boolean;
  cloudLeftExit: boolean;
  cloudRightExit: boolean;
  mistExit: boolean;
}

export default function SkyTransition({
  mistActive,
  cloudLeftEnter,
  cloudRightEnter,
  skyTextEnter,
  cloudLeftExit,
  cloudRightExit,
  mistExit,
}: SkyTransitionProps) {
  return (
    <div
      id="sky-transition"
      className="sky-transition-overlay"
      aria-hidden
    >
      <div
        className={`mist-layer ${mistActive ? "active" : ""} ${mistExit ? "exit" : ""}`}
        aria-hidden
      />
      {/* Left cloud: shows left half of cloud-transition.svg via background */}
      <div
        className={`cloud-left ${cloudLeftEnter ? "enter" : ""} ${cloudLeftExit ? "exit" : ""}`}
        aria-hidden
      />
      {/* Right cloud: shows right half of cloud-transition.svg via background */}
      <div
        className={`cloud-right ${cloudRightEnter ? "enter" : ""} ${cloudRightExit ? "exit" : ""}`}
        aria-hidden
      />
      <div
        className={`sky-text ${skyTextEnter ? "enter" : ""}`}
        aria-hidden
      >
        THE SKY OPENS
      </div>
    </div>
  );
}
