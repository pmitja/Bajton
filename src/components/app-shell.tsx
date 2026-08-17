"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, CalendarDays, ClipboardList, FileText, HardHat, Home, LogOut, Menu, ReceiptText, Search, Settings, UsersRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { CurrentUser, DashboardData } from "@/lib/types";
import { signOut } from "@/app/login/actions";

const navigation = [
  { label: "Pregled", href: "/", icon: Home },
  { label: "Stroški", href: "/expenses", icon: ReceiptText },
  { label: "Opravila", href: "/tasks", icon: ClipboardList },
  { label: "Timeline", href: "/timeline", icon: CalendarDays },
  { label: "Izvajalci", href: "/contractors", icon: HardHat },
  { label: "Dokumenti", href: "/documents", icon: FileText },
  { label: "Analitika", href: "/analytics", icon: BarChart3 },
];

const secondaryNavigation = [
  { label: "Investitorji", href: "/investors", icon: UsersRound },
  { label: "Nastavitve", href: "/settings", icon: Settings },
];

function Navigation({ openTaskCount, currentUser }: { openTaskCount: number; currentUser: CurrentUser }) {
  const pathname = usePathname();

  return (
    <>
      <nav className="space-y-1 px-3" aria-label="Glavna navigacija">
        {navigation.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"}`}>
              <item.icon className="size-[18px]" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/tasks" ? <Badge variant="secondary" className="h-5 min-w-5 px-1.5">{openTaskCount}</Badge> : null}
            </Link>
          );
        })}
      </nav>
      <nav className="mt-auto space-y-1 border-t p-3" aria-label="Uporabniška navigacija">
        {secondaryNavigation.map((item) => {
          const active = pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"}`}><item.icon className="size-[18px]" />{item.label}</Link>;
        })}
        <div className="mt-2 flex items-center gap-2">
          <Link href="/settings" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 hover:bg-sidebar-accent">
            <Avatar className="size-9"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{currentUser.initials}</AvatarFallback></Avatar>
            <div className="min-w-0"><p className="truncate text-sm font-medium">{currentUser.name}</p><p className="text-xs text-muted-foreground">{currentUser.role}</p></div>
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Odjava" title="Odjava"><LogOut className="size-4" /></Button>
          </form>
        </div>
      </nav>
    </>
  );
}

function BrandAndProject({ project }: { project: DashboardData["project"] }) {
  return (
    <>
      <Link href="/" className="flex h-20 items-center gap-3 px-6">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><HardHat className="size-5" /></span>
        <div><p className="text-lg font-bold tracking-tight">Bajton</p><p className="text-xs text-muted-foreground">Gradnja pod nadzorom</p></div>
      </Link>
      <div className="mx-4 mb-5 flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground"><Home className="size-4" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{project.name}</span><span className="block truncate text-xs text-muted-foreground">{project.location}</span></span>
      </div>
    </>
  );
}

export function AppShell({ data, children }: { data: DashboardData; children: ReactNode }) {
  const openTaskCount = data.tasks.filter((task) => !task.completed).length;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-sidebar lg:flex">
        <BrandAndProject project={data.project} />
        <Navigation openTaskCount={openTaskCount} currentUser={data.currentUser} />
      </aside>
      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Odpri navigacijo" />}><Menu className="size-5" /></SheetTrigger>
            <SheetContent side="left" className="w-72 gap-0 p-0">
              <SheetHeader className="sr-only"><SheetTitle>Navigacija</SheetTitle></SheetHeader>
              <BrandAndProject project={data.project} />
              <Navigation openTaskCount={openTaskCount} currentUser={data.currentUser} />
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-2 lg:hidden"><span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><HardHat className="size-4" /></span><span className="font-bold">Bajton</span></Link>
          <Link href="/search" className="hidden min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"><Search className="size-4" /><span>Išči po projektu</span><kbd className="ml-2 rounded border bg-card px-2 py-0.5 text-[11px]">⌘ K</kbd></Link>
          <div className="ml-auto flex items-center gap-2">
            <Button render={<Link href="/activity" aria-label="Obvestila" />} nativeButton={false} variant="ghost" size="icon" className="relative"><Bell className="size-[18px]" /><span className="absolute right-2 top-2 size-2 rounded-full border-2 border-background bg-primary" /></Button>
            <Link href="/settings" aria-label="Uporabniški profil" className="lg:hidden"><Avatar className="size-9"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{data.currentUser.initials}</AvatarFallback></Avatar></Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

export function PageContainer({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{title}</h1><p className="mt-2 text-muted-foreground">{description}</p></div>
        {action}
      </div>
      {children}
    </div>
  );
}
