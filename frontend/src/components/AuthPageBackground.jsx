export default function AuthPageBackground({
  character,
  characterClassName,
}) {
  return (
    <div aria-hidden="true" className="login-scene pointer-events-none absolute inset-0">
      <svg
        className="login-wave login-wave-back"
        viewBox="0 0 2880 460"
        preserveAspectRatio="none"
      >
        <path
          d="M0 190C240 100 480 280 720 190C960 100 1200 280 1440 190V460H0Z"
          fill="#242424"
        />
        <path
          d="M0 190C240 100 480 280 720 190C960 100 1200 280 1440 190V460H0Z"
          fill="#242424"
          transform="translate(1440)"
        />
      </svg>
      <svg
        className="login-wave login-wave-middle"
        viewBox="0 0 2880 460"
        preserveAspectRatio="none"
      >
        <path
          d="M0 190C240 125 480 255 720 190C960 125 1200 255 1440 190V460H0Z"
          fill="#454545"
        />
        <path
          d="M0 190C240 125 480 255 720 190C960 125 1200 255 1440 190V460H0Z"
          fill="#454545"
          transform="translate(1440)"
        />
      </svg>
      <img src={character} alt="" className={characterClassName} />
      <svg
        className="login-wave login-wave-front"
        viewBox="0 0 2880 460"
        preserveAspectRatio="none"
      >
        <path
          d="M0 190C240 105 480 275 720 190C960 105 1200 275 1440 190V460H0Z"
          fill="#E5E5E5"
        />
        <path
          d="M0 190C240 105 480 275 720 190C960 105 1200 275 1440 190V460H0Z"
          fill="#E5E5E5"
          transform="translate(1440)"
        />
      </svg>
    </div>
  );
}
