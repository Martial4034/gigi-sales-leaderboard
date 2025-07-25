# Maya Leaderboard Website

Un tableau de bord moderne pour suivre les performances de vente de l'équipe Maya.

## :page_facing_up: Automatisation des Factures

### Ressources principales
- **Tutoriel complet** : [Automatisation factures Isma & Benj](https://www.loom.com/share/6ed999a8ee604f1d95fb4dd1c9f4fa25?sid=2f24126a-f59d-4500-9a8a-04146f0b6e75)
  https://www.loom.com/share/6ed999a8ee604f1d95fb4dd1c9f4fa25?sid=2f24126a-f59d-4500-9a8a-04146f0b6e75

- **Template Excel** : [Modèle de facture](https://drive.google.com/file/d/1rOG_5mF3bvEn_75yoSg349nDKMGD9dsGUf1TszPJRmc/view)
  https://drive.google.com/file/d/1rOG_5mF3bvEn_75yoSg349nDKMGD9dsGUf1TszPJRmc/view

- **Suivi CA v15** : [Fichier de suivi](https://docs.google.com/spreadsheets/d/1uEpMdEgy6XdPJlZ9qqfXLCvYtSolBXzp7VMzv46mlfU/edit?gid=1220997020#gid=1220997020)
  https://docs.google.com/spreadsheets/d/1uEpMdEgy6XdPJlZ9qqfXLCvYtSolBXzp7VMzv46mlfU/edit?gid=1220997020#gid=1220997020

- **Canal Slack** : [Updates factures](https://teliosa.slack.com/archives/C08U70BJ6KU)
  https://teliosa.slack.com/archives/C08U70BJ6KU

- **Dossier factures** : [Destination des factures](https://drive.google.com/drive/u/1/folders/1VYwqAXrEViT5uChPDTWQweeTF9f8HAkD)
  https://drive.google.com/drive/u/1/folders/1VYwqAXrEViT5uChPDTWQweeTF9f8HAkD

## :bar_chart: Gestion des Ventes

### Ajouter de nouveaux vendeurs

Lien du google drive pour récuperer le dossier de maya complet : 
(url_a_placer_ici_par_moi_plus_tard)

1. **Regarder le tutoriel vidéo** : [Guide d'ajout des vendeurs](https://www.loom.com/share/f5fddbd812cd4bb491985633aa360433&t=120)
   https://www.loom.com/share/f5fddbd812cd4bb491985633aa360433&t=120

2. **Configurer l'automatisation N8N** :
   - Accéder au workflow : [Add_sales_challenge_maya](https://n8n-large.teliosa.com/workflow/CoXdpfDIFWaEdPWu)
     https://n8n-large.teliosa.com/workflow/CoXdpfDIFWaEdPWu
   - Ajouter les nouveaux ID Slack des vendeurs
   - Exécuter l'automatisation

3. **Traitement des données** :

   ```bash
   # Naviguer vers le dossier scripts
   cd script
   
   # Copier le résultat de l'automatisation N8N dans :
   # script/all_sales_filtered.json
   
   # Exécuter le script de mapping
   python feed_sales_mapping.py
   ```

## :trophy: Gestion des Challenges

### Ajouter un nouveau challenge

1. **Consulter le guide vidéo** : [Tutoriel challenges](https://www.loom.com/share/164bca626bed4f1f9818e60fae521e10)
   https://www.loom.com/share/164bca626bed4f1f9818e60fae521e10

2. **Configuration Firebase** :
   - Accéder à la console : [Firebase Console](https://console.firebase.google.com/u/1/project/gigi-sales-leaderboard/firestore/databases/-default-/data/~2Fchallenge_info~2Fmapping)
     https://console.firebase.google.com/u/1/project/gigi-sales-leaderboard/firestore/databases/-default-/data/~2Fchallenge_info~2Fmapping
   - Ajouter les informations du nouveau challenge dans la collection `challenge_info/mapping`

## :file_folder: Structure du Projet

```
maya-leaderboard/
├── script/
│   ├── all_sales_filtered.json    # Données des ventes filtrées
│   └── feed_sales_mapping.py      # Script de traitement des données
├── src/                           # Code source de l'application
└── package.json                   # Configuration du projet
```

## :memo: Workflow de Mise à Jour

1. **Ventes** : N8N → JSON → Script Python → Application
2. **Challenges** : Firebase Console → Configuration directe
3. **Déploiement** : Push vers la branche principale

## :link: Liens Utiles

- [Automation N8N](https://n8n-large.teliosa.com/workflow/CoXdpfDIFWaEdPWu)
  https://n8n-large.teliosa.com/workflow/CoXdpfDIFWaEdPWu

- [Console Firebase](https://console.firebase.google.com/u/1/project/gigi-sales-leaderboard/firestore)
  https://console.firebase.google.com/u/1/project/gigi-sales-leaderboard/firestore

- [Tutoriel Vendeurs](https://www.loom.com/share/f5fddbd812cd4bb491985633aa360433&t=120)
  https://www.loom.com/share/f5fddbd812cd4bb491985633aa360433&t=120

- [Tutoriel Challenges](https://www.loom.com/share/164bca626bed4f1f9818e60fae521e10)
  https://www.loom.com/share/164bca626bed4f1f9818e60fae521e10

## :busts_in_silhouette: Accès Firebase

**Emails autorisés sur la console Firebase :**
- guillaume@teliosa.com
- geoffrey@teliosa.com