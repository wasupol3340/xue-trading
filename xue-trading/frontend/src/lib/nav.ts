import {
  LayoutDashboard,
  Wallet,
  Bot,
  FlaskConical,
  Users,
  Brain,
  History,
  Newspaper,
  LineChart,
  Settings,
  ScrollText,
  Building2,
  ShieldCheck,
  TrendingUp,
  Landmark,
  GraduationCap,
  NotebookPen,
  ClipboardList,
  BrainCircuit,
  Crown,
  ShieldAlert,
  Target,
  Telescope,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string | null; icon?: LucideIcon; items: NavItem[] };

// เมนูจัดเป็นหมวดพับได้ — ลดความลายตา (จาก 19 รายการแบน → 2 บนสุด + 4 หมวด)
// หมวดที่มีหน้าปัจจุบันอยู่จะกางเองอัตโนมัติ
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null, // บนสุด แสดงตลอด ไม่ต้องพับ
    items: [
      { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
      { href: "/brain-os", label: "Brain OS", icon: BrainCircuit },
    ],
  },
  {
    label: "บริษัท AI",
    icon: Building2,
    items: [
      { href: "/headquarters", label: "สำนักงานใหญ่ AI", icon: Building2 },
      { href: "/goals", label: "เป้าหมายบริษัท", icon: Target },
      { href: "/agents", label: "ทีม AI", icon: Bot },
      { href: "/ceo-brain", label: "สมอง CEO", icon: Crown },
      { href: "/strategist", label: "Chief Strategist", icon: Telescope },
      { href: "/research", label: "ห้องวิจัย", icon: FlaskConical },
      { href: "/experience", label: "ศูนย์ประสบการณ์", icon: GraduationCap },
      { href: "/journal", label: "สมุดบันทึกสมอง", icon: NotebookPen },
      { href: "/report", label: "รายงานสมองประจำวัน", icon: ClipboardList },
    ],
  },
  {
    label: "ห้องประชุม",
    icon: Users,
    items: [
      { href: "/meeting", label: "ห้องประชุม", icon: Users },
      { href: "/boardroom", label: "ประชุมใหญ่ 4 ทุ่ม", icon: Landmark },
      { href: "/committee", label: "คณะกรรมการ", icon: ShieldCheck },
    ],
  },
  {
    label: "การเทรด & ผลงาน",
    icon: TrendingUp,
    items: [
      { href: "/portfolio", label: "พอร์ตโฟลิโอ", icon: Wallet },
      { href: "/performance", label: "ผลงาน", icon: TrendingUp },
      { href: "/strategy", label: "ศูนย์กลยุทธ์", icon: Brain },
      { href: "/backtest", label: "ทดสอบย้อนหลัง", icon: LineChart },
      { href: "/history", label: "ประวัติการเทรด", icon: History },
    ],
  },
  {
    label: "ระบบ",
    icon: Settings,
    items: [
      { href: "/guardian", label: "ทีมเทคนิค (ความปลอดภัย)", icon: ShieldAlert },
      { href: "/news", label: "ข่าวเศรษฐกิจ", icon: Newspaper },
      { href: "/logs", label: "บันทึกระบบ", icon: ScrollText },
      { href: "/settings", label: "ตั้งค่า", icon: Settings },
    ],
  },
];

// รายการแบน (เผื่อที่อื่นยังใช้)
export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
