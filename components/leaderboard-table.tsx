"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import Image from "next/image";
import * as XLSX from "xlsx";

interface LeaderboardEntry {
  id: string;
  name: string;
  nbSales: number;
  cashCollected: number;
  totalRevenue: number;
  lastComment: string;
  avatar_image?: string;
}

interface EntryWithRank extends LeaderboardEntry {
  previousRank?: number;
  currentRank: number;
  bestRank?: number;
  totalSales?: number;
  lastUpdate?: string;
}

interface StoredPerformance {
  bestRank: number;
  totalSales: number;
  lastUpdate: string;
}

const STORAGE_KEY = 'gigi-leaderboard-performance';

const getPositionStyle = (index: number) => {
  if (index === 0) {
    return "bg-yellow-50 dark:bg-yellow-900/10";
  }
  return index % 2 === 0 ? "bg-gray-50 dark:bg-gray-900/40" : "bg-white dark:bg-black";
};

const getPositionIcon = (index: number) => {
  switch (index) {
    case 0:
      return "🥇";
    case 1:
      return "🥈";
    case 2:
      return "🥉";
    default:
      return null;
  }
};

const getRankChangeIcon = (previousRank: number | undefined, currentRank: number) => {
  if (previousRank === undefined) return null;
  const change = previousRank - currentRank;
  
  if (change > 0) {
    return <ArrowUp className="w-4 h-4 text-green-500" />;
  } else if (change < 0) {
    return <ArrowDown className="w-4 h-4 text-red-500" />;
  }
  return <Minus className="w-4 h-4 text-gray-400" />;
};

const loadStoredPerformance = (): Record<string, StoredPerformance> => {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
};

const savePerformance = (id: string, performance: StoredPerformance) => {
  if (typeof window === 'undefined') return;
  const stored = loadStoredPerformance();
  stored[id] = performance;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
};

export function LeaderboardTable() {
  const [entries, setEntries] = useState<EntryWithRank[]>([]);
  const [previousEntries, setPreviousEntries] = useState<EntryWithRank[]>([]);
  const entriesRef = useRef<EntryWithRank[]>([]);

  useEffect(() => {
    const q = query(collection(db, "leaderboard"), orderBy("nbSales", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storedPerformance = loadStoredPerformance();
      const now = new Date().toISOString();

      const newEntries = snapshot.docs.map((doc, index) => {
        const id = doc.id;
        const data = doc.data() as LeaderboardEntry;
        const currentRank = index + 1;
        const previousRank = entriesRef.current.find(e => e.id === id)?.currentRank;
        const stored = storedPerformance[id] || { bestRank: currentRank, totalSales: 0, lastUpdate: now };
        
        // Mettre à jour les performances stockées
        const newBestRank = Math.min(currentRank, stored.bestRank);
        const newTotalSales = data.nbSales;
        const performance = {
          bestRank: newBestRank,
          totalSales: newTotalSales,
          lastUpdate: now
        };
        savePerformance(id, performance);

        return {
          ...data,
          id,
          currentRank,
          previousRank,
          bestRank: newBestRank,
          totalSales: newTotalSales,
          lastUpdate: now
        };
      }) as EntryWithRank[];
      
      setPreviousEntries(entriesRef.current);
      entriesRef.current = newEntries;
      setEntries(newEntries);

      newEntries.forEach((newEntry) => {
        const oldEntry = entriesRef.current.find((e) => e.id === newEntry.id);
        if (oldEntry && newEntry.nbSales > oldEntry.nbSales) {
          const rankChange = oldEntry.currentRank - newEntry.currentRank;
          let message = `${newEntry.name} a fait une nouvelle vente !`;
          if (rankChange > 0) {
            message += ` (+${rankChange} position${rankChange > 1 ? 's' : ''})`;
          }
          if (newEntry.currentRank === newEntry.bestRank) {
            message += " 🏆 Meilleur rang !";
          }
          toast.success(message, {
            description: `Total: ${newEntry.nbSales} ventes`,
          });
        }
      });
    });

    return () => unsubscribe();
  }, []);

  // Tri personnalisé : nbSales décroissant, puis cashCollected décroissant
  const sortedEntries = [...entries].sort((a, b) => {
    if (b.nbSales !== a.nbSales) {
      return b.nbSales - a.nbSales;
    }
    return (b.cashCollected || 0) - (a.cashCollected || 0);
  });

  // Calcul des totaux en direct
  const totalCash = sortedEntries.reduce((sum, entry) => sum + (entry.cashCollected || 0), 0);
  const totalRevenue = sortedEntries.reduce((sum, entry) => sum + (entry.totalRevenue || 0), 0);
  const totalSales = sortedEntries.reduce((sum, entry) => sum + (entry.nbSales || 0), 0);

  // Fonction d'export Excel
  const handleExportExcel = () => {
    const data = sortedEntries.map((entry, index) => ({
      Position: index + 1,
      Nom: entry.name,
      Ventes: entry.nbSales,
      "Cash Collecté": entry.cashCollected,
      "Revenu Total": entry.totalRevenue,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leaderboard");
    XLSX.writeFile(wb, "leaderboard.xlsx");
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap relative">
          {/* Total Cash à gauche */}
          <div className="flex flex-col items-start min-w-[160px]">
            <span className="text-lg font-semibold text-gray-500 dark:text-gray-300">Total Cash</span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">{totalCash.toLocaleString()} €</span>
          </div>
          {/* Logo + Titre au centre */}
          <div className="flex flex-col items-center flex-1 gap-1">
            <div className="flex items-center justify-center gap-4">
              <div className="relative w-16 h-16 overflow-hidden">
                <Image
                  src="/gigi1.png"
                  alt="Gigi"
                  fill
                  className="object-cover rounded-full"
                  priority
                />
              </div>
              <CardTitle className="text-2xl md:text-3xl font-bold text-center whitespace-nowrap">
                GIGI&apos;s Sales Leaderboard
              </CardTitle>
            </div>
            {/* Total ventes sous le titre */}
            <span className="text-xl font-bold text-orange-600 dark:text-orange-400 tabular-nums mt-1">
              Total ventes : {totalSales.toLocaleString()}
            </span>
          </div>
          {/* Total Revenu à droite + bouton export */}
          <div className="flex flex-col items-end min-w-[160px] gap-2">
            <span className="text-lg font-semibold text-gray-500 dark:text-gray-300">Total Revenu</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{totalRevenue.toLocaleString()} €</span>
            <button
              onClick={handleExportExcel}
              className="mt-2 px-4 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              title="Exporter au format Excel"
            >
              Exporter Excel
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Position</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead className="text-right">Ventes</TableHead>
              <TableHead className="text-right">Cash Collecté</TableHead>
              <TableHead className="text-right">Revenu Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {sortedEntries.map((entry, index) => {
                const oldEntry = previousEntries.find((e) => e.id === entry.id);
                const hasChanged = oldEntry && oldEntry.nbSales !== entry.nbSales;
                const isTopThree = index < 3;
                const rankChange = entry.previousRank ? entry.previousRank - entry.currentRank : 0;
                const isBestRank = entry.currentRank === entry.bestRank;

                return (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      backgroundColor: hasChanged ? "rgba(34, 197, 94, 0.1)" : undefined,
                    }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ 
                      duration: 0.5,
                      backgroundColor: { duration: 1.5 }
                    }}
                    className={cn(
                      getPositionStyle(index),
                      "border-b transition-colors"
                    )}
                  >
                    <TableCell className="font-medium">
                      <motion.div
                        animate={{ scale: hasChanged ? [1, 1.2, 1] : 1 }}
                        transition={{ duration: 0.5 }}
                        className={cn(
                          "flex items-center gap-2 justify-center",
                          isTopThree && "font-bold text-lg"
                        )}
                      >
                        {getPositionIcon(index) ? (
                          <span>{getPositionIcon(index)}</span>
                        ) : (
                          <span>{index + 1}</span>
                        )}
                        {getRankChangeIcon(entry.previousRank, entry.currentRank)}
                        {rankChange !== 0 && (
                          <span className={cn(
                            "text-sm",
                            rankChange > 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {Math.abs(rankChange)}
                          </span>
                        )}
                        {isBestRank && isTopThree && (
                          <span className="text-yellow-500" title="Meilleur rang atteint">
                            🏆
                          </span>
                        )}
                      </motion.div>
                    </TableCell>
                    <TableCell>
                      <motion.div
                        animate={{ scale: hasChanged ? [1, 1.1, 1] : 1 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-3"
                      >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800">
                          <Image
                            src={entry.avatar_image ? entry.avatar_image : `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.name}`}
                            alt={`Avatar de ${entry.name}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <a
                          href={`https://teliosa.slack.com/team/${entry.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            isTopThree && "font-semibold",
                            index === 0 && "text-yellow-600 dark:text-yellow-400",
                            "hover:underline focus:underline underline-offset-2 transition-colors cursor-pointer text-inherit no-underline"
                          )}
                          style={{ textDecoration: "none" }}
                        >
                          {entry.name}
                        </a>
                      </motion.div>
                    </TableCell>
                    <TableCell className="text-right">
                      <motion.div
                        animate={{ scale: hasChanged ? [1, 1.2, 1] : 1 }}
                        transition={{ duration: 0.5 }}
                        className={cn(
                          "font-bold",
                          isTopThree && "text-lg",
                          index === 0 && "text-yellow-600 dark:text-yellow-400"
                        )}
                      >
                        {entry.nbSales}
                      </motion.div>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.cashCollected.toLocaleString()} €
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.totalRevenue.toLocaleString()} €
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 