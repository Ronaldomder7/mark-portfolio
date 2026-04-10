export default function ScrollArrow({ to }: { to: string }) {
  return (
    <div className="flex justify-center pt-16 pb-8">
      <a
        href={`#${to}`}
        aria-label="继续向下"
        className="text-muted hover:text-ink transition-colors"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M12 5v14M5 12l7 7 7-7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </div>
  );
}
