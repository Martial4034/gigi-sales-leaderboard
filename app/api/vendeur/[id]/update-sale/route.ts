import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/firebase';
import { updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface UpdateSaleRequest {
  saleId: string;
  challenge: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
  updates: {
    BotMode?: 'FU' | 'OCC';
    Firebase_cashCollected?: number;
    Firebase_totalRevenue?: number;
    Botcommentaire?: string;
    BotFirstName?: string;
    BotLastName?: string;
  };
}


interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    console.log('🚀 API: Début de la requête de mise à jour');
    
    // Vérifier l'authentification
    await auth();
    const user = await currentUser();
    console.log('🔐 API: Vérification authentification:');
    console.log('- user:', user);
    console.log('- user.emailAddresses:', user?.emailAddresses);
    
    if (!user) {
      console.log('❌ API: Utilisateur non authentifié');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const resolvedParams = await params;
    const vendeurId = resolvedParams.id;
    const { saleId, challenge, timestamp, updates }: UpdateSaleRequest = await request.json();
    console.log('📝 API: Données reçues:');
    console.log('- vendeurId:', vendeurId);
    console.log('- saleId:', saleId);
    console.log('- challenge:', challenge);
    console.log('- timestamp:', timestamp);
    console.log('- updates:', updates);

    // Vérifier les permissions d'édition (email correspondant ou admin)
    console.log('🔍 API: Récupération des informations utilisateur connecté');
    const salesInfoRef = collection(db, "sales_info");
    const salesInfoSnapshot = await getDocs(salesInfoRef);
    
    if (salesInfoSnapshot.empty) {
      console.log('❌ API: Collection sales_info vide');
      return NextResponse.json({ error: 'Informations vendeur non trouvées' }, { status: 404 });
    }

    const mappingDoc = salesInfoSnapshot.docs[0].data();
    const userEmail = user.emailAddresses[0]?.emailAddress;
    
    // Trouver l'utilisateur connecté dans le mapping
    let connectedUserInfo = null;
    for (const [, userData] of Object.entries(mappingDoc)) {
      if (userData.email === userEmail) {
        connectedUserInfo = userData;
        break;
      }
    }

    console.log('📋 API: Informations utilisateur connecté:');
    console.log('- mappingDoc:', mappingDoc);
    console.log('- connectedUserInfo:', connectedUserInfo);
    console.log('- connectedUserInfo.email:', connectedUserInfo?.email);
    console.log('- connectedUserInfo.is_admin:', connectedUserInfo?.is_admin);

    if (!connectedUserInfo) {
      console.log('❌ API: Utilisateur connecté non trouvé dans le mapping');
      return NextResponse.json({ error: 'Utilisateur non autorisé' }, { status: 403 });
    }

    // Vérifier les permissions d'édition
    console.log('📧 API: Vérification des permissions:');
    console.log('- userEmail:', userEmail);
    console.log('- connectedUserInfo.email:', connectedUserInfo.email);
    console.log('- connectedUserInfo.is_admin:', connectedUserInfo.is_admin);
    
    // Vérifier si l'utilisateur connecté est admin
    if (connectedUserInfo.is_admin === true) {
      console.log('✅ API: Utilisateur connecté est admin - Accès autorisé pour tous les vendeurs');
    }
    // Vérifier si l'email correspond au vendeur de la page (pour les vendeurs non-admin)
    else {
      const vendeurInfo = mappingDoc[vendeurId];
      if (!vendeurInfo) {
        console.log('❌ API: Vendeur de la page non trouvé dans le mapping');
        return NextResponse.json({ error: 'Vendeur non trouvé' }, { status: 404 });
      }
      
      if (vendeurInfo.email && vendeurInfo.email === userEmail) {
        console.log('✅ API: Email correspond au vendeur de la page - Accès autorisé');
      } else {
        console.log('❌ API: Aucune permission d\'édition - Accès refusé');
        console.log('  - connectedUserInfo.is_admin:', connectedUserInfo.is_admin);
        console.log('  - email correspond au vendeur:', vendeurInfo.email === userEmail);
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
      }
    }

    // Valider les données
    if (updates.BotMode && !['FU', 'OCC'].includes(updates.BotMode)) {
      return NextResponse.json({ error: 'Mode invalide' }, { status: 400 });
    }

    if (updates.Firebase_cashCollected && (updates.Firebase_cashCollected < 0 || updates.Firebase_cashCollected > 10000)) {
      return NextResponse.json({ error: 'Montant cash invalide' }, { status: 400 });
    }

    if (updates.Firebase_totalRevenue && ![5800, 6000].includes(updates.Firebase_totalRevenue)) {
      return NextResponse.json({ error: 'Montant revenu invalide' }, { status: 400 });
    }

    if (updates.BotFirstName && updates.BotFirstName.length > 50) {
      return NextResponse.json({ error: 'Prénom trop long' }, { status: 400 });
    }

    if (updates.BotLastName && updates.BotLastName.length > 100) {
      return NextResponse.json({ error: 'Nom de famille trop long' }, { status: 400 });
    }

    // Trouver et mettre à jour le document par timestamp + id_slack
    const challengeRef = collection(db, challenge);
    const q = query(challengeRef, where("id_slack", "==", vendeurId));
    const querySnapshot = await getDocs(q);

    let saleDocRef = null;
    querySnapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      // Identifier le document par son timestamp unique + id_slack
      if (data.timestamp && 
          data.timestamp.seconds === timestamp.seconds && 
          data.timestamp.nanoseconds === timestamp.nanoseconds &&
          data.id_slack === vendeurId) {
        saleDocRef = docSnapshot.ref;
      }
    });

    if (!saleDocRef) {
      console.log('❌ API: Vente non trouvée avec timestamp:', timestamp);
      return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 });
    }

    // Mettre à jour le document
    const updateData: Record<string, string | number | undefined> = {};
    if (updates.BotMode) updateData.BotMode = updates.BotMode;
    if (updates.Firebase_cashCollected) updateData.Firebase_cashCollected = updates.Firebase_cashCollected;
    if (updates.Firebase_totalRevenue) updateData.Firebase_totalRevenue = updates.Firebase_totalRevenue;
    if (updates.Botcommentaire) updateData.Botcommentaire = updates.Botcommentaire;
    if (updates.BotFirstName !== undefined) updateData.BotFirstName = updates.BotFirstName;
    if (updates.BotLastName , undefined) updateData.BotLastName = updates.BotLastName;

    await updateDoc(saleDocRef, updateData);

    return NextResponse.json({ 
      success: true, 
      message: 'Vente mise à jour avec succès' 
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 