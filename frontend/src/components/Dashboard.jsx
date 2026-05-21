import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard({ token, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [steps, setSteps] = useState('');
  const [calories, setCalories] = useState('');
  const [water, setWater] = useState('');
  const [socketStatus, setSocketStatus] = useState('Disconnected');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    fetchLogs();
    
    const socket = io();
    socket.on('connect', () => setSocketStatus('Connected (Real-time tracking active)'));
    socket.on('disconnect', () => setSocketStatus('Disconnected'));
    socket.on('steps_updated', (data) => {
      console.log(data);
      // Mocking real-time updates visually
    });

    return () => socket.disconnect();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await axios.get('/api/health', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/health', 
        { steps: Number(steps), calories: Number(calories), water: Number(water) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchLogs();
      setSteps(''); setCalories(''); setWater('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAskAI = async () => {
    setLoadingAi(true);
    try {
      // Get today's stats sum
      const today = new Date().toISOString().split('T')[0];
      const todaysLogs = logs.filter(l => l.date.startsWith(today));
      const totalSteps = todaysLogs.reduce((acc, curr) => acc + curr.steps, 0);

      const res = await axios.post('/api/ai/predict-calories',
        { steps: totalSteps, activeMinutes: totalSteps / 100, age: 30, weight: 70 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAiResponse(res.data.recommendation);
    } catch (err) {
      setAiResponse("AI service is currently unavailable.");
    }
    setLoadingAi(false);
  };

  // Chart Data
  const chartData = {
    labels: logs.slice(0, 7).reverse().map(l => new Date(l.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Steps',
        data: logs.slice(0, 7).reverse().map(l => l.steps),
        borderColor: 'rgb(56, 189, 248)',
        backgroundColor: 'rgba(56, 189, 248, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'Calories Burned',
        data: logs.slice(0, 7).reverse().map(l => l.calories),
        borderColor: 'rgb(244, 63, 94)',
        backgroundColor: 'rgba(244, 63, 94, 0.5)',
        yAxisID: 'y1',
      }
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: { type: 'linear', display: true, position: 'left' },
      y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } },
    },
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <nav className="flex justify-between items-center mb-8 bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          HealthTracker Dashboard
        </h1>
        <div className="flex items-center space-x-4">
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {socketStatus}
          </span>
          <button 
            onClick={onLogout}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Form */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-white">Log Activity</h2>
          <form onSubmit={handleLogSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Steps taken</label>
              <input type="number" value={steps} onChange={e => setSteps(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Calories burned</label>
              <input type="number" value={calories} onChange={e => setCalories(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Water intake (ml)</label>
              <input type="number" value={water} onChange={e => setWater(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" required />
            </div>
            <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 rounded transition-colors">
              Save Log
            </button>
          </form>

          {/* AI Section */}
          <div className="mt-8 pt-6 border-t border-slate-700">
            <h3 className="text-lg font-medium text-purple-400 mb-2">AI Health Assistant</h3>
            <p className="text-sm text-slate-400 mb-4">Get personalized insights based on your recent activity.</p>
            <button 
              onClick={handleAskAI}
              disabled={loadingAi}
              className="w-full flex justify-center items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/50 py-2 rounded transition-colors"
            >
              {loadingAi ? 'Analyzing...' : 'Ask AI'}
            </button>
            {aiResponse && (
              <div className="mt-4 p-4 bg-slate-900 rounded-lg text-sm text-slate-300 border border-slate-700">
                {aiResponse}
              </div>
            )}
          </div>
        </div>

        {/* Charts & Stats */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-white">Activity Overview</h2>
            {logs.length > 0 ? (
              <Line data={chartData} options={options} />
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                No data logged yet. Add some activity!
              </div>
            )}
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-white">Recent Logs</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-sm">
                    <th className="p-3">Date</th>
                    <th className="p-3">Steps</th>
                    <th className="p-3">Calories</th>
                    <th className="p-3">Water (ml)</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 5).map(log => (
                    <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors text-slate-300">
                      <td className="p-3">{new Date(log.date).toLocaleString()}</td>
                      <td className="p-3 text-cyan-400">{log.steps}</td>
                      <td className="p-3 text-rose-400">{log.calories}</td>
                      <td className="p-3 text-blue-400">{log.water}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
