"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SaleData {
  id_slack: string;
  date: string;
  clientName?: string;
  customerName?: string;
  Firebase_cashCollected?: number;
  Firebase_totalRevenue?: number;
  BotMode?: string;
  Botcommentaire?: string;
  BotFirstName?: string;
  BotLastName?: string;
  challenge?: string;
  timestamp?: {
    toDate: () => Date;
    seconds: number;
    nanoseconds: number;
  };
}

interface DeleteSaleModalProps {
  sale: SaleData;
  vendeurId: string;
  challenge: string;
  onDelete: () => void;
}

export function DeleteSaleModal({ sale, vendeurId, challenge, onDelete }: DeleteSaleModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      const challengeToUse = sale.challenge || challenge;
      
      const response = await fetch(`/api/vendeur/${vendeurId}/delete-sale`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: sale.timestamp ? {
            seconds: sale.timestamp.seconds,
            nanoseconds: sale.timestamp.nanoseconds
          } : null,
          challenge: challengeToUse
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Vente supprimée avec succès');
        onDelete();
      } else {
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getClientName = () => {
    // Essayer de récupérer le nom du client depuis les données de la vente
    // Si pas disponible, utiliser une valeur par défaut
    return sale.clientName || sale.customerName || 'Client';
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Attention</AlertDialogTitle>
          <AlertDialogDescription>
            Vous êtes sur le point de supprimer une vente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Vous supprimez la vente <span className="font-semibold">{sale.id_slack}</span> du client{' '}
            <span className="font-semibold">{getClientName()}</span> de la date{' '}
            <span className="font-semibold">{formatDate(sale.date)}</span>.
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            Cette action est irréversible.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? 'Suppression...' : 'Valider'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 