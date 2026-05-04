import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 bg-background">
      <div className="text-center max-w-md">
        <p className="text-lg font-bold text-primary mb-3">404</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground mb-5 leading-tight">
          Page not found
        </h1>
        <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
      </div>
    </div>
  );
}
