const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('C:/Users/DELL/.gemini/antigravity/firebase/serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixPortfolios() {
  const snapshot = await db.collection('projects').where('systemType', '==', 'portfolio').get();
  console.log(`Found ${snapshot.docs.length} portfolio projects.`);
  
  // Group by ownerId
  const byOwner = {};
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!byOwner[data.ownerId]) byOwner[data.ownerId] = [];
    byOwner[data.ownerId].push({ id: doc.id, ...data, ref: doc.ref });
  }

  const batch = db.batch();
  let updatedCount = 0;

  for (const ownerId in byOwner) {
    const projects = byOwner[ownerId];
    // Sort by createdAt descending
    projects.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });

    // The most recent one is kept as isSystem: true, all others have isSystem set to false
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      if (i === 0) {
        if (!p.isSystem) {
          batch.update(p.ref, { isSystem: true });
          updatedCount++;
        }
      } else {
        if (p.isSystem) {
          batch.update(p.ref, { isSystem: false });
          updatedCount++;
        }
        if (p.isPinned) {
          batch.update(p.ref, { isPinned: false });
        }
      }
    }
  }

  await batch.commit();
  console.log(`Updated ${updatedCount} portfolio projects to fix duplicates.`);
}

fixPortfolios().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
