export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4">
        <p className="text-muted-foreground">
          By using Health Benefits Shop, you agree to these terms. We provide a marketplace for over-the-counter health and wellness products. All purchases are subject to our shipping and return policies.
        </p>
        <h2 className="text-xl font-semibold mt-8">Subscriptions</h2>
        <p className="text-muted-foreground">
          Recurring subscriptions can be paused or canceled at any time through your account or by contacting support.
        </p>
        <h2 className="text-xl font-semibold mt-8">Contact</h2>
        <p className="text-muted-foreground">
          For questions about these terms, please contact us through the support channels provided on the site.
        </p>
      </div>
    </div>
  );
}
