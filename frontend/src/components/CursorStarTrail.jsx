import { useEffect, useRef, useState } from "react";

const MAX_STARS = 20;
const STAR_LIFETIME = 850;

export default function CursorStarTrail() {
  const [stars, setStars] = useState([]);
  const nextId = useRef(0);
  const lastPoint = useRef(null);
  const timers = useRef(new Map());

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touchOnly = window.matchMedia("(hover: none) and (pointer: coarse)");
    let listening = false;

    function clearStars() {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
      lastPoint.current = null;
      setStars([]);
    }

    function handlePointerMove(event) {
      if (reducedMotion.matches || touchOnly.matches) {
        updateListener();
        return;
      }

      if (event.pointerType !== "mouse") {
        return;
      }

      const previous = lastPoint.current;
      const dx = previous ? event.clientX - previous.x : 0;
      const dy = previous ? event.clientY - previous.y : 0;
      if (previous && dx * dx + dy * dy < 256) {
        return;
      }

      lastPoint.current = { x: event.clientX, y: event.clientY };
      const id = nextId.current + 1;
      nextId.current = id;
      const star = {
        id,
        x: event.clientX + (Math.random() - 0.5) * 10,
        y: event.clientY + (Math.random() - 0.5) * 10,
        size: 7 + Math.random() * 7,
        opacity: 0.5 + Math.random() * 0.4,
      };

      setStars((current) => [...current.slice(-(MAX_STARS - 1)), star]);
      const timer = window.setTimeout(() => {
        timers.current.delete(id);
        setStars((current) => current.filter((item) => item.id !== id));
      }, STAR_LIFETIME);
      timers.current.set(id, timer);
    }

    function updateListener() {
      const shouldListen = !reducedMotion.matches && !touchOnly.matches;
      if (shouldListen === listening) {
        return;
      }

      listening = shouldListen;
      if (listening) {
        document.addEventListener("pointermove", handlePointerMove);
      } else {
        document.removeEventListener("pointermove", handlePointerMove);
        clearStars();
      }
    }

    reducedMotion.addEventListener("change", updateListener);
    touchOnly.addEventListener("change", updateListener);
    updateListener();

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      reducedMotion.removeEventListener("change", updateListener);
      touchOnly.removeEventListener("change", updateListener);
      clearStars();
    };
  }, []);

  if (stars.length === 0) {
    return null;
  }

  return (
    <div aria-hidden="true" className="cursor-star-trail">
      {stars.map((star) => (
        <svg
          key={star.id}
          className="cursor-star"
          viewBox="0 0 20 20"
          style={{
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        >
          <path
            d="M10 0.8 12.1 7.9 19.2 10l-7.1 2.1L10 19.2l-2.1-7.1L.8 10l7.1-2.1L10 .8Z"
            fill="currentColor"
          />
        </svg>
      ))}
    </div>
  );
}
