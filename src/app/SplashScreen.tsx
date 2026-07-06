import { useEffect, useMemo, useState } from "react";
import { getSessionSplashQuote } from "@/data/splashQuotes";

const LOGO_FADE_IN_MS = 2200;
const TEXT_DELAY_MS = 1400;
const HINT_DELAY_MS = TEXT_DELAY_MS + 1200;
const FADE_OUT_MS = 700;

interface SplashScreenProps {
  onFinish: () => void;
}

/** Boot splash: black screen, logo fades in uniformly, then a greeting + random quote. Waits for Enter to continue. */
export function SplashScreen({ onFinish }: SplashScreenProps) {
  const quote = useMemo(() => getSessionSplashQuote(), []);
  const [logoVisible, setLogoVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setLogoVisible(true), 50),
      setTimeout(() => setTextVisible(true), TEXT_DELAY_MS),
      setTimeout(() => setHintVisible(true), HINT_DELAY_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !exiting) {
        setExiting(true);
        setTimeout(onFinish, FADE_OUT_MS);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exiting, onFinish]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-10 bg-black transition-opacity ease-linear"
      style={{
        opacity: exiting ? 0 : 1,
        transitionDuration: `${FADE_OUT_MS}ms`,
      }}
    >
      <div
        className="flex h-72 w-72 items-center justify-center transition-opacity ease-linear sm:h-96 sm:w-96"
        style={{
          opacity: logoVisible ? 1 : 0,
          transitionDuration: `${LOGO_FADE_IN_MS}ms`,
        }}
      >
        {logoFailed ? (
          <span className="text-7xl font-semibold tracking-widest text-white">HL</span>
        ) : (
          <img
            src="/logo.png"
            alt="Henledger"
            className="h-full w-full object-contain"
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>

      <div
        className="flex max-w-md flex-col items-center gap-3 px-6 text-center transition-opacity duration-700 ease-out"
        style={{ opacity: textVisible ? 1 : 0 }}
      >
        <p className="text-sm tracking-[0.2em] text-white/60">Hello, Hen.</p>
        <p className="text-base italic text-white/90">&ldquo;{quote.text}&rdquo;</p>
        {quote.source && <p className="text-xs text-white/50">— {quote.source}</p>}
      </div>

      <p
        className="absolute bottom-10 text-xs tracking-[0.15em] text-white/40 transition-opacity duration-700 ease-out"
        style={{ opacity: hintVisible ? 1 : 0 }}
      >
        PRESS ENTER TO CONTINUE
      </p>
    </div>
  );
}
