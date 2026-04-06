import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Loader2, Download, Calendar } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface SeguimientoScreenProps {
  onBack: () => void;
  userId: string;
  trainerId: string | null;
}

export const SeguimientoScreen = ({ onBack, userId, trainerId }: SeguimientoScreenProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all' | 'monthly' | 'bimonthly' | 'quarterly'>('all');

  useEffect(() => {
    const q = query(
      collection(db, 'assessments'),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chartData = snapshot.docs.map(doc => {
        const d = doc.data();
        const date = d.createdAt?.toDate();
        return {
          date: date?.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
          fullDate: date,
          weight: d.weight,
          muscle: d.muscleMass,
          fat: d.bodyFat
        };
      });
      setData(chartData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'assessments');
    });

    return () => unsubscribe();
  }, [userId]);

  const filteredData = () => {
    if (period === 'all') return data;
    
    const now = new Date();
    let months = 1;
    if (period === 'bimonthly') months = 2;
    if (period === 'quarterly') months = 3;

    const cutoff = new Date();
    cutoff.setMonth(now.getMonth() - months);

    return data.filter(d => d.fullDate >= cutoff);
  };

  const exportToPDF = async () => {
    const element = document.getElementById('seguimiento-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#000000',
        scale: 2,
        onclone: (clonedDoc) => {
          const elements = clonedDoc.getElementsByTagName('*');
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const style = window.getComputedStyle(el);
            const properties = ['backgroundColor', 'color', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];

            properties.forEach(prop => {
              const value = (style as any)[prop];
              if (value && (value.includes('oklch') || value.includes('oklab'))) {
                ctx.clearRect(0, 0, 1, 1);
                ctx.fillStyle = value;
                ctx.fillRect(0, 0, 1, 1);
                const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
                (el.style as any)[prop] = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
              }
            });
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`seguimiento-${userId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const currentData = filteredData();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Seguimiento</h1>
        </div>
        <button 
          onClick={exportToPDF}
          className="p-2 bg-zinc-800 rounded-xl text-[#D4AF37] hover:bg-zinc-700 transition-all"
          title="Exportar Dashboard a PDF"
        >
          <Download size={20} />
        </button>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'all', label: 'Todo' },
            { id: 'monthly', label: 'Mensual' },
            { id: 'bimonthly', label: 'Bimestral' },
            { id: 'quarterly', label: 'Trimestral' }
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${period === p.id ? 'bg-[#D4AF37] text-black' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div id="seguimiento-content" className="space-y-10">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
            </div>
          ) : currentData.length < 2 ? (
            <div className="text-center py-20">
              <TrendingUp className="mx-auto text-zinc-800 mb-4" size={64} />
              <p className="text-zinc-500 italic">Se necesitan al menos 2 valoraciones en este periodo para generar gráficas.</p>
            </div>
          ) : (
            <>
              {/* Weight Chart */}
              <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#D4AF37] mb-6">Evolución del Peso (kg)</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={currentData}>
                      <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                        itemStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="weight" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Muscle vs Fat Chart */}
              <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6">Composición Corporal</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                      />
                      <Line type="monotone" dataKey="muscle" name="Músculo (kg)" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                      <Line type="monotone" dataKey="fat" name="Grasa (%)" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 bg-[#D4AF37]/5 rounded-3xl border border-[#D4AF37]/20">
                <h3 className="font-bold text-sm mb-2">Análisis del Coach</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Los datos muestran una tendencia {currentData[currentData.length-1].weight > currentData[0].weight ? 'ascendente' : 'descendente'} en el peso total en el periodo seleccionado. 
                  Es fundamental correlacionar estos cambios con la ingesta calórica y la intensidad de los entrenamientos registrados.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
