export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Disclaimer</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4">
        <p className="text-muted-foreground font-medium">
          This site does not provide medical advice.
        </p>
        <p className="text-muted-foreground">
          The products and information on Health Benefits Shop are for general wellness support only. They are not intended to diagnose, treat, cure, or prevent any disease. Always consult your healthcare provider before starting any new supplement or wellness regimen.
        </p>
        <p className="text-muted-foreground">
          We organize products by functional support categories (e.g., Blood Sugar Support, Heart Health) to help you find relevant options. We never ask for or infer a diagnosis.
        </p>
      </div>
    </div>
  );
}
