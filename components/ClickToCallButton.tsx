type Props = {
  className?: string;
  label?: string;
  phone?: string;
};

export default function ClickToCallButton({ className, label, phone }: Props) {
  const resolvedPhone = phone ?? process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "+18005551234";
  const display = phone ?? process.env.NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY ?? "(800) 555-1234";

  return (
    <a
      href={`tel:${resolvedPhone}`}
      className={
        className ??
        "inline-block rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 transition-colors"
      }
    >
      {label ?? `Call ${display}`}
    </a>
  );
}
