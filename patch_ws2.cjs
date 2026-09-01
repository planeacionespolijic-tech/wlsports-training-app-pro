const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutsScreen.tsx', 'utf8');

const target1 = `              <TrainingPlansTab 
                plans={trainingPlans}
                workouts={workouts}
                targetUserId={targetUserId as string}
                isAdminOrTrainer={userProfile?.role === 'trainer' || userProfile?.role === 'superadmin'}
                trainerIdForLog={trainerId || user?.uid || null}
                onAddSessionForPlan={(planId, planTitle) => {
                  setSelectedPlanId(planId);
                  resetForm();
                  setIsAdding(true);
                }}
              />`;
const replace1 = `              <TrainingPlansTab 
                plans={trainingPlans}
                workouts={workouts}
                targetUserId={targetUserId as string}
                isAdminOrTrainer={userProfile?.role === 'trainer' || userProfile?.role === 'superadmin'}
                trainerIdForLog={trainerId || user?.uid || null}
                onAddSessionForPlan={(planId, planTitle) => {
                  setSelectedPlanId(planId);
                  resetForm();
                  setIsAdding(true);
                }}
                onEditSession={(session) => {
                  handleEdit(session);
                }}
                onDeleteSession={(sessionId) => {
                  handleDelete(sessionId);
                }}
              />`;
if (code.includes(target1)) {
  code = code.replace(target1, replace1);
  fs.writeFileSync('src/screens/WorkoutsScreen.tsx', code);
  console.log('patched');
} else {
  console.log('target1 not found in WorkoutsScreen');
}
