"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus, Download, TrendingUp, TrendingDown } from "lucide-react";
import Image from "next/image";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

interface LeaderboardEntry {
  id: string;
  name: string;
  nbSales: number;
  cashCollected: number;
  totalRevenue: number;
  avatar_image?: string;
}

interface EntryWithRank extends LeaderboardEntry {
  previousRank?: number;
  currentRank: number;
  bestRank?: number;
  totalSales?: number;
  lastUpdate?: string;
}

interface SalesData {
  id_slack: string;
  Firebase_cashCollected: number;
  Firebase_totalRevenue: number;
  timestamp: {
    toDate: () => Date;
  };
  BotMode?: string;
  Botcommentaire?: string;
}

interface SalesInfo {
  name: string;
  avatar_url: string;
}

interface SalesInfoMapping {
  [key: string]: SalesInfo;
}

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


// Couleurs pour les courbes et les charts
const COLORS = ["#F59E42", "#3B82F6", "#22C55E", "#F43F5E", "#A78BFA", "#FBBF24", "#6366F1"];

interface ChartData { date: string; ventes: number; cash: number; revenu: number; }
interface SalesByUser { name: string; value: number; color: string; }

// function SalesPerformanceCharts({ sales }: { sales: SalesData[] }) {
//   // Préparer les données par date
//   const salesByDate: Record<string, { ventes: number, cash: number, revenu: number }> = {};
//   sales.forEach(sale => {
//     if (sale.timestamp && typeof sale.timestamp.toDate === 'function') {
//       const date = sale.timestamp.toDate().toLocaleDateString('fr-FR');
//       if (!salesByDate[date]) salesByDate[date] = { ventes: 0, cash: 0, revenu: 0 };
//       salesByDate[date].ventes += 1;
//       salesByDate[date].cash += sale.Firebase_cashCollected;
//       salesByDate[date].revenu += sale.Firebase_totalRevenue;
//     }
//   });
//   // Trie les dates du plus tôt au plus tard
//   const chartData: ChartData[] = Object.entries(salesByDate)
//     .sort(([dateA], [dateB]) => {
//       const [dA, mA, yA] = dateA.split('/').map(Number);
//       const [dB, mB, yB] = dateB.split('/').map(Number);
//       return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
//     })
//     .map(([date, vals]) => ({ date, ...vals }));
//   // Pie chart cash
//   const cashMap: Record<number, number> = {};
//   sales.forEach(sale => {
//     if (sale.Firebase_cashCollected) {
//       cashMap[sale.Firebase_cashCollected] = (cashMap[sale.Firebase_cashCollected] || 0) + 1;
//     }
//   });
//   const cashPieData = Object.entries(cashMap).map(([val, count]) => ({ name: `${val} €`, value: count }));
//   // Pie chart Split Pay / Full Pay
//   let split = 0, full = 0;
//   sales.forEach(sale => {
//     if (sale.Firebase_totalRevenue === 6000) split++;
//     if (sale.Firebase_totalRevenue === 5800) full++;
//   });
//   const splitPieData = [
//     { name: 'Split Pay', value: split },
//     { name: 'Full Pay', value: full }
//   ];
//   // Pie chart FU / OCC
//   let fu = 0, occ = 0;
//   sales.forEach(sale => {
//     if (sale.BotMode === 'FU') fu++;
//     if (sale.BotMode === 'OCC') occ++;
//   });
//   const fuOccPieData = [
//     { name: 'FU', value: fu },
//     { name: 'OCC', value: occ }
//   ];
//   return (
//     <div className="w-full flex flex-col gap-8 mb-8">
//       <div className="w-full max-w-3xl mx-auto">
//         <span className="block text-center text-base font-semibold mb-2">Historique (courbes)</span>
//         <ResponsiveContainer width="100%" height={220}>
//           <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis dataKey="date" />
//             <YAxis />
//             <Tooltip />
//             <Legend />
//             <Line type="monotone" dataKey="ventes" stroke="#F59E42" name="Ventes" strokeWidth={2} dot={false} />
//             <Line type="monotone" dataKey="cash" stroke="#22C55E" name="Cash" strokeWidth={2} dot={false} />
//             <Line type="monotone" dataKey="revenu" stroke="#3B82F6" name="Revenu" strokeWidth={2} dot={false} />
//           </LineChart>
//         </ResponsiveContainer>
//       </div>
//       <div className="w-full max-w-3xl mx-auto">
//         <span className="block text-center text-base font-semibold mb-2">Historique (histogramme)</span>
//         <ResponsiveContainer width="100%" height={220}>
//           <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis dataKey="date" />
//             <YAxis />
//             <Tooltip />
//             <Legend />
//             <Bar dataKey="ventes" fill="#F59E42" name="Ventes" />
//             <Bar dataKey="cash" fill="#22C55E" name="Cash" />
//             <Bar dataKey="revenu" fill="#3B82F6" name="Revenu" />
//           </BarChart>
//         </ResponsiveContainer>
//       </div>
//       <div className="flex flex-wrap gap-8 justify-center">
//         <div className="w-[260px]">
//           <span className="block text-center text-base font-semibold mb-2">Répartition Cash</span>
//           <ResponsiveContainer width="100%" height={220}>
//             <PieChart>
//               <Pie data={cashPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
//                 {cashPieData.map((entry, idx) => (
//                   <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
//                 ))}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//         <div className="w-[260px]">
//           <span className="block text-center text-base font-semibold mb-2">Split Pay / Full Pay</span>
//           <ResponsiveContainer width="100%" height={220}>
//             <PieChart>
//               <Pie data={splitPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
//                 <Cell fill="#F59E42" />
//                 <Cell fill="#3B82F6" />
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//         <div className="w-[260px]">
//           <span className="block text-center text-base font-semibold mb-2">Répartition FU / OCC</span>
//           <ResponsiveContainer width="100%" height={220}>
//             <PieChart>
//               <Pie data={fuOccPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
//                 <Cell fill="#F59E42" />
//                 <Cell fill="#22C55E" />
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//       </div>
//     </div>
//   );
// }

function LeaderboardCharts({
  chartData,
  selectedDate,
  salesByUser,
  allDocsByDate
}: {
  chartData: ChartData[],
  availableDates: string[],
  selectedDate: string,
  totalSales: number,
  totalCash: number,
  totalRevenue: number,
  salesByUser: SalesByUser[],
  allDocsByDate: Record<string, SalesData[]>
}) {
  // Pie chart cash global
  const allSales: SalesData[] = Object.values(allDocsByDate).flat();
  const cashMap: Record<number, number> = {};
  allSales.forEach(sale => {
    if (sale.Firebase_cashCollected) {
      cashMap[sale.Firebase_cashCollected] = (cashMap[sale.Firebase_cashCollected] || 0) + 1;
    }
  });
  const cashPieData = Object.entries(cashMap).map(([val, count]) => ({ name: `${val} €`, value: count }));
  // Pie chart Split Pay / Full Pay global
  let split = 0, full = 0;
  allSales.forEach(sale => {
    if (sale.Firebase_totalRevenue === 6000) split++;
    if (sale.Firebase_totalRevenue === 5800) full++;
  });
  const splitPieData = [
    { name: 'Split Pay', value: split },
    { name: 'Full Pay', value: full }
  ];
  // Pie chart FU / OCC global
  let fu = 0, occ = 0;
  allSales.forEach(sale => {
    if (sale.BotMode === 'FU') fu++;
    if (sale.BotMode === 'OCC') occ++;
  });
  const fuOccPieData = [
    { name: 'FU', value: fu },
    { name: 'OCC', value: occ }
  ];
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[300px] py-8 gap-8">
      {/* Courbes si une date précise est sélectionnée */}
      {selectedDate !== "all" && (
        <div className="w-full max-w-3xl">
          <span className="block text-center text-base font-semibold mb-2">Évolution sur le challenge</span>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ventes" stroke="#F59E42" name="Ventes" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cash" stroke="#22C55E" name="Cash" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="revenu" stroke="#3B82F6" name="Revenu" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Histogramme si Toutes les dates */}
      {selectedDate === "all" && (
        <div className="w-full max-w-3xl">
          <span className="block text-center text-base font-semibold mb-2">Nombre de ventes par jour</span>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ventes" fill="#F59E42" name="Ventes" />
              <Bar dataKey="cash" fill="#22C55E" name="Cash" />
              <Bar dataKey="revenu" fill="#3B82F6" name="Revenu" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Pie chart répartition des ventes par vendeur */}
      {salesByUser && salesByUser.length > 0 && (
        <div className="w-full max-w-xl flex flex-col items-center">
          <span className="block text-center text-base font-semibold mb-2">Répartition des ventes par vendeur</span>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={salesByUser}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {salesByUser.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Pie chart cash global */}
      {cashPieData.length > 0 && (
        <div className="w-full max-w-xs flex flex-col items-center">
          <span className="block text-center text-base font-semibold mb-2">Répartition Cash</span>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={cashPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {cashPieData.map((entry, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Pie chart Split Pay / Full Pay global */}
      {(splitPieData[0].value > 0 || splitPieData[1].value > 0) && (
        <div className="w-full max-w-xs flex flex-col items-center">
          <span className="block text-center text-base font-semibold mb-2">Split Pay / Full Pay</span>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={splitPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                <Cell fill="#F59E42" />
                <Cell fill="#3B82F6" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Pie chart FU / OCC global */}
      {(fuOccPieData[0].value > 0 || fuOccPieData[1].value > 0) && (
        <div className="w-full max-w-xs flex flex-col items-center">
          <span className="block text-center text-base font-semibold mb-2">Répartition FU / OCC</span>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={fuOccPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                <Cell fill="#F59E42" />
                <Cell fill="#22C55E" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// Typage explicite pour les comparatifs
interface Comparison {
  challenge: string;
  date: string;
  totals: ChartData;
}
interface Comparisons {
  prevTotals: ChartData | null;
  otherComparisons: Comparison[];
}

export function LeaderboardTable() {
  const router = useRouter();
  const [entries, setEntries] = useState<EntryWithRank[]>([]);
  const [previousEntries, setPreviousEntries] = useState<EntryWithRank[]>([]);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const entriesRef = useRef<EntryWithRank[]>([]);
  const [challengeDates, setChallengeDates] = useState<Record<string, string[]>>({});
  const [viewMode, setViewMode] = useState<'table' | 'charts'>('table');
  const [allDocsByDate, setAllDocsByDate] = useState<Record<string, SalesData[]>>({});

  // Déterminer l'index du jour sélectionné dans le challenge courant
  const currentDayIndex = selectedDate !== "all" && challengeDates[selectedChallenge]
    ? challengeDates[selectedChallenge].indexOf(selectedDate)
    : -1;

  // Correction de la fonction computeTotalsForDate pour retourner un ChartData
  const computeTotalsForDate = async (challenge: string, date: string): Promise<ChartData> => {
    const q = query(collection(db, challenge));
    const snapshot = await getDocs(q);
    let ventes = 0;
    let cash = 0;
    let revenu = 0;
    const wantedDateISO = dayjs(date, ["DD/MM/YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD");
    snapshot.docs.forEach(doc => {
      const data = doc.data() as SalesData;
      if (data.timestamp && typeof data.timestamp.toDate === 'function') {
        const docDateISO = dayjs(data.timestamp.toDate()).format("YYYY-MM-DD");
        if (docDateISO === wantedDateISO) {
          cash += data.Firebase_cashCollected;
          revenu += data.Firebase_totalRevenue;
          ventes += 1;
        }
      }
    });
    return { date, ventes, cash, revenu };
  };

  // État pour stocker les comparatifs
  const [comparisons, setComparisons] = useState<Comparisons | null>(null);

  useEffect(() => {
    const fetchComparisons = async () => {
      if (selectedDate === "all" || currentDayIndex < 0) {
        setComparisons(null);
        return;
      }
      // Comparatif avec la veille
      let prevTotals: ChartData | null = null;
      if (currentDayIndex > 0 && challengeDates[selectedChallenge]) {
        const previousDate = challengeDates[selectedChallenge][currentDayIndex - 1];
        prevTotals = await computeTotalsForDate(selectedChallenge, previousDate);
      }
      // Comparatif avec les autres challenges
      const otherChallenges = challenges.filter(c => c !== selectedChallenge);
      const otherComparisons: Comparison[] = [];
      for (const otherChallenge of otherChallenges) {
        const otherDates = challengeDates[otherChallenge];
        if (otherDates && otherDates.length > currentDayIndex) {
          const otherDate = otherDates[currentDayIndex];
          const otherTotals = await computeTotalsForDate(otherChallenge, otherDate);
          otherComparisons.push({ challenge: otherChallenge, date: otherDate, totals: otherTotals });
        }
      }
      setComparisons({ prevTotals, otherComparisons });
    };
    fetchComparisons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChallenge, selectedDate, currentDayIndex, JSON.stringify(challengeDates), challenges.join(",")]);

  // Fonction pour afficher le badge de variation
  function VariationBadge({ value, label }: { value: number, label: string }) {
    if (value === 0) return (
      <span className="ml-2 inline-flex items-center text-gray-500 text-xs"><Minus className="w-3 h-3 mr-1" />{label} : 0</span>
    );
    const isPositive = value > 0;
    return (
      <span className={cn(
        "ml-2 inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded",
        isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      )}>
        {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
        {label} : {isPositive ? '+' : ''}{value}
      </span>
    );
  }

  // Fonction pour afficher le badge de variation en pourcentage
  function PercentBadge({ value, label }: { value: number, label: string }) {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <span className={cn(
        "ml-2 inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded",
        isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      )}>
        {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
        {label} : {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
    );
  }

  // Récupérer la liste des challenges
  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        let challengeNumber = 1;
        let challengesExist = true;
        const challengeList = [];

        // Vérifier chaque challenge jusqu'à ce qu'on trouve un qui n'existe pas
        while (challengesExist) {
          const challenge = await getDocs(collection(db, `challenge${challengeNumber}`));
          if (!challenge.empty) {
            challengeList.push(`challenge${challengeNumber}`);
            challengeNumber++;
          } else {
            challengesExist = false;
          }
        }

        if (challengeList.length > 0) {
          // Par défaut, sélectionner challenge2 si présent, sinon le plus récent
          if (challengeList.includes('challenge3')) {
            setSelectedChallenge('challenge3');
          } else {
            setSelectedChallenge(challengeList[0]);
          }
          setChallenges(challengeList);
        } else {
          toast.error("Aucun challenge trouvé");
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des challenges:", error);
        toast.error("Impossible de charger les challenges");
      }
    };
    fetchChallenges();
  }, []);

  // Récupérer le mapping des dates de chaque challenge
  useEffect(() => {
    const fetchChallengeDates = async () => {
      try {
        const infoDoc = await getDoc(doc(db, "challenge_info", "mapping"));
        if (infoDoc.exists()) {
          setChallengeDates(infoDoc.data() as Record<string, string[]>);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des dates de challenge:", error);
      }
    };
    fetchChallengeDates();
  }, []);

  const challengeDatesForSelected = challengeDates[selectedChallenge];
  const challengeDatesForSelectedString = JSON.stringify(challengeDatesForSelected);

  useEffect(() => {
    async function fetchDocsByDate() {
      if (!selectedChallenge || !challengeDatesForSelected) return;
      const q = query(collection(db, selectedChallenge));
      const snapshot = await getDocs(q);
      const docsByDate: Record<string, SalesData[]> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as SalesData;
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
          const docDate = data.timestamp.toDate();
          // Format date mapping (ex: 01/04/2025)
          const dateStr = docDate.toLocaleDateString('fr-FR');
          if (!docsByDate[dateStr]) docsByDate[dateStr] = [];
          docsByDate[dateStr].push(data);
        }
      });
      setAllDocsByDate(docsByDate);
    }
    fetchDocsByDate();
  }, [selectedChallenge, challengeDatesForSelected, challengeDatesForSelectedString, challengeDates]);

  // Récupérer les données du challenge sélectionné
  useEffect(() => {
    if (!selectedChallenge) return;

    const fetchData = async () => {
      const q = query(collection(db, selectedChallenge));
      const snapshot = await getDocs(q);
      
      // Récupérer toutes les dates uniques
      const dates = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data() as SalesData;
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
          const date = data.timestamp.toDate().toISOString().split('T')[0];
          dates.add(date);
        }
      });
      setAvailableDates(Array.from(dates).sort());

      // Filtrer par date si nécessaire
      let filteredDocs = snapshot.docs;
      if (selectedDate !== "all") {
        const startOfDay = new Date(selectedDate);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        filteredDocs = snapshot.docs.filter(doc => {
          const data = doc.data() as SalesData;
          if (data.timestamp && typeof data.timestamp.toDate === 'function') {
            const timestamp = data.timestamp.toDate();
            return timestamp >= startOfDay && timestamp <= endOfDay;
          }
          return false;
        });
      }

      // Agréger les données par id_slack
      const salesBySlackId = new Map<string, SalesData[]>();
      filteredDocs.forEach(doc => {
        const data = doc.data() as SalesData;
        const existing = salesBySlackId.get(data.id_slack) || [];
        salesBySlackId.set(data.id_slack, [...existing, data]);
      });

      // Récupérer les informations des vendeurs
      const salesInfoDoc = await getDocs(collection(db, "sales_info"));
      const salesInfoMapping: SalesInfoMapping = {};
      
      if (!salesInfoDoc.empty) {
        const mappingDoc = salesInfoDoc.docs[0].data() as SalesInfoMapping;
        Object.assign(salesInfoMapping, mappingDoc);
      }

      // Créer les entrées du leaderboard
      const newEntries = Array.from(salesBySlackId.entries()).map(([id_slack, sales]) => {
        const info = salesInfoMapping[id_slack];
        const totalCash = sales.reduce((sum, sale) => sum + sale.Firebase_cashCollected, 0);
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.Firebase_totalRevenue, 0);

        return {
          id: id_slack,
          name: info?.name || "Vendeur Inconnu",
          nbSales: sales.length,
          cashCollected: totalCash,
          totalRevenue: totalRevenue,
          avatar_image: info?.avatar_url,
          currentRank: 0, // Sera calculé après le tri
          previousRank: entriesRef.current.find(e => e.id === id_slack)?.currentRank
        };
      });

      // Trier les entrées
      const sortedEntries = newEntries.sort((a, b) => {
        if (b.nbSales !== a.nbSales) return b.nbSales - a.nbSales;
        return b.cashCollected - a.cashCollected;
      });

      // Ajouter les rangs
      sortedEntries.forEach((entry, index) => {
        entry.currentRank = index + 1;
      });

      setPreviousEntries(entriesRef.current);
      entriesRef.current = sortedEntries;
      setEntries(sortedEntries);
    };

    fetchData();
  }, [selectedChallenge, selectedDate]);

  // Calcul des totaux
  const totalCash = entries.reduce((sum, entry) => sum + entry.cashCollected, 0);
  const totalRevenue = entries.reduce((sum, entry) => sum + entry.totalRevenue, 0);
  const totalSales = entries.reduce((sum, entry) => sum + entry.nbSales, 0);

  // Fonction d'export Excel
  const handleExportExcel = () => {
    const data = entries.map((entry, index) => ({
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

  // Préparation des données pour les graphiques
  let chartData: ChartData[] = [];
  let salesByUser: SalesByUser[] = [];

  if (challengeDates[selectedChallenge]) {
    chartData = challengeDates[selectedChallenge].map(date => {
      // date au format mapping (ex: 01/04/2025)
      const docs = allDocsByDate[date] || [];
      const ventes = docs.length;
      const cash = docs.reduce((sum, d) => sum + d.Firebase_cashCollected, 0);
      const revenu = docs.reduce((sum, d) => sum + d.Firebase_totalRevenue, 0);
      return { date, ventes, cash, revenu };
    });
  }

  // Pie chart : répartition des ventes par vendeur (pour la période sélectionnée)
  if (entriesRef.current.length > 0) {
    salesByUser = entriesRef.current.map((entry, idx) => ({
      name: entry.name,
      value: entry.nbSales,
      color: COLORS[idx % COLORS.length]
    }));
  }

  return (
    <Card className="w-full max-w-6xl mx-auto px-1 sm:px-6">
      <CardHeader className="pb-2 pt-4 px-2 sm:px-6">
        {/* Sélecteurs de challenge et de date */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <SignedIn>
            <Select value={selectedChallenge} onValueChange={setSelectedChallenge}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionner un challenge" />
              </SelectTrigger>
              <SelectContent>
                {challenges.map((challenge) => (
                  <SelectItem key={challenge} value={challenge}>
                    {challenge}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionner une date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les dates</SelectItem>
                {availableDates.map((date) => (
                  <SelectItem key={date} value={date}>
                    {new Date(date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="default" size="sm">
                Se connecter en tant que Sales
              </Button>
            </SignInButton>
          </SignedOut>
        </div>

        {/* Boutons Tableaux / Charts + Excel */}
        <div className="flex flex-row w-full justify-between items-center mb-2">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              onClick={() => setViewMode('table')}
              size="sm"
            >
              Tableaux
            </Button>
            <Button
              variant={viewMode === 'charts' ? 'default' : 'outline'}
              onClick={() => setViewMode('charts')}
              size="sm"
            >
              Charts
            </Button>
          </div>
          <div className="hidden sm:flex justify-end">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              title="Exporter au format Excel"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>

        {/* Titre + logo */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="relative w-8 h-8 sm:w-12 sm:h-12 overflow-hidden">
              <Image
                src="/maya_normal.gif"
                alt="MAYA"
                fill
                className="object-cover rounded-full"
                priority
              />
            </div>
            <span className="text-lg sm:text-2xl font-bold text-center">MAYA&apos;s Leaderboard</span>
          </div>

        {/* Totaux */}
          <div>
            <div className="flex flex-row justify-center items-center gap-4 w-full mb-1">
              <div className="flex flex-col items-center">
                <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-300">Total Cash</span>
                <span className="text-base sm:text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">{totalCash.toLocaleString()} €
                  {/* Badge variation par rapport à la veille */}
                  {comparisons && comparisons.prevTotals && (
                    <>
                      <VariationBadge value={totalCash - comparisons.prevTotals.cash} label="vs hier" />
                      <PercentBadge value={comparisons.prevTotals.cash ? ((totalCash - comparisons.prevTotals.cash) / comparisons.prevTotals.cash) * 100 : 0} label="" />
                    </>
                  )}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-300">Total Revenu</span>
                <span className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{totalRevenue.toLocaleString()} €
                  {comparisons && comparisons.prevTotals && (
                    <>
                      <VariationBadge value={totalRevenue - comparisons.prevTotals.revenu} label="vs hier" />
                      <PercentBadge value={comparisons.prevTotals.revenu ? ((totalRevenue - comparisons.prevTotals.revenu) / comparisons.prevTotals.revenu) * 100 : 0} label="" />
                    </>
                  )}
                </span>
              </div>
            </div>
            <div className="flex justify-center">
              <span className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400 tabular-nums">Total ventes : {totalSales.toLocaleString()}
                {comparisons && comparisons.prevTotals && (
                  <>
                    <VariationBadge value={totalSales - comparisons.prevTotals.ventes} label="vs hier" />
                    <PercentBadge value={comparisons.prevTotals.ventes ? ((totalSales - comparisons.prevTotals.ventes) / comparisons.prevTotals.ventes) * 100 : 0} label="" />
                  </>
                )}
              </span>
            </div>
          </div>
        {/* Section comparatif avec les autres challenges */}
        {comparisons && comparisons.otherComparisons.length > 0 && (
          <div className="flex flex-col items-center mt-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-300 mb-1">Comparatif avec les autres challenges (même jour)</span>
            <div className="flex flex-row gap-4 flex-wrap justify-center">
              {comparisons.otherComparisons.map((comp: Comparison) => (
                <div key={comp.challenge} className="flex flex-col items-center bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{comp.challenge} ({comp.date})</span>
                  <span className="text-xs">Ventes : <VariationBadge value={totalSales - comp.totals.ventes} label="diff" /></span>
                  <span className="text-xs">Cash : <VariationBadge value={totalCash - comp.totals.cash} label="diff" /></span>
                  <span className="text-xs">Revenu : <VariationBadge value={totalRevenue - comp.totals.revenu} label="diff" /></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-0 sm:px-4 pt-2 pb-4">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto rounded-lg">
            <Table className="min-w-[340px] text-xs sm:text-base">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[36px] text-center p-1 sm:w-[70px]">#</TableHead>
                  <TableHead className="p-1">Nom</TableHead>
                  <TableHead className="text-right p-1">Ventes</TableHead>
                  <TableHead className="text-right p-1">Cash</TableHead>
                  <TableHead className="text-right p-1">Revenu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {entries.map((entry, index) => {
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
                          "border-b transition-colors h-8 sm:h-12 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        onClick={() => router.push(`/vendeur/${entry.id}?challenge=${selectedChallenge}`)}
                      >
                        <TableCell className="font-medium text-center p-1 sm:w-[70px]">
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
                          </motion.div>
                        </TableCell>
                        <TableCell className="p-1">
                          <motion.div
                            animate={{ scale: hasChanged ? [1, 1.1, 1] : 1 }}
                            transition={{ duration: 0.5 }}
                            className="flex items-center gap-1 sm:gap-3"
                          >
                            <div className="hidden sm:block relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800">
                              <Image
                                src={entry.avatar_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.name}`}
                                alt={`Avatar de ${entry.name}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <span
                              className={cn(
                                isTopThree && "font-semibold",
                                index === 0 && "text-yellow-600 dark:text-yellow-400",
                                isBestRank && "text-green-600 dark:text-green-400",
                                "text-xs sm:text-base"
                              )}
                            >
                              {entry.name}
                              {isBestRank && " 🏆"}
                            </span>
                          </motion.div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs sm:text-lg p-1">
                          <motion.div
                            animate={{ scale: hasChanged ? [1, 1.2, 1] : 1 }}
                            transition={{ duration: 0.5 }}
                            className={cn(
                              isTopThree && "text-lg",
                              index === 0 && "text-yellow-600 dark:text-yellow-400"
                            )}
                          >
                            {entry.nbSales}
                          </motion.div>
                        </TableCell>
                        <TableCell className="text-right p-1">
                          {entry.cashCollected.toLocaleString()} €
                        </TableCell>
                        <TableCell className="text-right p-1">
                          {entry.totalRevenue.toLocaleString()} €
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        ) : (
          <LeaderboardCharts
            chartData={chartData}
            availableDates={availableDates}
            selectedDate={selectedDate}
            totalSales={totalSales}
            totalCash={totalCash}
            totalRevenue={totalRevenue}
            salesByUser={salesByUser}
            allDocsByDate={allDocsByDate}
          />
        )}
      </CardContent>
    </Card>
  );
} 