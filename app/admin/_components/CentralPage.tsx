"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Stat = {
  label: string;
  value: string | number;
  color?: "green" | "amber" | "red" | "blue" | "gray";
};

type Lens = {
  label: string;
  href: string;
  description: string;
  icon: ReactNode;
};

type Props = {
  title: string;
  subtitle?: string;
  stats?: Stat[];
  lenses: Lens[];
  children?: ReactNode;
};

const statColors: Record<string, string> = {
  green: "text-green-700 bg-green-50 border-green-200",
  amber: "text-amber-700 bg-amber-50 border-amber-200",
  red: "text-red-700 bg-red-50 border-red-200",
  blue: "text-blue-700 bg-blue-50 border-blue-200",
  gray: "text-gray-700 bg-gray-50 border-gray-200",
};

export default function CentralPage({ title, subtitle, stats, lenses, children }: Props) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      {/* Stats */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`border px-4 py-3 ${statColors[s.color ?? "gray"]}`}
            >
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-xs mt-0.5 opacity-70">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lenses */}
      <div className="flex gap-6 overflow-x-auto pb-1 -mx-1 px-1">
        {lenses.map((lens) => (
          <Link
            key={lens.href}
            href={lens.href}
            className="shrink-0 flex flex-col items-center gap-1.5 group"
          >
            <div className="w-14 h-14 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 group-hover:border-[#2e3092] group-hover:text-[#2e3092] transition-colors">
              {lens.icon}
            </div>
            <span className="text-xs text-gray-600 group-hover:text-[#2e3092] transition-colors font-medium">
              {lens.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Extra content */}
      {children}
    </div>
  );
}
