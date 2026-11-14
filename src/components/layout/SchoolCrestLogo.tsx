export function SchoolCrestLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20 3L34 8.5V19.5C34 28.4 27.9 35.4 20 37.5C12.1 35.4 6 28.4 6 19.5V8.5L20 3Z"
        fill="hsl(var(--brand-primary))"
      />
      <path
        d="M20 6.2L30.8 10.5V19.2C30.8 26.2 26 31.8 20 33.8C14 31.8 9.2 26.2 9.2 19.2V10.5L20 6.2Z"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.2"
      />
      <path
        d="M13 15.5C15.5 14.3 18 14.3 20 15.8C22 14.3 24.5 14.3 27 15.5V25.5C24.5 24.3 22 24.3 20 25.8C18 24.3 15.5 24.3 13 25.5V15.5Z"
        fill="white"
      />
      <path d="M20 15.8V25.8" stroke="hsl(var(--brand-primary))" strokeWidth="1.4" />
      <circle cx="20" cy="11.2" r="2.1" fill="hsl(var(--brand-accent))" />
    </svg>
  );
}
