/** איורים רכים לקטגוריות — ללא תמונות קשות. */
export function CategoryArt({ icon, className = "h-full w-full" }: { icon: string | null; className?: string }) {
  const common = { viewBox: "0 0 160 72", preserveAspectRatio: "xMidYMid slice", className, "aria-hidden": true } as const;
  switch (icon) {
    case "plate": return (<svg {...common}><rect width="160" height="72" fill="#E9DFC9" /><ellipse cx="80" cy="48" rx="48" ry="13" fill="#C9A75B" opacity=".5" /><ellipse cx="80" cy="44" rx="36" ry="9" fill="#F7F2E8" /><ellipse cx="80" cy="42" rx="22" ry="5.5" fill="#B88A4A" opacity=".55" /></svg>);
    case "tent": return (<svg {...common}><rect width="160" height="72" fill="#DCE3E8" /><path d="M16 62 80 14l64 48z" fill="#F7F2E8" /><path d="M50 62 80 32l30 30z" fill="#182A4A" opacity=".22" /></svg>);
    case "home": return (<svg {...common}><rect width="160" height="72" fill="#E6E9DF" /><rect x="40" y="22" width="80" height="12" rx="6" fill="#F7F2E8" /><rect x="48" y="38" width="64" height="12" rx="6" fill="#F7F2E8" /><rect x="56" y="54" width="48" height="10" rx="5" fill="#F7F2E8" /></svg>);
    case "stone": return (<svg {...common}><rect width="160" height="72" fill="#D9D6D0" /><rect x="58" y="12" width="44" height="52" rx="7" fill="#F7F2E8" /><rect x="66" y="26" width="28" height="3" fill="#C9A75B" /><rect x="70" y="35" width="20" height="3" fill="#C9A75B" opacity=".6" /></svg>);
    case "flower": return (<svg {...common}><rect width="160" height="72" fill="#E3E8E0" /><path d="M80 60c-6-12-22-14-26-26 10-2 20 4 26 14 6-10 16-16 26-14-4 12-20 14-26 26z" fill="#F7F2E8" /><circle cx="80" cy="44" r="4.5" fill="#C9A75B" /></svg>);
    case "calendar": return (<svg {...common}><rect width="160" height="72" fill="#E9E1D2" /><circle cx="80" cy="38" r="22" fill="none" stroke="#F7F2E8" strokeWidth="6" /><path d="M80 24v14l9 6" stroke="#C9A75B" strokeWidth="3" fill="none" strokeLinecap="round" /></svg>);
    default: return (<svg {...common}><rect width="160" height="72" fill="#EFE3C3" /><circle cx="80" cy="36" r="14" fill="#F7F2E8" /></svg>);
  }
}
