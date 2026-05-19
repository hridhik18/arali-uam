import { AppShell } from '../components/AppShell';
import { UsersSection } from '../components/UsersSection';
import { TeamsSection } from '../components/TeamsSection';
import { AccountsSection } from '../components/AccountsSection';

export function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <UsersSection />
        <TeamsSection />
        <AccountsSection />
      </div>
    </AppShell>
  );
}
