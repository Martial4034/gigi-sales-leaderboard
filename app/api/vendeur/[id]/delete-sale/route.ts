import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/firebase';
import { deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  console.log('🗑️ API DELETE SALE: Début de la requête');
  
  try {
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
    const { timestamp, challenge } = await request.json();
    console.log('📝 API: Données reçues:');
    console.log('- vendeurId:', vendeurId);
    console.log('- timestamp:', timestamp);
    console.log('- challenge:', challenge);

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

    console.log('✅ API: Autorisation validée');

    // Supprimer la vente depuis la collection du challenge
    const challengeRef = collection(db, challenge);
    const q = query(challengeRef, where("id_slack", "==", vendeurId));
    const querySnapshot = await getDocs(q);

    let saleDocRef = null;
    console.log('🔍 API: Recherche de la vente avec timestamp:', timestamp);
    
    querySnapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      console.log('📄 API: Document trouvé:', {
        id_slack: data.id_slack,
        timestamp: data.timestamp,
        timestamp_seconds: data.timestamp?.seconds,
        timestamp_nanoseconds: data.timestamp?.nanoseconds
      });
      
      // Identifier le document par son timestamp unique + id_slack
      if (data.timestamp && 
          data.timestamp.seconds === timestamp.seconds && 
          data.timestamp.nanoseconds === timestamp.nanoseconds &&
          data.id_slack === vendeurId) {
        saleDocRef = docSnapshot.ref;
        console.log('✅ API: Vente trouvée avec timestamp exact');
      }
    });

    if (!saleDocRef) {
      console.log('❌ API: Vente non trouvée avec timestamp:', timestamp);
      console.log('❌ API: Nombre de documents trouvés pour ce vendeur:', querySnapshot.docs.length);
      return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 });
    }

    await deleteDoc(saleDocRef);
    console.log('✅ API: Vente supprimée avec succès');

    return NextResponse.json({ 
      success: true, 
      message: 'Vente supprimée avec succès' 
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 