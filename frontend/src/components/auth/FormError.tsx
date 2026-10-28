export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg error-box px-3 py-2 text-sm">
      {message}
    </div>
  );
}
