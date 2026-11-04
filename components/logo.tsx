import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  className,
  showText = true,
}: {
  href?: string;
  className?: string;
  showText?: boolean;
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
        width={34}
        height={34}
        className="rounded-lg"
        priority
      />
      {showText ? (
        <span className="text-lg font-bold tracking-tight text-foreground">
          AIVized
        </span>
      ) : null}
    </Link>
  );
}
