import { Globe } from "lucide-react";
import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

type Column = { title: string; links: { label: string; href?: string }[] };

/** Links: REF-I3, renamed per plan §5.2. Only the hosting link leads anywhere (plan §6.2). */
const COLUMNS: Column[] = [
  {
    title: "Support",
    links: [
      { label: "Help Centre" },
      { label: "Get help with a safety issue" },
      { label: "Guest protection" },
      { label: "Anti-discrimination" },
      { label: "Disability support" },
      { label: "Cancellation options" },
      { label: "Report neighbourhood concern" },
    ],
  },
  {
    title: "Hosting",
    links: [
      { label: "Host your home", href: "/become-a-host" },
      { label: "Host an experience" },
      { label: "Host a service" },
      { label: "Host protection" },
      { label: "Hosting resources" },
      { label: "Community forum" },
      { label: "Hosting responsibly" },
      { label: "Join a free hosting class" },
      { label: "Find a co‑host" },
      { label: "Refer a host" },
    ],
  },
  {
    title: SITE_NAME,
    links: [
      { label: "Release notes" },
      { label: "Newsroom" },
      { label: "Careers" },
      { label: "Investors" },
      { label: "Emergency stays" },
    ],
  },
];

const LEGAL = ["Privacy", "Terms", "Company details"];

/** Our own simple drawings of the three social marks; they are not links (plan §5.2). */
const SOCIAL = [
  {
    label: "Facebook",
    shape: (
      <path
        fill="currentColor"
        d="M9.5 15V8.8h2l.3-2.3H9.5V5c0-.7.2-1.1 1.2-1.1h1.2V1.8c-.6-.1-1.2-.1-1.8-.1-1.8 0-3 1.1-3 3.1v1.7H5.2v2.3h1.9V15z"
      />
    ),
  },
  {
    label: "X",
    shape: <path stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" d="M3 3l10 10M13 3L3 13" />,
  },
  {
    label: "Instagram",
    shape: (
      <g fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x={2} y={2} width={12} height={12} rx={3.5} />
        <circle cx={8} cy={8} r={2.8} />
        <circle cx={11.6} cy={4.4} r={0.5} fill="currentColor" />
      </g>
    ),
  },
];

/**
 * The footer of capture A1: three columns on the #f7f7f7 surface, 16 px between links,
 * then a bar with the copyright and the language and currency.
 */
export function Footer() {
  return (
    <footer className="bg-surface pb-20">
      <h2 className="sr-only">Site footer</h2>
      <div className="grid grid-cols-3 gap-x-4 px-gutter py-12">
        {COLUMNS.map(({ title, links }) => (
          <section key={title}>
            <h3 className="mb-4 text-sm leading-[18px] font-medium">{title}</h3>
            <ul className="grid gap-4">
              {links.map(({ label, href }) => (
                <li key={label} className="leading-[18px]">
                  {href ? (
                    <Link href={href} className="hover:underline">
                      {label}
                    </Link>
                  ) : (
                    <span>{label}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mx-gutter flex flex-wrap items-center justify-between gap-4 border-t border-line-soft py-6 leading-[18px]">
        <p>
          © 2026 {SITE_NAME}
          {LEGAL.map((label) => (
            <span key={label}>
              <span aria-hidden className="px-2">
                ·
              </span>
              {label}
            </span>
          ))}
        </p>
        <div className="flex items-center gap-5 font-medium">
          <span className="inline-flex items-center gap-2">
            <Globe size={16} aria-hidden />
            English (IN)
          </span>
          <span>₹ INR</span>
          <ul className="ml-2 flex items-center gap-5">
            {SOCIAL.map(({ label, shape }) => (
              <li key={label}>
                <svg viewBox="0 0 16 16" width={16} height={16} role="img" aria-label={label}>
                  {shape}
                </svg>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
