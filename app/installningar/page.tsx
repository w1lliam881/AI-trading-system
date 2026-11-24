import type { Metadata } from "next";
import { getWatchlist } from "@/lib/watchlist";
import { getWeights, DEFAULT_WEIGHTS } from "@/lib/settings";
import { loadLexicon } from "@/lib/analysis/sentiment";
import { PageTitle } from "@/components/page-title";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { WatchlistEditor } from "@/components/settings/watchlist-editor";
import { WeightsEditor } from "@/components/settings/weights-editor";
import { LexiconEditor } from "@/components/settings/lexicon-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inställningar" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageTitle title="Inställningar" subtitle="Bevakningslista, poängvikter och sentimentordlista. Bottens regler och avgifter läggs till i fas 5–6." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Bevakningslista" subtitle="Bolagen som analyseras, poängsätts och (senare) handlas av Botten" />
          <CardBody><WatchlistEditor items={getWatchlist()} /></CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Poängvikter" subtitle="Hur mycket varje delpoäng väger i totalpoängen" />
            <CardBody><WeightsEditor initial={getWeights()} defaults={DEFAULT_WEIGHTS} /></CardBody>
          </Card>
          <Card>
            <CardHeader title="Sentimentordlista" subtitle="Ord som gör en rubrik positiv (grön) eller negativ (röd)" />
            <CardBody><LexiconEditor initial={loadLexicon().words} /></CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
