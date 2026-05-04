export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4">
        <p className="text-muted-foreground">
          Health Benefits Shop is committed to your privacy. We do not use third-party tracking, analytics pixels, or log your need category selections server-side.
        </p>
        <h2 className="text-xl font-semibold mt-8">What We Don&apos;t Do</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>No Google Analytics, Meta Pixel, Hotjar, FullStory, or similar</li>
          <li>No logging of &quot;need category&quot; selections</li>
          <li>No IP address storage in app-level logging</li>
          <li>No request-body logging</li>
        </ul>
        <h2 className="text-xl font-semibold mt-8">What We Collect</h2>
        <p className="text-muted-foreground">
          We collect only what is necessary to process your order: email (at checkout), shipping address, and payment information via Stripe. We do not ask for or store health diagnoses.
        </p>
        <h2 className="text-xl font-semibold mt-8">Analytics</h2>
        <p className="text-muted-foreground">
          Any first-party analytics are optional and off by default. We use only aggregate, cookie-less counters when enabled—no IP or user-agent storage.
        </p>
      </div>
    </div>
  );
}
