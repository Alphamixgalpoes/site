"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SubNavItem = {
  label: string;
  href: string;
  badge?: string | number;
};

type Props = { items: SubNavItem[] };

export default function SubNav({ items }: Props) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 mb-6 -mt-2 overflow-x-auto">
      <div className="flex gap-0 min-w-max">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors
                border-b-2 -mb-px
                ${
                  active
                    ? "border-[#2e3092] text-[#2e3092]"
                    : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {item.label}
              {item.badge != null && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
