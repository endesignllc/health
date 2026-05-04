import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <p className="text-sm font-semibold text-character-gray mb-3">404</p>
        <h1 className="font-display text-4xl tracking-wide text-character-black mb-4">Page not found</h1>
        <p className="text-character-gray mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="btn-primary">
          Go home
        </Link>
      </div>
    </div>
  );
}
