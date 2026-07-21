import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type UnderConstructionPageProps = {
  title: string;
};

export default function UnderConstructionPage({ title }: UnderConstructionPageProps) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight text-primary flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-sm font-black">A</span>
            AJOR.Scan
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-8 pb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">{title}</h1>
            <p className="text-muted-foreground text-lg">Halaman ini sedang disiapkan.</p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className="rounded-xl">
                <Link href="/">Kembali ke Beranda</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

