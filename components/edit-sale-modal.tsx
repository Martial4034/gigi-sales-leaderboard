"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit2, X, Check } from "lucide-react";
import { toast } from "sonner";

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

interface EditSaleModalProps {
  sale: SalesData;
  vendeurId: string;
  challenge: string;
  onUpdate: () => void;
}

export function EditSaleModal({ sale, vendeurId, challenge, onUpdate }: EditSaleModalProps) {
  console.log('🔧 EditSaleModal: Rendu du composant');
  console.log('- sale:', sale);
  console.log('- vendeurId:', vendeurId);
  console.log('- challenge:', challenge);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    BotMode: sale.BotMode || 'FU',
    Firebase_cashCollected: sale.Firebase_cashCollected,
    Firebase_totalRevenue: sale.Firebase_totalRevenue,
    Botcommentaire: sale.Botcommentaire || ''
  });

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/vendeur/${vendeurId}/update-sale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          saleId: sale.id_slack,
          challenge,
          updates: formData
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Vente mise à jour avec succès');
        setIsEditing(false);
        onUpdate();
      } else {
        toast.error(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      BotMode: sale.BotMode || 'FU',
      Firebase_cashCollected: sale.Firebase_cashCollected,
      Firebase_totalRevenue: sale.Firebase_totalRevenue,
      Botcommentaire: sale.Botcommentaire || ''
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          disabled={isLoading}
          onClick={handleSubmit}
          className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCancel}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  console.log('🔧 EditSaleModal: Rendu du bouton d\'édition');
  
  return (
    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setIsEditing(true)}>
      <Edit2 className="h-4 w-4" />
    </Button>
  );
} 