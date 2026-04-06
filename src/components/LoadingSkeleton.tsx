const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="glass-card rounded-2xl p-5 animate-pulse-soft"
        style={{ animationDelay: `${i * 200}ms` }}
      >
        <div className="flex gap-5">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-40 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted/60 rounded" />
            <div className="h-4 w-full bg-muted/40 rounded" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-muted/30 rounded-full" />
              <div className="h-5 w-20 bg-muted/30 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
