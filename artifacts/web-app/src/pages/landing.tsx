import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ChevronRight, Menu } from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight text-primary flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-sm font-black">A</span>
            AJOR.Scan
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button onClick={() => scrollTo('cara-kerja')} className="text-muted-foreground hover:text-foreground transition-colors">Cara Kerja</button>
            <button onClick={() => scrollTo('harga')} className="text-muted-foreground hover:text-foreground transition-colors">Harga</button>
            <button onClick={() => scrollTo('faq')} className="text-muted-foreground hover:text-foreground transition-colors">FAQ</button>
          </nav>
          
          <div className="hidden md:flex items-center gap-4">
            <Link href="/app" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-emerald-800 h-10 px-5">
              Mulai Scan
            </Link>
          </div>

          <button className="md:hidden p-2 text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        {mobileMenuOpen && (
          <div className="md:hidden border-b bg-background px-4 py-4 flex flex-col gap-4 shadow-lg absolute w-full">
            <button onClick={() => scrollTo('cara-kerja')} className="text-left font-medium p-2">Cara Kerja</button>
            <button onClick={() => scrollTo('harga')} className="text-left font-medium p-2">Harga</button>
            <button onClick={() => scrollTo('faq')} className="text-left font-medium p-2">FAQ</button>
            <Link href="/app" className="w-full text-center py-3 bg-primary text-white rounded-lg font-medium mt-2">
              Mulai Scan
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="pt-24 pb-32 overflow-hidden relative">
          {/* Subtle animated blobs — hero only, respects prefers-reduced-motion */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="hero-blob hero-blob-1" />
            <div className="hero-blob hero-blob-2" />
            <div className="hero-blob hero-blob-3" />
          </div>
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/50 via-background to-background"></div>
          
          <div className="container mx-auto px-4 md:px-8 grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-accent text-primary mb-6">
                Lebih akurat dari cek gratisan biasa
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]">
                Cek orisinalitas tulisanmu, sebelum dosen yang cek.
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl">
                Alat cek kemiripan dokumen andalan mahasiswa Indonesia. Dapatkan persentase 
                akurat dan sumber kutipan yang terlupa, tanpa perlu langganan bulanan yang mahal. 
                Satu harga jujur per dokumen.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/app" className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-emerald-800 h-14 px-8">
                  Mulai Scan Sekarang <ChevronRight className="ml-2 w-5 h-5" />
                </Link>
                <button onClick={() => scrollTo('harga')} className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-14 px-8">
                  Lihat Harga
                </button>
              </div>
              
              <div className="mt-10 flex items-center gap-3 text-sm font-medium text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <p>Bayar hanya saat kamu butuh. Tidak perlu akun, tidak perlu langganan.</p>
              </div>
            </div>
            
            <div className="relative flex items-center justify-center lg:justify-end">
              <div className="w-[320px] h-[320px] md:w-[400px] md:h-[400px] rounded-full border-4 border-dashed border-accent flex items-center justify-center relative shadow-2xl bg-white">
                <div className="absolute inset-0 rounded-full border-[12px] border-primary" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 50%)', transform: 'rotate(-45deg)' }}></div>
                <div className="text-center z-10 flex flex-col items-center justify-center bg-white w-full h-full rounded-full border-8 border-transparent">
                  <span className="text-6xl md:text-7xl font-black text-primary tracking-tighter">94%</span>
                  <span className="text-lg md:text-xl font-bold text-foreground mt-2">Orisinal</span>
                  <span className="text-sm text-muted-foreground mt-1 max-w-[200px]">6% kemiripan terdeteksi pada 3 sumber web</span>
                </div>
                
                {/* Decorative floating elements */}
                <div className="absolute -top-6 -right-6 bg-white p-4 rounded-xl shadow-lg border animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="flex gap-2 items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-xs font-bold">Kutipan lupa disitasi</span>
                  </div>
                </div>
                <div className="absolute -bottom-8 -left-8 bg-white p-4 rounded-xl shadow-lg border animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                  <div className="flex gap-2 items-center">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary">Aman dikumpulkan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CARA KERJA */}
        <section id="cara-kerja" className="py-24 bg-white border-y">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">Proses Cepat & Transparan</h2>
              <p className="text-muted-foreground text-lg">Tidak perlu buat akun yang ribet. Cukup siapkan dokumenmu dan dapatkan hasilnya dalam hitungan detik.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-muted z-0"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl bg-accent text-primary flex items-center justify-center text-3xl font-black mb-6 shadow-sm border border-primary/10">1</div>
                <h3 className="text-xl font-bold mb-3">Tempel Dokumen</h3>
                <p className="text-muted-foreground">Copy-paste isi laporan, makalah, atau skripsimu ke dalam editor kami. Tersedia fitur preview gratis.</p>
              </div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl bg-accent text-primary flex items-center justify-center text-3xl font-black mb-6 shadow-sm border border-primary/10">2</div>
                <h3 className="text-xl font-bold mb-3">Bayar Sekali</h3>
                <p className="text-muted-foreground">Pilih paket dan bayar langsung dengan QRIS, Gopay, atau Virtual Account. Tanpa komitmen langganan.</p>
              </div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl bg-primary text-white flex items-center justify-center text-3xl font-black mb-6 shadow-md">3</div>
                <h3 className="text-xl font-bold mb-3">Terima Hasil</h3>
                <p className="text-muted-foreground">Dapatkan persentase skor kemiripan, rincian sumber yang identik, beserta laporan PDF yang bisa diunduh.</p>
              </div>
            </div>
          </div>
        </section>

        {/* HARGA */}
        <section id="harga" className="py-24 bg-background">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">Harga Jujur Mahasiswa</h2>
              <p className="text-muted-foreground text-lg">Bayar hanya saat kamu butuh. Tidak ada biaya tersembunyi, tidak ada tagihan otomatis bulan depan.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Card 1 */}
              <Card className="flex flex-col relative overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Sekali Pakai</CardTitle>
                  <p className="text-sm text-muted-foreground">Cocok untuk cek makalah harian.</p>
                </CardHeader>
                <CardContent className="pb-6">
                  <div className="flex items-baseline mb-6">
                    <span className="text-4xl font-extrabold tracking-tight">Rp 15.000</span>
                    <span className="text-muted-foreground ml-2">/ sesi</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-primary shrink-0"/> 1x Scan Dokumen Lengkap</li>
                    <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-primary shrink-0"/> Pengecekan Database + Web</li>
                    <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-primary shrink-0"/> Unduh Laporan PDF</li>
                    <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-primary shrink-0"/> Akses Riwayat 30 Hari</li>
                  </ul>
                </CardContent>
                <div className="mt-auto p-6 pt-0">
                  <Link href="/app?package=single" className="flex items-center justify-center w-full h-11 rounded-lg border-2 border-primary text-primary font-bold hover:bg-accent transition-colors">
                    Pilih Paket
                  </Link>
                </div>
              </Card>

              {/* Card 2 */}
              <Card className="flex flex-col relative overflow-hidden border-primary shadow-lg scale-100 md:scale-105 z-10 bg-white">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-primary"></div>
                <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Populer
                </div>
                <CardHeader className="pb-4 pt-8">
                  <CardTitle className="text-xl">Paket Hemat</CardTitle>
                  <p className="text-sm text-muted-foreground">Untuk masa-masa skripsi intensif.</p>
                </CardHeader>
                <CardContent className="pb-6">
                  <div className="flex items-baseline mb-1">
                    <span className="text-4xl font-extrabold tracking-tight text-primary">Rp 65.000</span>
                  </div>
                  <p className="text-sm font-medium text-emerald-600 mb-6">Untuk 5 sesi (Hemat Rp 10.000)</p>
                  
                  <ul className="space-y-3 mb-6">
                    <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-primary shrink-0"/> 5x Scan Dokumen Lengkap</li>
                    <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-primary shrink-0"/> Scan Sekaligus Hingga 5 Dok</li>
                    <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-primary shrink-0"/> Pengecekan Database + Web</li>
                    <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-primary shrink-0"/> Unduh Laporan PDF Lengkap</li>
                  </ul>
                </CardContent>
                <div className="mt-auto p-6 pt-0">
                  <Link href="/app?package=hemat" className="flex items-center justify-center w-full h-12 rounded-lg bg-primary text-white font-bold hover:bg-emerald-800 transition-colors shadow-md">
                    Beli Paket Hemat
                  </Link>
                </div>
              </Card>

              {/* Card 3 */}
              <Card className="flex flex-col relative overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Kampus / Organisasi</CardTitle>
                  <p className="text-sm text-muted-foreground">Untuk kepanitiaan atau institusi.</p>
                </CardHeader>
                <CardContent className="pb-6">
                  <div className="flex items-baseline mb-6">
                    <span className="text-2xl font-extrabold tracking-tight">Hubungi Kami</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0"/> Volume besar (&gt;50 scan)</li>
                    <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0"/> Harga khusus institusi</li>
                    <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0"/> Dashboard admin khusus</li>
                  </ul>
                </CardContent>
                <div className="mt-auto p-6 pt-0">
                  <button className="flex items-center justify-center w-full h-11 rounded-lg border border-input text-foreground font-medium hover:bg-accent transition-colors">
                    Kontak Sales
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* TESTIMONI */}
        {/* Testimoni section — disembunyikan sampai ada testimoni asli dari pengguna nyata */}

        {/* FAQ */}
        <section id="faq" className="py-24 bg-background">
          <div className="container mx-auto px-4 md:px-8 max-w-3xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">Pertanyaan Umum</h2>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-base">Apakah ini afiliasi resmi Turnitin?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Tidak, AJOR.Scan adalah layanan independen dan tidak berafiliasi dengan Turnitin® atau penyedia layanan kampus manapun. Kami menggunakan algoritma deteksi kemiripan dan database mandiri kami sendiri yang membandingkan dengan jutaan sumber publik di internet.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-base">Apakah dokumen saya disimpan dan dijual?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Tidak. Privasi Anda adalah prioritas kami. Dokumen Anda hanya diproses untuk diekstrak teksnya dan dicek kemiripannya. Kami tidak menjual dokumen Anda ke pihak ketiga atau menjadikannya bagian dari database repositori publik yang dapat ditemukan oleh kampus Anda nantinya.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-base">Berapa lama hasil scan tersedia?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Riwayat scan Anda akan tersimpan selama 30 hari. Selama periode tersebut, Anda bisa melihat ulang laporan dan mengunduh ulang PDF kapan saja menggunakan email yang sama saat Anda melakukan transaksi.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-base">Apa beda scan preview (gratis) vs scan penuh (berbayar)?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Scan preview hanya akan mengecek struktur dokumen secara cepat (jumlah kata/kalimat) dan melakukan sampling terbatas ke database lokal kami (tidak mengecek ke internet luas). Fitur ini berguna untuk memastikan format teks Anda terbaca dengan benar. Scan berbayar akan mengecek setiap kalimat secara mendalam terhadap seluruh database dan internet.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger className="text-base">Metode pembayaran apa yang diterima?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Kami menerima pembayaran melalui QRIS, GoPay, ShopeePay, transfer Bank (Virtual Account BCA, BNI, Mandiri, BRI), dan gerai retail. Seluruh proses pembayaran dijamin aman oleh Midtrans.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-6">
                <AccordionTrigger className="text-base">Seberapa akurat sistem ini?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Sistem kami memiliki akurasi yang sangat tinggi untuk menemukan kemiripan frasa yang identik atau parasfrase ringan dengan sumber di internet publik. Namun perlu diingat, sistem kami tidak bisa mengecek ke dalam database tertutup milik kampus tertentu. Hasil yang kami berikan bersifat indikatif untuk perbaikan tulisan Anda.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* CTA BOTTOM */}
        <section className="py-20 bg-primary text-white">
          <div className="container mx-auto px-4 md:px-8 text-center max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Siap cek kemiripan tulisanmu?</h2>
            <p className="text-emerald-100 text-lg mb-10">Mulai dari Rp 15.000 saja. Cepat, aman, dan tanpa komitmen.</p>
            <Link href="/app" className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-lg font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white bg-white text-primary shadow-xl hover:bg-emerald-50 h-16 px-10 hover:scale-105">
              Mulai Scan Sekarang
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
          <div className="max-w-xs text-center md:text-left">
            <Link href="/" className="font-bold text-2xl tracking-tight text-white mb-4 block">AJOR.Scan</Link>
            <p className="text-sm">Alat cek orisinalitas andalan mahasiswa Indonesia. Bebas ribet, bayar seperlunya.</p>
          </div>
          
          <div className="flex gap-8 text-sm">
            <a href="#" className="hover:text-white transition-colors">Syarat & Ketentuan</a>
            <a href="#" className="hover:text-white transition-colors">Kebijakan Privasi</a>
            <a href="#" className="hover:text-white transition-colors">Kontak</a>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-8 mt-12 text-xs text-center text-slate-600">
          <p>Disclaimer: AJOR.Scan adalah layanan independen dan tidak berafiliasi dengan Turnitin® atau pihak manapun. Hasil scan bersifat indikatif dan tidak menjamin keputusan institusi.</p>
          <p className="mt-2">© {new Date().getFullYear()} AJOR.Scan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}