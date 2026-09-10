import { iniciais } from "@/lib/format";

const TONES = {
  gold: "bg-[#fbf1dc] text-gold-deep",
  ink: "bg-[#2a2f38] text-gold",
} as const;

export function Avatar({
  nome,
  fotoUrl,
  size = 36,
  tone = "gold",
  className,
}: {
  nome: string | null | undefined;
  fotoUrl?: string | null;
  size?: number;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt={nome ?? ""}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${TONES[tone]} ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.32) }}
    >
      {iniciais(nome)}
    </div>
  );
}
