import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  className,
  showText = true,
  size = 34,
}: {
  href?: string;
  className?: string;
  showText?: boolean;
  size?: number;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="AIVized home"
    >
      <Image
        src="/logo.png"
        alt="AIVized logo"
        width={size}
        height={size}
        className="rounded-lg"
        priority
      />
      {showText ? (
        <span className="text-lg font-semibold tracking-tight text-current">
          AIVized
        </span>
      ) : null}
    </Link>
  );
}
