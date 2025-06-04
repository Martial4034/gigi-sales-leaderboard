import { LeaderboardTable } from "@/components/leaderboard-table";

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8 bg-background">
      <div className="container mx-auto">
        <LeaderboardTable />
      </div>
    </main>
  );
}
