import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  usePreviewScan, 
  useCreateTransaction, 
  useCreateScan, 
  useGetScanHistory,
  getGetScanHistoryQueryKey,
  ScanResult,
  ScanHistoryItem
} from "@workspace/api-client-react";
import jsPDF from "jspdf";
import { 
  CheckCircle2, AlertTriangle, XCircle, Trash2, Plus, 
  FileText, ArrowRight, Loader2, Download, Search, AlertCircle 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// Make sure you replace this with your actual client key in the HTML or env
// We defined window.snap.pay in types.

// ----- SCHEMAS -----
const previewSchema = z.object({
  content: z.string().min(10, "Masukkan minimal 10 karakter untuk di-preview"),
});

const scanBerbayarSchema = z.object({
  email: z.string().email("Email tidak valid"),
  documents: z.array(
    z.object({
      title: z.string().min(1, "Judul dokumen wajib diisi"),
      content: z.string().min(10, "Isi dokumen wajib diisi"),
    })
  ).min(1, "Minimal 1 dokumen").max(5, "Maksimal 5 dokumen sekaligus"),
});

type ScanBerbayarFormValues = z.infer<typeof scanBerbayarSchema>;

// ── Package config ────────────────────────────────────────────────────────────
const PACKAGE_CONFIG = {
  single: { label: "Sekali Pakai", price: 15000, maxDocs: 1, credits: 1 },
  hemat:  { label: "Paket Hemat",  price: 65000, maxDocs: 5, credits: 5 },
} as const;
type PackageKey = keyof typeof PACKAGE_CONFIG;

function getPackageFromUrl(): PackageKey {
  const params = new URLSearchParams(window.location.search);
  const pkg = params.get("package");
  return pkg === "hemat" ? "hemat" : "single";
}

export default function AppToolPage() {
  const [activeTab, setActiveTab] = useState<'preview' | 'scan' | 'hasil' | 'riwayat'>('preview');
  const [selectedPackage, setSelectedPackage] = useState<PackageKey>(getPackageFromUrl);

  // Results states
  const [previewResult, setPreviewResult] = useState<{wordCount: number, sentenceCount: number, localOverlapPercent: number} | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });

  // History state
  const [historyEmail, setHistoryEmail] = useState("");
  const [searchHistoryTrigger, setSearchHistoryTrigger] = useState(false);

  // Hooks
  const previewScan = usePreviewScan();
  const createTx = useCreateTransaction();
  const createScan = useCreateScan();
  
  const { data: historyData, isLoading: isLoadingHistory } = useGetScanHistory(
    { email: historyEmail },
    { query: { queryKey: getGetScanHistoryQueryKey({ email: historyEmail }), enabled: searchHistoryTrigger && !!historyEmail } }
  );

  // Forms
  const formPreview = useForm({
    resolver: zodResolver(previewSchema),
    defaultValues: { content: "" },
  });

  const formScan = useForm<ScanBerbayarFormValues>({
    resolver: zodResolver(scanBerbayarSchema),
    defaultValues: { 
      email: "", 
      documents: [{ title: "", content: "" }] 
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: formScan.control,
    name: "documents",
  });

  // Actions
  const onPreviewSubmit = (values: { content: string }) => {
    previewScan.mutate({ data: { content: values.content } }, {
      onSuccess: (data) => {
        setPreviewResult(data);
      }
    });
  };

  const copyToScanBerbayar = () => {
    const previewContent = formPreview.getValues("content");
    if (previewContent) {
      // Overwrite first doc
      formScan.setValue("documents.0.content", previewContent);
    }
    setActiveTab('scan');
    document.getElementById('scan-berbayar')?.scrollIntoView({ behavior: 'smooth' });
  };

  const onScanBerbayarSubmit = (values: ScanBerbayarFormValues) => {
    const pkgCfg = PACKAGE_CONFIG[selectedPackage];
    // Enforce doc count limit per package (trim silently if somehow over limit)
    const docs = values.documents.slice(0, pkgCfg.maxDocs);

    // 1. Create Transaction
    createTx.mutate({ data: { email: values.email, package: selectedPackage } }, {
      onSuccess: (txData) => {
        // 2. Open Midtrans Snap
        if (window.snap) {
          window.snap.pay(txData.snapToken, {
            onSuccess: async (result) => {
              // 3. Process documents sequentially
              setActiveTab('hasil');
              setIsScanning(true);
              setScanResults([]);
              setScanProgress({ current: 0, total: docs.length });
              
              const newResults: ScanResult[] = [];
              
              // SEQUENTIAL LOOP - Important so first doc saves to DB before second doc is checked against it
              for (let i = 0; i < docs.length; i++) {
                const doc = docs[i];
                setScanProgress({ current: i + 1, total: values.documents.length });
                
                try {
                  const res = await createScan.mutateAsync({
                    data: {
                      orderId: txData.orderId,
                      title: doc.title,
                      content: doc.content
                    }
                  });
                  newResults.push(res);
                  setScanResults([...newResults]);
                } catch (err) {
                  console.error("Failed scanning doc", i, err);
                  // Push a fake error result or handle it
                }
              }
              
              setIsScanning(false);
              document.getElementById('hasil-scan')?.scrollIntoView({ behavior: 'smooth' });
            },
            onPending: (result) => {
              toast({
                title: "Menunggu pembayaran",
                description: "Silakan selesaikan pembayaran Anda.",
              });
            },
            onError: (result) => {
              toast({
                title: "Pembayaran gagal",
                description: "Silakan coba lagi.",
                variant: "destructive",
              });
            },
            onClose: () => {
              console.log("Customer closed the popup without finishing the payment");
            }
          });
        } else {
          toast({
            title: "Midtrans belum siap",
            description: "Midtrans Snap belum termuat. Silakan refresh halaman dan coba lagi.",
            variant: "destructive",
          });
        }
      },
      onError: (err) => {
        const message =
          (err as any)?.error ??
          (err as any)?.message ??
          (err as any)?.response?.data?.error ??
          "Unknown error";
        toast({
          title: "Gagal membuat transaksi",
          description: String(message),
          variant: "destructive",
        });
      }
    });
  };

  const generatePDF = (result: ScanResult) => {
    const doc = new jsPDF();
    const docTitle = result.localMatches?.[0]?.title || result.documentId.substring(0,8);
    const safeTitle = String(docTitle);
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 114, 86); // emerald primary
    doc.text("LAPORAN SCAN KEMIRIPAN - AJOR.Scan", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`Judul Dokumen: ${safeTitle}`, 20, 30);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`, 20, 37);
    
    // Score
    doc.setFontSize(16);
    doc.text("Ringkasan Hasil:", 20, 50);
    
    doc.setFontSize(24);
    let scoreColor = result.originalityScore >= 80 ? [30, 114, 86] : result.originalityScore >= 50 ? [201, 131, 46] : [194, 75, 63];
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.text(`Skor Orisinalitas: ${result.originalityScore}%`, 20, 60);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Kemiripan Database Lokal: ${result.localOverlapPercent}%`, 20, 70);
    doc.text(`Kemiripan Sumber Web: ${result.webMatchPercent}%`, 20, 77);
    
    // Local Matches
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(14);
    doc.text("Sumber Kecocokan Database:", 20, 95);
    doc.setFontSize(10);
    let y = 105;
    if (result.localMatches.length === 0) {
      doc.text("- Tidak ada kecocokan signifikan dengan database.", 20, y);
      y += 10;
    } else {
      result.localMatches.forEach((m, i) => {
        doc.text(`${i+1}. [${m.containment}%] Dokumen: ${m.title || m.documentId}`, 20, y);
        y += 8;
      });
    }
    
    // Web Matches
    y += 10;
    doc.setFontSize(14);
    doc.text("Sumber Kecocokan Internet:", 20, y);
    y += 10;
    doc.setFontSize(10);
    
    const matchedWeb = result.webResults.filter(w => w.matched);
    if (matchedWeb.length === 0) {
      doc.text("- Tidak ditemukan kemiripan di internet.", 20, y);
    } else {
      matchedWeb.slice(0, 15).forEach((w, i) => { // limit so it fits page roughly
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setTextColor(50, 50, 50);
        const sentencePreview = w.sentence.substring(0, 80) + (w.sentence.length > 80 ? "..." : "");
        doc.text(`${i+1}. Kalimat: "${sentencePreview}"`, 20, y);
        y += 6;
        doc.setTextColor(30, 114, 86);
        doc.text(`   Sumber: ${w.source_url || "Unknown URL"}`, 20, y);
        y += 10;
      });
    }
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Dibuat oleh AJOR.Scan — bukan afiliasi Turnitin resmi. Hasil bersifat indikatif.", 20, 290);
    
    doc.save(`laporan-scan-${safeTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return "text-primary border-primary";
    if (score >= 50) return "text-amber-500 border-amber-500";
    return "text-destructive border-destructive";
  };

  const getScoreBgClass = (score: number) => {
    if (score >= 80) return "bg-primary text-white";
    if (score >= 50) return "bg-amber-500 text-white";
    return "bg-destructive text-white";
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight text-primary flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-sm font-black">A</span>
            AJOR.Scan
          </Link>
          <div className="text-sm font-medium text-muted-foreground flex gap-4 hidden md:flex">
            <a href="#preview-gratis" className="hover:text-foreground">Preview</a>
            <a href="#scan-berbayar" className="hover:text-foreground">Scan Penuh</a>
            <a href="#riwayat-scan" className="hover:text-foreground">Riwayat</a>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-4xl mt-8 flex flex-col gap-12">
        
        {/* FITUR A: PREVIEW GRATIS */}
        <section id="preview-gratis" className="scroll-mt-24">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Preview Gratis</h2>
            <p className="text-muted-foreground">Cek format dan hitungan kata sebelum melakukan scan berbayar.</p>
          </div>
          
          <Card className="border-border shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={formPreview.handleSubmit(onPreviewSubmit)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Textarea 
                    {...formPreview.register("content")} 
                    placeholder="Tempel isi dokumenmu di sini untuk preview gratis... (Hanya mengecek struktur, bukan internet)"
                    className="min-h-[200px] text-base resize-y"
                  />
                  {formPreview.formState.errors.content && (
                    <span className="text-sm text-destructive font-medium flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {formPreview.formState.errors.content.message}
                    </span>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={previewScan.isPending}
                  className="w-full md:w-auto self-start"
                >
                  {previewScan.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
                  Cek Gratis (Preview)
                </Button>
              </form>

              {previewResult && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-accent rounded-xl p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-black text-primary">{previewResult.wordCount}</span>
                      <span className="text-sm font-medium text-primary/80">Kata</span>
                    </div>
                    <div className="bg-accent rounded-xl p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-black text-primary">{previewResult.sentenceCount}</span>
                      <span className="text-sm font-medium text-primary/80">Kalimat</span>
                    </div>
                    <div className="bg-slate-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-black text-slate-700">{previewResult.localOverlapPercent}%</span>
                      <span className="text-sm font-medium text-slate-500 leading-tight mt-1">Kemiripan Awal<br/>(Lokal)</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-emerald-900">Siap untuk hasil akurat?</h4>
                      <p className="text-sm text-emerald-700 mt-1">Lanjutkan ke scan penuh untuk mengecek kemiripan dengan miliaran sumber internet.</p>
                    </div>
                    <Button onClick={copyToScanBerbayar} className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white w-full md:w-auto">
                      Lanjut Scan Lengkap <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* FITUR B: SCAN BERBAYAR */}
        <section id="scan-berbayar" className="scroll-mt-24">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                Scan Lengkap <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary">Berbayar</span>
              </h2>
              <p className="text-muted-foreground">Scan mendalam terhadap database dan sumber web publik.</p>
            </div>
          </div>

          <Card className="border-border shadow-md overflow-hidden relative">
            {/* Top accent bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-primary"></div>
            
            <form onSubmit={formScan.handleSubmit(onScanBerbayarSubmit)}>
              <CardContent className="pt-8 flex flex-col gap-8">

                {/* Package Selector */}
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-foreground">Pilih Paket</label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {(Object.entries(PACKAGE_CONFIG) as [PackageKey, typeof PACKAGE_CONFIG[PackageKey]][]).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedPackage(key);
                          // Trim documents to new max if needed
                          const current = formScan.getValues("documents");
                          if (current.length > cfg.maxDocs) {
                            formScan.setValue("documents", current.slice(0, cfg.maxDocs));
                          }
                        }}
                        className={cn(
                          "text-left p-4 rounded-xl border-2 transition-all",
                          selectedPackage === key
                            ? "border-primary bg-accent"
                            : "border-border bg-white hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">{cfg.label}</span>
                          {key === "hemat" && (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">HEMAT</span>
                          )}
                        </div>
                        <span className="text-xl font-extrabold text-primary">
                          Rp {cfg.price.toLocaleString('id-ID')}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          {cfg.credits === 1 ? "1 scan dokumen" : `${cfg.credits} scan dokumen`}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Section */}
                <div className="bg-slate-50 p-6 rounded-xl border">
                  <label className="block text-sm font-bold text-foreground mb-2">Email Pengiriman Resi & Riwayat</label>
                  <Input 
                    {...formScan.register("email")}
                    placeholder="nama@kampus.ac.id" 
                    className="max-w-md bg-white"
                  />
                  {formScan.formState.errors.email && (
                    <span className="text-sm text-destructive font-medium mt-1 block">{formScan.formState.errors.email.message}</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">Pastikan email aktif agar bisa melihat riwayat scan nanti.</p>
                </div>

                {/* Documents List */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Dokumen Anda</h3>
                    <span className="text-sm text-muted-foreground font-medium">{fields.length} / 5 Dokumen</span>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-xl p-5 bg-white relative animate-in fade-in duration-300 shadow-sm">
                      {fields.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => remove(index)}
                          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-destructive text-white flex items-center justify-center shadow hover:bg-red-700 transition-colors z-10"
                          title="Hapus dokumen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="block text-sm font-bold text-foreground mb-1.5 flex items-center justify-between">
                            Judul Dokumen #{index + 1}
                          </label>
                          <Input 
                            {...formScan.register(`documents.${index}.title` as const)}
                            placeholder="Contoh: Bab 1 Pendahuluan" 
                          />
                          {formScan.formState.errors.documents?.[index]?.title && (
                            <span className="text-sm text-destructive font-medium mt-1 block">{formScan.formState.errors.documents[index]?.title?.message}</span>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-bold text-foreground mb-1.5">Isi Teks</label>
                          <Textarea 
                            {...formScan.register(`documents.${index}.content` as const)}
                            placeholder="Tempel teks di sini..." 
                            className="min-h-[150px] resize-y"
                          />
                          {formScan.formState.errors.documents?.[index]?.content && (
                            <span className="text-sm text-destructive font-medium mt-1 block">{formScan.formState.errors.documents[index]?.content?.message}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {fields.length < PACKAGE_CONFIG[selectedPackage].maxDocs && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => append({ title: "", content: "" })}
                      className="border-dashed border-2 h-14 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Plus className="w-5 h-5 mr-2" /> Tambah Dokumen Lain
                    </Button>
                  )}
                </div>
              </CardContent>
              
              <div className="bg-slate-50 p-6 border-t mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-muted-foreground">Total:</span>
                  <span className="text-3xl font-black text-foreground">
                    Rp {PACKAGE_CONFIG[selectedPackage].price.toLocaleString('id-ID')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({PACKAGE_CONFIG[selectedPackage].label} — {PACKAGE_CONFIG[selectedPackage].credits} scan)
                  </span>
                </div>
                
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full md:w-auto h-14 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                  disabled={createTx.isPending || isScanning}
                >
                  {createTx.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Memproses...</>
                  ) : (
                    <>Bayar & Scan Lengkap</>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </section>

        {/* FITUR C: HASIL SCAN */}
        {(isScanning || scanResults.length > 0) && (
          <section id="hasil-scan" className="scroll-mt-24 pt-8 border-t-2 border-dashed">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">Hasil Scan Lengkap</h2>
              <p className="text-muted-foreground">Rincian kemiripan dokumen dengan miliaran sumber internet.</p>
            </div>

            {isScanning && (
              <Card className="mb-8 border-primary/20 bg-primary/5">
                <CardContent className="pt-6 flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative w-24 h-24 mb-6">
                    <Loader2 className="w-24 h-24 text-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-primary">
                      {Math.round((scanProgress.current / scanProgress.total) * 100)}%
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Sedang Melakukan Scan</h3>
                  <p className="text-muted-foreground mt-2">Menganalisis dokumen {scanProgress.current} dari {scanProgress.total}...</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">Proses ini memakan waktu beberapa detik per dokumen untuk akurasi maksimal.</p>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col gap-8">
              {scanResults.map((result, idx) => {
                const docTitle = result.localMatches?.[0]?.title || `Dokumen #${idx+1}`; // Assuming api might pass title back in localMatches if it's the saved doc. Actually, API doesn't return the title cleanly at top level in ScanResult, let's use idx. Let's just use what form had.
                const formTitle = formScan.getValues(`documents.${idx}.title`);
                const displayTitle = formTitle || "Dokumen " + (idx+1);

                return (
                <Card key={result.documentId} className="border-border shadow-lg overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start">
                    
                    {/* Ring Score */}
                    <div className="w-full md:w-1/3 flex flex-col items-center justify-center bg-slate-50 p-6 rounded-2xl border">
                      <h4 className="font-bold text-center mb-6 text-slate-600 uppercase tracking-wider text-xs">Skor Orisinalitas</h4>
                      <div className={cn(
                        "w-40 h-40 rounded-full border-8 flex items-center justify-center bg-white shadow-inner",
                        getScoreColorClass(result.originalityScore)
                      )}>
                        <span className="text-5xl font-black">{result.originalityScore}%</span>
                      </div>
                      <div className="mt-6 flex flex-col gap-2 w-full">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-muted-foreground">Kemiripan Web</span>
                          <span className="text-destructive font-bold">{result.webMatchPercent}%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-muted-foreground">Kemiripan Database</span>
                          <span className="text-amber-600 font-bold">{result.localOverlapPercent}%</span>
                        </div>
                      </div>
                      
                      <Button onClick={() => generatePDF(result)} variant="outline" className="w-full mt-6 flex gap-2 font-semibold">
                        <Download className="w-4 h-4" /> Unduh Laporan PDF
                      </Button>
                    </div>

                    {/* Details */}
                    <div className="w-full md:w-2/3 flex flex-col gap-6">
                      <div className="border-b pb-4">
                        <h3 className="text-2xl font-bold text-foreground">{displayTitle}</h3>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">ID: {result.documentId}</p>
                      </div>

                      {/* Web Matches */}
                      <div>
                        <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                          <AlertTriangle className={cn("w-5 h-5", result.webMatchPercent > 0 ? "text-destructive" : "text-muted-foreground")} /> 
                          Temuan Internet
                        </h4>
                        
                        {result.webResults.filter(w => w.matched).length > 0 ? (
                          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {result.webResults.filter(w => w.matched).map((match, i) => (
                              <div key={i} className="bg-red-50 border border-red-100 p-3 rounded-lg text-sm">
                                <p className="text-slate-800 mb-2 font-medium">"... {match.sentence} ..."</p>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                  <a href={match.source_url || "#"} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-medium truncate max-w-[80%]">
                                    <FileText className="w-3 h-3 shrink-0" />
                                    {match.source_url ? new URL(match.source_url).hostname : "Sumber Web"}
                                  </a>
                                  <span className="text-red-600 font-bold shrink-0">{match.confidence}% Identik</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-slate-50 border p-4 rounded-lg flex items-center gap-3 text-emerald-700">
                            <CheckCircle2 className="w-5 h-5" />
                            <p className="font-medium text-sm">Aman. Tidak ditemukan kemiripan di internet.</p>
                          </div>
                        )}
                      </div>

                      {/* Local Matches */}
                      <div>
                        <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-muted-foreground" /> 
                          Temuan Database Internal
                        </h4>
                        {result.localMatches.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {result.localMatches.map((match, i) => (
                              <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 text-sm">
                                <span className="font-medium text-slate-700 truncate mr-4">{match.title || match.documentId}</span>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">{match.containment}% Mirip</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-slate-50 border p-4 rounded-lg flex items-center gap-3 text-emerald-700">
                            <CheckCircle2 className="w-5 h-5" />
                            <p className="font-medium text-sm">Aman. Tidak ada dokumen serupa di database kami.</p>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </Card>
              )})}
            </div>
          </section>
        )}

        {/* FITUR D: RIWAYAT SCAN */}
        <section id="riwayat-scan" className="scroll-mt-24 pt-8 border-t pb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Riwayat Scan Saya</h2>
            <p className="text-muted-foreground">Lihat kembali skor orisinalitas dari dokumen yang pernah Anda scan.</p>
          </div>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Input 
                  placeholder="Masukkan email saat transaksi..." 
                  value={historyEmail}
                  onChange={(e) => {
                    setHistoryEmail(e.target.value);
                    setSearchHistoryTrigger(false);
                  }}
                  className="max-w-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSearchHistoryTrigger(true);
                  }}
                />
                <Button 
                  onClick={() => setSearchHistoryTrigger(true)}
                  disabled={!historyEmail || isLoadingHistory}
                >
                  {isLoadingHistory ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Cari Riwayat
                </Button>
              </div>

              {searchHistoryTrigger && (
                <div className="animate-in fade-in duration-300">
                  {isLoadingHistory ? (
                    <div className="py-8 flex justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : historyData && historyData.length > 0 ? (
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-6 py-4 font-bold">Judul Dokumen</th>
                            <th className="px-6 py-4 font-bold">Tanggal Scan</th>
                            <th className="px-6 py-4 font-bold text-right">Skor Orisinalitas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {historyData.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">{item.documentTitle || "Dokumen Tanpa Judul"}</td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {new Date(item.scanDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-xs font-bold",
                                  getScoreBgClass(item.originalityScore)
                                )}>
                                  {item.originalityScore}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="font-bold text-lg text-slate-700">Tidak Ada Riwayat</h3>
                      <p className="text-muted-foreground">Kami tidak menemukan riwayat scan untuk email ini dalam 30 hari terakhir.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}
