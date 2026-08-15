const fs = require('fs');
let code = fs.readFileSync('src/screens/HistoryScreen.tsx', 'utf8');

code = code.replace(
`  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar este registro del historial?')) {
      try {
        await deleteDoc(doc(db, 'history', id));
        alert('Registro eliminado correctamente');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'history');
      }
    }
  };`,
`  const handleDelete = async (id: string, collectionName: string = 'history') => {
    if (window.confirm('¿Eliminar este registro del historial?')) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        alert('Registro eliminado correctamente');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, collectionName);
      }
    }
  };`
);

// We also need to update the button onClick
code = code.replace(
`                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}`,
`                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id, item.collection);
                          }}`
);

fs.writeFileSync('src/screens/HistoryScreen.tsx', code);
console.log("Fixed delete in HistoryScreen");
