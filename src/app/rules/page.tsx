import type { Metadata } from "next"
import {
  AlertCircle,
  FileText,
  PlusCircle,
  ShieldAlert,
  Tags,
  Target,
  Users,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"

export const metadata: Metadata = {
  title: "قواعد المشاريع | خدمةً للقرآن",
  description: "إرشادات وقواعد حملة المشاريع القرآنية للمشرفين والمساهمين",
}

export default function RulesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Sticky Navbar */}
      <Navbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        {/* Header Section */}
        <div className="mb-8 space-y-2 border-b border-border pb-6">
          <div className="flex items-center gap-2 text-primary font-medium text-sm">
            <FileText className="size-4" />
            <span>الدليل الإرشادي</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            قواعد وأحكام المشاريع
          </h1>
          <p className="text-muted-foreground text-base max-w-3xl">
            إرشادات وقواعد المشاركة في حملة مشاريع خدمة القرآن الكريم الموجهة للمشرفين والمساهمين لبناء مجتمعات مستدامة.
          </p>
        </div>

        {/* Rules Grid / List */}
        <div className="space-y-6">
          {/* Rule 1 */}
          <Card className="border-border/80 bg-card shadow-xs hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Target className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300">1</Badge>
                  <CardTitle className="text-xl">الهدف الأساسيّ للحملة</CardTitle>
                </div>
                <p className="text-sm font-semibold text-foreground pt-1">
                  بناء مجتمعات مستدامة حول المشاريع، لا مجرد إغلاق وتصليح للأخطاء.
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
              قد يستطيع مشرف المشروع حل العديد من مشكلاته في وقت قياسي بمفرده، لكن الغاية الأساسية هي تشجيع المطورين والمساهمين على دخول هذه المستودعات، فهم بنيتها، والمساهمة فيها، للتحول مستقبلاً إلى مساهمين دائمين يرعون هذه المشاريع وينمونها باستمرار.
            </CardContent>
          </Card>

          {/* Rule 2 */}
          <Card className="border-border/80 bg-card shadow-xs hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Tags className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300">2</Badge>
                  <CardTitle className="text-xl">تصنيف المهام (Issues)</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground pt-1">
                  تُصنّف الإيشوز في المستودعات باستخدام الوسوم (Tags) عبر معيارين أساسيين، وتُكتب باللغة العربية أو الإنجليزية بحسب لغة المستودع والمهام:
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-1.5 shadow-2xs">
                  <span className="font-semibold text-foreground text-xs block">حسب الصعوبة</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">سهل (Easy)</Badge>
                    <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">متوسط (Medium)</Badge>
                    <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">صعب (Hard)</Badge>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-1.5 shadow-2xs">
                  <span className="font-semibold text-foreground text-xs block">حسب الأولوية</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">أولوية عالية (High-Priority)</Badge>
                    <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">أولوية متوسطة (Medium-Priority)</Badge>
                    <Badge variant="secondary" className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">ليس أولوية (Low-Priority)</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rule 3 */}
          <Card className="border-border/80 bg-card shadow-xs hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <FileText className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300">3</Badge>
                  <CardTitle className="text-xl">إعداد ملف قواعد المساهمة (CONTRIBUTING.md)</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground pt-1">
                  يتضمن كل مستودع ملف <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">CONTRIBUTING.md</code> يُوضّح فيه مشرف المشروع قواعد وأحكام المساهمة.
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-sm space-y-2 text-muted-foreground">
              <p className="font-medium text-foreground text-xs">يُنصح بشدة بتوضيح النقاط التالية في الملف:</p>
              <ul className="list-disc list-inside space-y-1.5 leading-relaxed pr-2">
                <li>موقف صاحب المشروع من استخدام أدوات الذكاء الاصطناعي.</li>
                <li>الفرع (Branch) المحدد الذي يجب استهدافه عند تقديم طلب السحب (PR).</li>
                <li>أي تعليمات أو اشتراطات تقنية يجب على المساهم معرفتها قبل إرسال الـ PR.</li>
                <li>إتاحة الملف باللغتين العربية والإنجليزية (إن أمكن).</li>
                <li>الإشارة إلى الملف وربطه بوضوح داخل ملف الـ <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">README.md</code> الرئيسي.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Rule 4 */}
          <Card className="border-border/80 bg-card shadow-xs hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Users className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">4</Badge>
                  <CardTitle className="text-xl">آلية ومراحل المتابعة مع المساهمين</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground pt-1">
                  نرجو من أصحاب المشاريع متابعة المساهمين خطوة بخطوة وفق المسار التالي:
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid gap-2 sm:grid-cols-5 text-xs">
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 shadow-2xs">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block">1. طلب التعيين</span>
                  <p className="text-muted-foreground text-[11px] leading-snug">يترك المساهم تعليقاً على الإيشو المفتوحة لطلب التعيين عليها.</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 shadow-2xs">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block">2. التعيين الرسمي</span>
                  <p className="text-muted-foreground text-[11px] leading-snug">يقوم مشرف المشروع بتعيين المهمة للمساهم.</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 shadow-2xs">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block">3. تقديم الـ PR</span>
                  <p className="text-muted-foreground text-[11px] leading-snug">بعد إتمام العمل، يرسل المساهم طلب السحب (PR).</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 shadow-2xs">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block">4. المراجعة</span>
                  <p className="text-muted-foreground text-[11px] leading-snug">يراجع المشرف الطلب (موافقة، ملاحظات، أو رفض مبرر).</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 shadow-2xs">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block">5. الدمج والنشر</span>
                  <p className="text-muted-foreground text-[11px] leading-snug">بعد الدمج، يكتب المساهم منشوراً عن تجربته في المجتمع.</p>
                </div>
              </div>

              <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-2xs">
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="font-bold">تنبيه هام حول التقييم</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed mt-1">
                  احتساب النقاط والجوائز سيكون مبنياً على التجارب والمواضيع المنشورة في المجتمع وليس فقط على المساهمات المقبولة في غيتهب؛ والهدف هو نقل الخبرات وتشجيع المشاركة الجماعية.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Rule 5 */}
          <Card className="border-border/80 bg-card shadow-xs hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <PlusCircle className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">5</Badge>
                  <CardTitle className="text-xl">استمرارية إضافة المهام</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                يُنصح أصحاب المشاريع بطرح وإضافة المزيد من المهام باستمرار أثناء سير الحملة، حتى وإن لم ينتهِ العمل على المهام الحالية.
              </p>
              <p className="font-medium text-foreground">
                وجود خيارات ومهام متعددة يتيح لفئة أوسع من المساهمين المشاركة واختيار ما يناسب مهاراتهم.
              </p>
            </CardContent>
          </Card>

          {/* Rule 6 */}
          <Card className="border-border/80 bg-card shadow-xs hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">6</Badge>
                  <CardTitle className="text-xl">التعامل مع الحسابات المؤتمتة وبوتات الذكاء الاصطناعي</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground pt-1">
                  نظراً لموجة الحسابات المسيّرة بالذكاء الاصطناعي على غيتهب، قد تصل للمشاريع طلبات سحب أو تعليقات من بوتات هدفها جمع مساهمات آلية لرفع سمعة الحسابات (Account Warming).
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4 text-sm">
              <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2 shadow-2xs">
                <span className="font-semibold text-foreground text-xs block">علامات الحسابات الآلية (غالباً ما تكون مزيجاً من):</span>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs leading-relaxed pr-2">
                  <li>نص مكتوب بأسلوب الذكاء الاصطناعي الواضح.</li>
                  <li>اسم حساب أجنبي أو بروفايل حديث أنشئ مؤخراً ولا علاقة له بالمشاريع القرآنية/الإسلاميّة.</li>
                  <li>إرسال PR مباشر دون التعليق على الإيشو أو طلب التعيين أولاً.</li>
                </ul>
              </div>

              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-1.5 text-xs text-muted-foreground leading-relaxed shadow-2xs">
                <span className="font-bold text-foreground block">التوصية لمشرف المشروع:</span>
                <p>• يُفضل تجاهل هذه الطلبات والتركيز على التعليقات والطلبات القادمة من أشخاص حقيقيين.</p>
                <p>• نظراً لأن بعض هذه البوتات قد يستخدم نماذج متقدمة جداً (مثل Fable) لحل المشكلات، يُترك القرار التقديري لصاحب المشروع في مدى فائدة المساهمة وقبولها من عدمه.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
