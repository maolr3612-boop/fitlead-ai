import NextLink from "next/link";
import type { AnchorHTMLAttributes } from "react";
type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
// GitHub Pages has no server to negotiate App Router's segment/RSC requests.
// Full static-document navigation keeps HTML and its immutable chunks together.
export default function SiteLink({ href, children, ...props }: Props) {
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "1") {
    const prefix = process.env.NEXT_PUBLIC_BASE_PATH || "/fitlead-ai";
    const target =
      href.startsWith("/") && !href.startsWith("//") ? prefix + href : href;
    return (
      <a href={target} {...props}>
        {children}
      </a>
    );
  }
  return (
    <NextLink href={href} {...props}>
      {children}
    </NextLink>
  );
}
