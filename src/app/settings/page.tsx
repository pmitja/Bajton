import { AppShell, PageContainer } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDashboardData } from "@/db/queries";

export default async function SettingsPage() {
  const data = await getDashboardData();
  return <AppShell data={data}><PageContainer title="Nastavitve" description="Podatki trenutno izbranega projekta in profila."><div className="grid max-w-4xl gap-5 md:grid-cols-2"><section className="rounded-2xl border bg-card p-6 shadow-sm"><h2 className="font-semibold">Projekt</h2><div className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="project-name">Naziv</Label><Input id="project-name" value={data.project.name} readOnly /></div><div className="space-y-2"><Label htmlFor="project-location">Lokacija</Label><Input id="project-location" value={data.project.location} readOnly /></div></div></section><section className="rounded-2xl border bg-card p-6 shadow-sm"><h2 className="font-semibold">Profil</h2><div className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="profile-name">Ime</Label><Input id="profile-name" value={data.currentUser.name} readOnly /></div><div className="space-y-2"><Label htmlFor="profile-role">Vloga</Label><Input id="profile-role" value={data.currentUser.role} readOnly /></div></div></section></div></PageContainer></AppShell>;
}
