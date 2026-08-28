const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const importTarget = `import { useAuth } from '../context/AuthContext';`;
const newImport = `import { useAuth } from '../context/AuthContext';\nimport { TrainingPlansTab } from '../components/TrainingPlansTab';`;
code = code.replace(importTarget, newImport);

const tabTarget = `{activeTab === 'programados' && (`;
const newTabContent = `{activeTab === 'planes' && (
              <TrainingPlansTab 
                plans={trainingPlans}
                targetUserId={targetUserId as string}
                isAdminOrTrainer={userProfile?.role === 'trainer' || userProfile?.role === 'superadmin'}
                trainerIdForLog={trainerId || user?.uid || null}
                onAddSessionForPlan={(planId, planTitle) => {
                  setSelectedPlanId(planId);
                  resetForm();
                  setIsAdding(true);
                }}
              />
            )}
            
            {activeTab === 'programados' && (`;

code = code.replace(tabTarget, newTabContent);

fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
console.log('patched WorkoutsScreen to include TrainingPlansTab');
