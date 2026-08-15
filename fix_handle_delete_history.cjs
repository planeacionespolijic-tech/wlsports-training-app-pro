const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const target = `  const handleDelete = async (id: string) => {`;

const newCode = `  const handleDeleteHistory = async (id: string, collectionName: string = 'history') => {
    if (window.confirm('¿Eliminar este registro del historial?')) {
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, collectionName);
      }
    }
  };

  const handleDelete = async (id: string) => {`;

code = code.replace(target, newCode);
fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log("Added handleDeleteHistory");
