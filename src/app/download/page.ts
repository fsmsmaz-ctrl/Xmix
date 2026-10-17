import type { Metadata } from "next";
import Link from "next/link";
import {
  Download,
  FileArchive,
  FolderTree,
  ShieldCheck,
  Database,
  Github,
  CheckCircle2,
  Store,
  ArrowLeft,
  FileCode2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "تحميل ملفات الموقع | Xmix",
  description: "صفحة تحميل حزمة ملفات موقع Xmix الكاملة الجاهزة للرفع على GitHub والنشر على Vercel مع Supabase",
};

const FILE_NAME = "xmix-github-ready.zip";

const includes: { icon: React.ReactNode; title: string; desc: string }[] = [
  {
    icon: <FolderTree className="h-5 w-5 text-violet-400" />,
    title: "كل أكواد الموقع",
    desc: "مجلد src/ كاملاً — الواجهة، لوحات التحكم، وواجهات API",
  },
  {
    icon: <Database className="h-5 w-5 text-violet-400" />,
    title: "قاعدة البيانات",
    desc: "prisma/schema.prisma + database/setup-database.sql لـ Supabase",
  },
  {
    icon: <FileCode2 className="h-5 w-5 text-violet-400" />,
    title: "ملفات الإعداد",
    desc: "package.json و tsconfig و .env.example و .gitignore",
  },
  {
    icon: <FileArchive className="h-5 w-5 text-violet-400" />,
    title: "دليل النشر",
    desc: "README.md — شرح عربي كامل خطوة بخطوة للنشر",
  },
];

const steps: string[] = [
  "حمّل الملف المضغوط بالضغط على زر التحميل أعلاه",
  "افُك الضغط على جهازك — سيظهر مجلد بكامل ملفات الموقع",
  "افتح GitHub وأنشئ مستودعاً جديداً (New repository)",
  'داخل المستودع اضغط "uploading an existing file" واسحب محتويات المجلد كلها',
  "تأكد من نسخ الملفات المخفية .gitignore و .env.example أيضاً",
  "اضغط Commit changes — وسينشره Vercel تلقائياً بعد ربطه بالمستودع",
];

const cleanPoints: string[] = [
  "بدون node_modules — تُثبَّت تلقائياً بأمر npm install",
  "بدون كلمات مرور أو مفاتيح سرية — الآمن للنشر العام",
  "بدون بيانات تجريبية — الموقع يبدأ نظيفاً بالكامل",
  "بدون ملفات بناء مؤقتة أو سجلات",
];

const updated = new Intl.DateTimeFormat("ar", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

export default function DownloadPage() {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background text-foreground flex flex-col">
      {/* glow background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 start-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute bottom-0 end-1/4 h-80 w-80 rounded-full bg-fuchsia-600/10 blur-[100px]" />
      </div>

      {/* header */}
      <header className="relative border-b border-border/60 bg-black/30 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-black text-white shadow-lg shadow-violet-900/40">
              X
            </div>
            <div className="leading-tight">
              <p className="text-sm font-extrabold">Xmix</p>
              <p className="text-[11px] text-muted-foreground">سوق قت عمان الزراعي</p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-violet-500/50 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            العودة للمتجر
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        {/* hero */}
        <section className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-bold text-violet-300">
            <Github className="h-3.5 w-3.5" />
            حزمة جاهزة للرفع على GitHub
          </span>
          <h1 className="mt-4 text-3xl font-black leading-snug sm:text-4xl">
            تحميل ملفات{" "}
            <span className="bg-gradient-to-l from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              موقع Xmix
            </span>{" "}
            كاملة
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            الحزمة الرسمية الكاملة للموقع — أكواد نظيفة بدون أي بيانات تجريبية،
            جاهزة مباشرة للرفع على GitHub والنشر على Vercel مع قاعدة بيانات Supabase.
          </p>
        </section>

        {/* download card */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-violet-500/25 bg-card shadow-2xl shadow-violet-950/40">
          <div className="flex flex-col items-center gap-6 p-7 text-center sm:p-9">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 ring-1 ring-violet-500/30">
              <FileArchive className="h-10 w-10 text-violet-300" />
            </div>

            <div>
              <p className="font-mono text-lg font-bold" dir="ltr">
                {FILE_NAME}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>الحجم: أقل من 1 ميغابايت</span>
                <span className="hidden h-3 w-px bg-border sm:block" />
                <span>177 ملفاً</span>
                <span className="hidden h-3 w-px bg-border sm:block" />
                <span>آخر تحديث: {updated}</span>
              </div>
            </div>

            <a
              href={`/${FILE_NAME}`}
              download
              className="group inline-flex w-full max-w-xs items-center justify-center gap-2.5 rounded-xl bg-gradient-to-l from-violet-600 to-fuchsia-600 px-8 py-4 text-base font-extrabold text-white shadow-xl shadow-violet-900/50 transition hover:shadow-2xl hover:shadow-violet-800/50 hover:brightness-110 active:scale-[0.98] sm:w-auto"
            >
              <Download className="h-5 w-5 transition group-hover:-translate-y-0.5" />
              تحميل الحزمة الآن
            </a>

            <p className="text-[11px] text-muted-foreground">
              اضغط بالزر الأيمن واختر «حفظ الرابط باسم» إذا لم يبدأ التحميل تلقائياً
            </p>
          </div>
        </section>

        {/* includes grid */}
        <section className="mt-10">
          <h2 className="text-lg font-extrabold">ماذا تتضمن الحزمة؟</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {includes.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/60 p-4"
              >
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-6 text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* steps */}
        <section className="mt-10 rounded-2xl border border-border/70 bg-card/60 p-6 sm:p-7">
          <h2 className="text-lg font-extrabold">خطوات الرفع على GitHub</h2>
          <ol className="mt-5 space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-black text-violet-300 ring-1 ring-violet-500/30">
                  {i + 1}
                </span>
                <p className="pt-1 text-sm leading-7 text-foreground/90">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* cleanliness note */}
        <section className="mt-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-7">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-extrabold">حزمة نظيفة وآمنة</h2>
          </div>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {cleanPoints.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm leading-7 text-foreground/85">
                <CheckCircle2 className="mt-1.5 h-4 w-4 shrink-0 text-emerald-400" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        {/* back to store */}
        <section className="mt-10 rounded-2xl border border-violet-500/20 bg-gradient-to-l from-violet-600/10 to-fuchsia-600/5 p-6 text-center sm:p-8">
          <Store className="mx-auto h-7 w-7 text-violet-300" />
          <h2 className="mt-3 text-lg font-extrabold">تريد تجربة المتجر أولاً؟</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-7 text-muted-foreground">
            تصفح رفّ قت عمان، أضف للسلة، أو ادخل إلى لوحات التحكم قبل تحميل الملفات.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-6 py-3 text-sm font-extrabold text-violet-200 transition hover:bg-violet-500/20"
          >
            <ArrowLeft className="h-4 w-4" />
            فتح المتجر
          </Link>
        </section>
      </main>

      <footer className="relative border-t border-border/60 bg-black/30 py-5 text-center text-xs text-muted-foreground">
        Xmix — سوق المنتجات والخدمات الزراعية · صفحة تحميل حزمة النشر
      </footer>
    </div>
  );
}
