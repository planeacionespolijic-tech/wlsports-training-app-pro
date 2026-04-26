import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { 
  EvaluationFormData, 
  EvaluationResult, 
  generateEvaluationResult 
} from '../services/evaluationEngine';
import { mapLegacyData } from '../services/evaluationMapper';

const INITIAL_FORM_DATA: EvaluationFormData = {
  profile: {
    name: '',
    age: '',
    sport: '',
    position: '',
    laterality: 'Derecha',
    inspiration: ''
  },
  health: {
    medicalHistory: '',
    injuries: '',
    medication: '',
    illnesses: '',
    restrictions: ''
  },
  habits: {
    sleepHours: '',
    stressLevel: 'Medio',
    lifestyle: '',
    sittingHours: '',
    nutritionQuality: 'Correcta',
    hydration: ''
  },
  environment: {
    surfaceType: '',
    footwear: '',
    material: '',
    weeklyFrequency: ''
  },
  goals: {
    goal90Days: '',
    priority: '',
    motivation: '',
    longTermGoals: ''
  },
  commitment: ''
};

export const useInitialEvaluation = (userId: string | undefined) => {
  const [formData, setFormData] = useState<EvaluationFormData>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        const anamnesisRef = doc(db, 'anamnesis', userId);
        const anamnesisSnap = await getDoc(anamnesisRef);

        const mappedData = mapLegacyData(
          INITIAL_FORM_DATA,
          userSnap.exists() ? userSnap.data() : null,
          anamnesisSnap.exists() ? anamnesisSnap.data() : null
        );

        setFormData(mappedData);

        if (userSnap.exists() && userSnap.data()?.initialEvaluation) {
          setEvaluationResult(userSnap.data().initialEvaluation);
          // If we want to show results directly if already done, we can set finished to true here
          // But maybe we want the user to be able to edit. Let's keep finished for the "just submitted" state.
        }
      } catch (error) {
        console.error("Error loading evaluation data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const updateData = (section: keyof EvaluationFormData | 'commitment', data: any) => {
    if (section === 'commitment') {
      setFormData(prev => ({ ...prev, commitment: data }));
    } else {
      setFormData(prev => ({ ...prev, [section]: data }));
    }
  };

  const submitEvaluation = async () => {
    if (!userId) return;
    setSubmitting(true);
    
    const resultPayload = generateEvaluationResult(formData);
    const fullResult: EvaluationResult = {
      ...resultPayload,
      createdAt: serverTimestamp()
    };

    try {
      // 1. Update user profile (summary)
      await updateDoc(doc(db, 'users', userId), {
        initialEvaluation: fullResult
      });

      // 2. Save to history subcollection
      const historyRef = collection(db, 'users', userId, 'evaluations');
      await addDoc(historyRef, fullResult);

      setEvaluationResult(fullResult);
      setFinished(true);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formData,
    loading,
    submitting,
    finished,
    evaluationResult,
    updateData,
    submitEvaluation,
    setFinished
  };
};
