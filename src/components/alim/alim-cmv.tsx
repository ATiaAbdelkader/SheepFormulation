"use client";

import { useMemo, useState } from "react";
import { alimData, num, fmt, type CMVRecord } from "@/lib/alim-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, Info } from "lucide-react";

export function AlimCMV() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    return alimData.cmvs.filter((c) =>
      !search || c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  // The CMV name is like "5 - 20" meaning Ca=5% P=20%
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Pill className="h-5 w-5 text-rose-700" />
          CMV — Compléments Minéraux Vitaminés
        </h2>
        <p className="text-sm text-stone-500">
          {alimData.cmvs.length} CMV référencés. Le nom indique la teneur en Ca et P (ex: &quot;5 - 20&quot;
          = 5% Ca, 20% P). Choisissez le CMV dont le rapport Ca/P est le plus proche du déficit.
        </p>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-4 text-sm text-stone-700">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-emerald-700 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-emerald-900 mb-1">Comment choisir un CMV ?</p>
              <p className="text-xs leading-relaxed">
                Calculez d&apos;abord le déficit en Pabs et Caabs de la ration. Le rapport Ca/P du déficit
                oriente le choix : si le déficit est principalement en P, choisissez un CMV riche en P
                (ex: &quot;0 - 27&quot;); si le déficit est en Ca, choisissez un CMV riche en Ca (ex: &quot;12 - 12&quot;).
                La quantité de CMV est ajustée pour combler 100% du déficit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c, i) => (
          <CMVCard key={i} c={c} />
        ))}
        {filtered.length === 0 && (
          <Card className="col-span-full border-stone-200">
            <CardContent className="p-8 text-center text-sm text-stone-500">
              Aucun CMV trouvé.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CMVCard({ c }: { c: CMVRecord }) {
  // Parse "5 - 20" format
  const parts = c.name.split("-").map((s) => s.trim());
  const caPct = num(c.ca_pct);
  const pPct = num(c.p_pct);
  const ratio = num(c.ca_p_ratio);

  return (
    <Card className="border-stone-200 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-stone-900">
            CMV {c.name}
          </CardTitle>
          <Badge variant="outline" className="bg-rose-50 text-rose-700 text-[10px]">
            Ca/P = {ratio !== null ? (ratio < 1 ? fmt(ratio, 2) : fmt(ratio, 1)) : "—"}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {caPct !== null && pPct !== null ? (
            <>Calcium {fmt(caPct, 0)}% — Phosphore {fmt(pPct, 0)}%</>
          ) : (
            <>Composition disponible ci-dessous</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-stone-50 p-2">
          <div className="text-stone-500">Pabs / kg</div>
          <div className="text-sm font-semibold text-stone-900">{fmt(num(c.pabs_per_kg), 1)} g</div>
        </div>
        <div className="rounded-md bg-stone-50 p-2">
          <div className="text-stone-500">Caabs / kg</div>
          <div className="text-sm font-semibold text-stone-900">{fmt(num(c.caabs_per_kg), 1)} g</div>
        </div>
        {caPct !== null && (
          <div className="rounded-md bg-rose-50 p-2">
            <div className="text-rose-600">Ca total</div>
            <div className="text-sm font-semibold text-rose-900">{fmt(caPct, 0)} g/kg</div>
          </div>
        )}
        {pPct !== null && (
          <div className="rounded-md bg-amber-50 p-2">
            <div className="text-amber-600">P total</div>
            <div className="text-sm font-semibold text-amber-900">{fmt(pPct, 0)} g/kg</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
