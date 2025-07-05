"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Edit2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useUser, SignInButton } from "@clerk/nextjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DeleteSaleModal } from "@/components/delete-sale-modal";
import { 
  InlineSelect, 
  InlineCashInput, 
  InlineRevenueInput, 
  InlineTextInput,
  InlineClientInput
} from "@/components/inline-edit-fields";
import { formatDateShort } from "@/lib/utils";

interface SalesData {
  id_slack: string;
  Firebase_cashCollected: number;
  Firebase_totalRevenue: number;
  timestamp: {
    toDate: () => Date;
    seconds: number;
    nanoseconds: number;
  };
  BotMode?: string;
  Botcommentaire?: string;
  BotFirstName?: string;
  BotLastName?: string;
  challenge?: string;
}

interface SalesInfo {
  name: string;
  avatar_url: string;
  email?: string;
  is_admin?: boolean;
}

interface SalesInfoMapping {
  [key: string]: SalesInfo;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  nbSales: number;
  cashCollected: number;
  totalRevenue: number;
  avatar_image?: string;
}

interface EditingData {
  BotMode?: string;
  Firebase_cashCollected?: number;
  Firebase_totalRevenue?: number;
  Botcommentaire?: string;
  BotFirstName?: string;
  BotLastName?: string;
}

export default function VendeurProfile() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isSignedIn } = useUser();
  const [vendeur, setVendeur] = useState<LeaderboardEntry | null>(null);
  const [sales, setSales] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");
  const [availableChallenges, setAvailableChallenges] = useState<string[]>([]);
  const [vendeurInfo, setVendeurInfo] = useState<SalesInfo | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editingRows, setEditingRows] = useState<Set<number>>(new Set());
  const [editingData, setEditingData] = useState<Record<number, EditingData>>({});
  const [deletingRows, setDeletingRows] = useState<Set<number>>(new Set());
  const [savingRows, setSavingRows] = useState<Set<number>>(new Set());
  const [connectedUserInfo, setConnectedUserInfo] = useState<SalesInfo | null>(null);
  const [hasShownLoginToast, setHasShownLoginToast] = useState(false);

  // Récupérer les challenges disponibles et les informations du vendeur
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const vendeurId = params.id as string;
        
        // Récupérer les informations du vendeur depuis sales_info
        const salesInfoRef = collection(db, "sales_info");
        const salesInfoSnapshot = await getDocs(salesInfoRef);
        
        let vendeurInfo: SalesInfo | null = null;
        if (!salesInfoSnapshot.empty) {
          const mappingDoc = salesInfoSnapshot.docs[0].data() as SalesInfoMapping;
          vendeurInfo = mappingDoc[vendeurId];
        }
        
        if (vendeurInfo) {
          setVendeurInfo(vendeurInfo);
          
          // Récupérer les challenges disponibles
          const challenges = ['challenge1', 'challenge2', 'challenge3'];
          const availableChallenges: string[] = [];
          
          for (const challenge of challenges) {
            try {
              const challengeRef = collection(db, challenge);
              const challengeSnapshot = await getDocs(challengeRef);
              if (!challengeSnapshot.empty) {
                availableChallenges.push(challenge);
              }
            } catch {
              // Ignorer les challenges qui n'existent pas
              console.log(`Challenge ${challenge} non trouvé`);
            }
          }
          
          // Ajouter l'option "Tous les challenges"
          const allChallenges = ['Tous les challenges', ...availableChallenges];
          setAvailableChallenges(allChallenges);
          
          // Définir le challenge par défaut
          const challengeFromUrl = searchParams.get('challenge');
          let defaultChallenge = 'Tous les challenges';
          
          if (challengeFromUrl && availableChallenges.includes(challengeFromUrl)) {
            defaultChallenge = challengeFromUrl;
          } else if (availableChallenges.includes('challenge3')) {
            defaultChallenge = 'challenge3';
          }
          
          setSelectedChallenge(defaultChallenge);
        } else {
          toast.error("Vendeur non trouvé");
          router.push("/");
        }
      } catch (error) {
        console.error("Erreur lors du chargement initial:", error);
        toast.error("Erreur lors du chargement du vendeur");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchInitialData();
    }
  }, [params.id, router, searchParams]);

  // Afficher le toast de connexion pour les utilisateurs non connectés (une seule fois au montage)
  useEffect(() => {
    // Attendre un peu pour laisser Clerk s'initialiser
    const timer = setTimeout(() => {
      if (!isSignedIn && !hasShownLoginToast) {
        console.log('🔔 Affichage du toast de connexion pour utilisateur non connecté');
        toast.info(
          <div className="flex flex-col gap-2">
            <p>Vous pouvez désormais vous connecter pour modifier et gérer vos sales.</p>
            <SignInButton mode="modal">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                Se connecter
              </button>
            </SignInButton>
          </div>,
          {
            duration: 8000, // 8 secondes
            position: "top-center",
          }
        );
        setHasShownLoginToast(true);
      }
    }, 1000); // Délai de 1 seconde

    return () => clearTimeout(timer);
  }, [hasShownLoginToast, isSignedIn]);

  // Vérifier les permissions d'édition quand l'état de connexion change
  useEffect(() => {
    const checkPermissions = async () => {
      if (!isSignedIn || !user) {
        console.log('❌ Conditions non remplies pour l\'édition:');
        console.log('  - isSignedIn:', isSignedIn);
        console.log('  - user existe:', !!user);
        setCanEdit(false);
        return;
      }

      try {
        const userEmail = user.emailAddresses[0]?.emailAddress;
        console.log('🔍 Vérification des permissions d\'édition:');
        console.log('- isSignedIn:', isSignedIn);
        console.log('- user:', user);
        console.log('- userEmail:', userEmail);
        console.log('- vendeurInfo (page):', vendeurInfo);
        console.log('- vendeurInfo.email (page):', vendeurInfo?.email);
        console.log('- vendeurInfo.is_admin (page):', vendeurInfo?.is_admin);

        // Récupérer les informations de l'utilisateur connecté depuis sales_info
        const salesInfoRef = collection(db, "sales_info");
        const salesInfoSnapshot = await getDocs(salesInfoRef);
        
        if (salesInfoSnapshot.empty) {
          console.log('❌ Collection sales_info vide');
          setCanEdit(false);
          return;
        }

        const mappingDoc = salesInfoSnapshot.docs[0].data();
        console.log('- mappingDoc:', mappingDoc);

        // Trouver l'utilisateur connecté dans le mapping
        let foundConnectedUserInfo = null;
        for (const [, userData] of Object.entries(mappingDoc)) {
          if (userData.email === userEmail) {
            foundConnectedUserInfo = userData;
            break;
          }
        }

        console.log('- foundConnectedUserInfo:', foundConnectedUserInfo);
        console.log('- foundConnectedUserInfo.is_admin:', foundConnectedUserInfo?.is_admin);

        if (!foundConnectedUserInfo) {
          console.log('❌ Utilisateur connecté non trouvé dans le mapping');
          setCanEdit(false);
          setConnectedUserInfo(null);
          return;
        }

        // Stocker les informations de l'utilisateur connecté
        setConnectedUserInfo(foundConnectedUserInfo);

        // Réinitialiser l'état du toast quand l'utilisateur se connecte
        setHasShownLoginToast(false);

        // Vérifier si l'utilisateur connecté est admin
        if (foundConnectedUserInfo.is_admin === true) {
          console.log('✅ Utilisateur connecté est admin - Édition autorisée pour tous les vendeurs');
          setCanEdit(true);
        }
        // Vérifier si l'email correspond au vendeur de la page (pour les vendeurs non-admin)
        else if (vendeurInfo?.email && userEmail === vendeurInfo.email) {
          console.log('✅ Email correspond au vendeur de la page - Édition autorisée');
          setCanEdit(true);
        } else {
          console.log('❌ Aucune permission d\'édition:');
          console.log('  - foundConnectedUserInfo.is_admin:', foundConnectedUserInfo.is_admin);
          console.log('  - email correspond au vendeur:', vendeurInfo?.email === userEmail);
          setCanEdit(false);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification des permissions:', error);
        setCanEdit(false);
      }
    };

    checkPermissions();
  }, [isSignedIn, user, vendeurInfo]);

  // Récupérer les ventes du vendeur pour le challenge sélectionné
  useEffect(() => {
    const fetchSalesData = async () => {
      if (!selectedChallenge || !vendeurInfo) return;
      
      try {
        const vendeurId = params.id as string;
        const allSales: SalesData[] = [];
        
        if (selectedChallenge === 'Tous les challenges') {
          // Récupérer les ventes de tous les challenges
          const challenges = ['challenge1', 'challenge2', 'challenge3'];
          
          for (const challenge of challenges) {
            try {
              const challengeRef = collection(db, challenge);
              const challengeSnapshot = await getDocs(challengeRef);
              
              challengeSnapshot.docs.forEach((doc) => {
                const data = doc.data() as SalesData;
                if (data.id_slack === vendeurId) {
                  // Ajouter le challenge comme propriété pour l'identification
                  allSales.push({
                    ...data,
                    challenge: challenge
                  });
                }
              });
            } catch {
              // Ignorer les challenges qui n'existent pas
              console.log(`Challenge ${challenge} non trouvé`);
            }
          }
        } else {
          // Récupérer les ventes d'un challenge spécifique
          const challengeRef = collection(db, selectedChallenge);
          const challengeSnapshot = await getDocs(challengeRef);
          
          challengeSnapshot.docs.forEach((doc) => {
            const data = doc.data() as SalesData;
            if (data.id_slack === vendeurId) {
              allSales.push({
                ...data,
                challenge: selectedChallenge
              });
            }
          });
        }
        
        // Calculer les totaux
        const totalCash = allSales.reduce((sum, sale) => sum + sale.Firebase_cashCollected, 0);
        const totalRevenue = allSales.reduce((sum, sale) => sum + sale.Firebase_totalRevenue, 0);
        
        const vendeurData: LeaderboardEntry = {
          id: vendeurId,
          name: vendeurInfo.name,
          nbSales: allSales.length,
          cashCollected: totalCash,
          totalRevenue: totalRevenue,
          avatar_image: vendeurInfo.avatar_url
        };
        
        setVendeur(vendeurData);
        setSales(allSales);
      } catch (error) {
        console.error("Erreur lors du chargement des ventes:", error);
        toast.error("Erreur lors du chargement des ventes");
      }
    };

    fetchSalesData();
  }, [selectedChallenge, vendeurInfo, params.id]);

  // Fonctions pour gérer l'édition inline
  const startEditing = (index: number, sale: SalesData) => {
    setEditingRows(prev => new Set(prev).add(index));
    setEditingData(prev => ({
      ...prev,
      [index]: {
        BotMode: sale.BotMode || 'FU',
        Firebase_cashCollected: sale.Firebase_cashCollected,
        Firebase_totalRevenue: sale.Firebase_totalRevenue,
        Botcommentaire: sale.Botcommentaire || '',
        BotFirstName: sale.BotFirstName || '',
        BotLastName: sale.BotLastName || ''
      }
    }));
  };

  const stopEditing = (index: number) => {
    setEditingRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
    setEditingData(prev => {
      const newData = { ...prev };
      delete newData[index];
      return newData;
    });
  };

  const updateEditingData = (index: number, field: string, value: string | number) => {
    setEditingData(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };

  const updateClientName = (index: number, firstName: string, lastName: string) => {
    setEditingData(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        BotFirstName: firstName,
        BotLastName: lastName
      }
    }));
  };

  const saveRow = async (index: number) => {
    const sale = sales[index];
    const updates = editingData[index];
    
    if (!updates || !vendeur) return;

    // Marquer la ligne comme en cours de sauvegarde
    setSavingRows(prev => new Set(prev).add(index));

    try {
      // Utiliser le challenge de la vente si disponible, sinon le challenge sélectionné
      const challengeToUse = sale.challenge || selectedChallenge;
      
      // Extraire le timestamp pour identifier précisément la vente
      const timestamp = sale.timestamp ? {
        seconds: sale.timestamp.seconds || Math.floor(sale.timestamp.toDate().getTime() / 1000),
        nanoseconds: sale.timestamp.nanoseconds || ((sale.timestamp.toDate().getTime() % 1000) * 1000000)
      } : null;
      
      if (!timestamp) {
        toast.error('Impossible de récupérer le timestamp de la vente');
        return;
      }
      
      const response = await fetch(`/api/vendeur/${vendeur.id}/update-sale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          saleId: sale.id_slack,
          challenge: challengeToUse,
          timestamp,
          updates
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Vente mise à jour avec succès');
        stopEditing(index);
        refreshData();
      } else {
        toast.error(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      // Retirer la ligne du loading
      setSavingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const handleDeleteRow = async (index: number) => {    
    if (!vendeur) return;

    // Marquer la ligne comme en cours de suppression
    setDeletingRows(prev => new Set(prev).add(index));

    // Attendre un peu pour que l'animation se termine
    setTimeout(() => {
      // Mettre à jour directement l'état local
      setSales(prevSales => {
        const newSales = prevSales.filter((_, i) => i !== index);
        return newSales;
      });
      
      // Mettre à jour les statistiques du vendeur
      setVendeur(prevVendeur => {
        if (!prevVendeur) return prevVendeur;
        const deletedSale = sales[index];
        return {
          ...prevVendeur,
          nbSales: prevVendeur.nbSales - 1,
          cashCollected: prevVendeur.cashCollected - deletedSale.Firebase_cashCollected,
          totalRevenue: prevVendeur.totalRevenue - deletedSale.Firebase_totalRevenue
        };
      });
      
      // Retirer la ligne de la liste des suppressions en cours
      setDeletingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 600); // Durée de l'animation
  };

  // Fonction pour rafraîchir les données après modification
  const refreshData = () => {
    // Déclencher un nouveau chargement des données en utilisant la même logique que fetchSalesData
    const fetchSalesData = async () => {
      if (!selectedChallenge || !vendeurInfo) return;
      
      try {
        const vendeurId = params.id as string;
        const allSales: SalesData[] = [];
        
        if (selectedChallenge === 'Tous les challenges') {
          // Récupérer les ventes de tous les challenges
          const challenges = ['challenge1', 'challenge2', 'challenge3'];
          
          for (const challenge of challenges) {
            try {
              const challengeRef = collection(db, challenge);
              const challengeSnapshot = await getDocs(challengeRef);
              
              challengeSnapshot.docs.forEach((doc) => {
                const data = doc.data() as SalesData;
                if (data.id_slack === vendeurId) {
                  allSales.push({
                    ...data,
                    challenge: challenge
                  });
                }
              });
            } catch {
              console.log(`Challenge ${challenge} non trouvé`);
            }
          }
        } else {
          // Récupérer les ventes d'un challenge spécifique
          const challengeRef = collection(db, selectedChallenge);
          const challengeSnapshot = await getDocs(challengeRef);
          
          challengeSnapshot.docs.forEach((doc) => {
            const data = doc.data() as SalesData;
            if (data.id_slack === vendeurId) {
              allSales.push({
                ...data,
                challenge: selectedChallenge
              });
            }
          });
        }
        
        // Calculer les totaux
        const totalCash = allSales.reduce((sum, sale) => sum + sale.Firebase_cashCollected, 0);
        const totalRevenue = allSales.reduce((sum, sale) => sum + sale.Firebase_totalRevenue, 0);
        
        const vendeurData: LeaderboardEntry = {
          id: vendeurId,
          name: vendeurInfo.name,
          nbSales: allSales.length,
          cashCollected: totalCash,
          totalRevenue: totalRevenue,
          avatar_image: vendeurInfo.avatar_url
        };
        
        setVendeur(vendeurData);
        setSales(allSales);
      } catch (error) {
        console.error("Erreur lors du chargement des ventes:", error);
        toast.error("Erreur lors du chargement des ventes");
      }
    };

    fetchSalesData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-lg">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!vendeur) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-500">Vendeur non trouvé</p>
          <Button onClick={() => router.push("/")} className="mt-4">
            Retour au leaderboard
          </Button>
        </div>
      </div>
    );
  }

  console.log('🎨 Rendu du composant:');
  console.log('- canEdit:', canEdit);
  console.log('- vendeur:', vendeur);
  console.log('- sales.length:', sales.length);
  console.log('- sales:', sales);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="mb-6">
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au leaderboard
          </Button>
        </div>

        {/* Profil du vendeur */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 overflow-hidden">
                  <Image
                    src={vendeur.avatar_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${vendeur.name}`}
                    alt={`Avatar de ${vendeur.name}`}
                    fill
                    className="object-cover rounded-full"
                    priority
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold">{vendeur.name}</h1>
                    {vendeurInfo?.is_admin && (
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">
                        👑 Admin
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">ID: {vendeur.id}</p>
                </div>
              </div>
              
              {/* Sélecteur de challenge */}
              <div className="sm:ml-auto">
                <Select value={selectedChallenge} onValueChange={setSelectedChallenge}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sélectionner un challenge" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChallenges.map((challenge) => (
                      <SelectItem key={challenge} value={challenge}>
                        {challenge}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Statistiques pour <span className="font-bold text-blue-600 dark:text-blue-400">{selectedChallenge}</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {vendeur.nbSales}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Ventes</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {vendeur.cashCollected.toLocaleString()} €
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Cash Collecté</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {vendeur.totalRevenue.toLocaleString()} €
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Revenu Total</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historique des ventes */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Historique des ventes</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {sales.length} vente{sales.length > 1 ? 's' : ''} trouvée{sales.length > 1 ? 's' : ''}
                </p>
              </div>
              {canEdit && (
                <div className="text-sm font-medium">
                  {connectedUserInfo?.is_admin ? (
                    <span className="text-purple-600 dark:text-purple-400">
                      👑 Mode admin - Édition de tous les vendeurs
                    </span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">
                      ✏️ Mode édition activé
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Aucune vente trouvée pour ce vendeur.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border rounded-lg">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/40">
                      <th className="p-3 text-left w-32">Date</th>
                      <th className="p-3 text-left">Client</th>
                      {selectedChallenge === 'Tous les challenges' && (
                        <th className="p-3 text-center">Challenge</th>
                      )}
                      <th className="p-3 text-right">Cash</th>
                      <th className="p-3 text-right">Revenu</th>
                      <th className="p-3 text-center">Mode</th>
                      <th className="p-3 text-left">Commentaire</th>
                      {canEdit && <th className="p-3 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {sales
                        .sort((a, b) => {
                          const dateA = a.timestamp?.toDate?.() || new Date(0);
                          const dateB = b.timestamp?.toDate?.() || new Date(0);
                          return dateB.getTime() - dateA.getTime();
                        })
                        .map((sale, idx) => (
                          <motion.tr
                            key={`${sale.id_slack}-${idx}`}
                            initial={{ opacity: 1, backgroundColor: "transparent" }}
                            animate={{ 
                              opacity: deletingRows.has(idx) ? 0.7 : 1,
                              backgroundColor: deletingRows.has(idx) ? "rgba(239, 68, 68, 0.1)" : "transparent",
                              scale: deletingRows.has(idx) ? 0.98 : 1
                            }}
                            exit={{ 
                              opacity: 0,
                              backgroundColor: "rgba(239, 68, 68, 0.2)",
                              scale: 0.95,
                              x: -20
                            }}
                            transition={{ 
                              duration: 0.6,
                              ease: "easeInOut"
                            }}
                            className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                          <td className="p-3 w-32 text-xs">
                            {sale.timestamp && typeof sale.timestamp.toDate === 'function' 
                              ? formatDateShort(sale.timestamp)
                              : 'Date inconnue'
                            }
                          </td>
                          <td className="p-3">
                            {canEdit ? (
                              <InlineClientInput
                                firstName={editingRows.has(idx) ? editingData[idx]?.BotFirstName || '' : (sale.BotFirstName || '')}
                                lastName={editingRows.has(idx) ? editingData[idx]?.BotLastName || '' : (sale.BotLastName || '')}
                                onValueChange={(firstName: string, lastName: string) => updateClientName(idx, firstName, lastName)}
                                isEditing={editingRows.has(idx)}
                                onEdit={() => startEditing(idx, sale)}
                                className="text-sm"
                              />
                            ) : (
                              <span className="text-sm">
                                {`${sale.BotFirstName || ''} ${sale.BotLastName || ''}`.trim() || '-'}
                              </span>
                            )}
                          </td>
                          {selectedChallenge === 'Tous les challenges' && (
                            <td className="p-3 text-center">
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded">
                                {sale.challenge}
                              </span>
                            </td>
                          )}
                          <td className="p-3 text-right font-medium">
                            {canEdit ? (
                              <InlineCashInput
                                value={editingRows.has(idx) ? editingData[idx]?.Firebase_cashCollected ?? sale.Firebase_cashCollected : sale.Firebase_cashCollected}
                                onValueChange={(value: number) => updateEditingData(idx, 'Firebase_cashCollected', value)}
                                isEditing={editingRows.has(idx)}
                                onEdit={() => startEditing(idx, sale)}
                                className="text-right"
                              />
                            ) : (
                              sale.Firebase_cashCollected?.toLocaleString() + ' €'
                            )}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {canEdit ? (
                              <InlineRevenueInput
                                value={editingRows.has(idx) ? editingData[idx]?.Firebase_totalRevenue ?? sale.Firebase_totalRevenue : sale.Firebase_totalRevenue}
                                onValueChange={(value: number) => updateEditingData(idx, 'Firebase_totalRevenue', value)}
                                isEditing={editingRows.has(idx)}
                                onEdit={() => startEditing(idx, sale)}
                                className="text-right"
                              />
                            ) : (
                              sale.Firebase_totalRevenue?.toLocaleString() + ' €'
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {canEdit ? (
                              <InlineSelect
                                value={editingRows.has(idx) ? editingData[idx]?.BotMode || 'FU' : (sale.BotMode || 'FU')}
                                onValueChange={(value: string) => updateEditingData(idx, 'BotMode', value)}
                                options={[
                                  { value: 'FU', label: 'FU' },
                                  { value: 'OCC', label: 'OCC' }
                                ]}
                                isEditing={editingRows.has(idx)}
                                onEdit={() => startEditing(idx, sale)}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  (editingRows.has(idx) ? editingData[idx]?.BotMode : sale.BotMode) === 'FU' 
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                }`}
                              />
                            ) : (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                sale.BotMode === 'FU' 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              }`}>
                                {sale.BotMode || 'N/A'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                            {canEdit ? (
                              <InlineTextInput
                                value={editingRows.has(idx) ? editingData[idx]?.Botcommentaire || '' : (sale.Botcommentaire || '')}
                                onValueChange={(value: string) => updateEditingData(idx, 'Botcommentaire', value)}
                                isEditing={editingRows.has(idx)}
                                onEdit={() => startEditing(idx, sale)}
                                placeholder="Commentaire..."
                                className="text-sm"
                              />
                            ) : (
                              sale.Botcommentaire || '-'
                            )}
                          </td>
                          {canEdit && (
                            <td className="p-3 text-center">
                              {editingRows.has(idx) ? (
                                <div className="flex items-center gap-1">
                                  <Button 
                                    size="sm" 
                                    onClick={() => saveRow(idx)}
                                    disabled={savingRows.has(idx)}
                                    className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {savingRows.has(idx) ? (
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => stopEditing(idx)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 w-8 p-0" 
                                    onClick={() => startEditing(idx, sale)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <DeleteSaleModal
                                    sale={{
                                      ...sale,
                                      date: sale.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
                                    }}
                                    vendeurId={vendeur.id}
                                    challenge={selectedChallenge}
                                    onDelete={() => handleDeleteRow(idx)}
                                  />
                                </div>
                              )}
                            </td>
                          )}
                          </motion.tr>
                        ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 