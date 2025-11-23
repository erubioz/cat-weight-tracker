import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Minus, AlertTriangle, Plus, Save } from 'lucide-react';

const SHEET_ID = '1wOd3OH2QwUGBNfzELaevKqKQhAgL6tmROgfqps5sOfk';
const SHEET_NAME = 'Hoja 1';

const CAT_COLORS = {
  'Maite': '#FF6B9D',
  'Benito': '#4ECDC4',
  'Gaudí': '#FFE66D',
  'Cleopatra': '#6B9BFF'
};

const CAT_INFO = {
  'Maite': { age: '10 años', birthday: '4 de enero', specialNote: '' },
  'Benito': { age: '9 años', birthday: '13 de noviembre', specialNote: '' },
  'Gaudí': { age: '6 años', birthday: '28 de noviembre', specialNote: '' },
  'Cleopatra': { age: '4 meses', birthday: '2 de julio', specialNote: '' }
};

const parseSheetDate = (dateString) => {
  if (!dateString) return null;
  
  const parts = dateString.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && 
        day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000) {
      return new Date(year, month, day);
    }
  }
  
  const fallbackDate = new Date(dateString);
  return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
};

const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCats, setSelectedCats] = useState(['Maite', 'Benito', 'Gaudí', 'Cleopatra']);
  const [dateRange, setDateRange] = useState('all');
  const [error, setError] = useState(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedCat, setSelectedCat] = useState('Gaudí');
  const [weight, setWeight] = useState('');
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
      const response = await fetch(url);
      const text = await response.text();
      
      const jsonData = JSON.parse(text.substring(47).slice(0, -2));
      
      const rows = jsonData.table.rows;
      const formattedData = rows.map(row => {
        const cells = row.c;
        const dateStr = cells[0]?.f || cells[0]?.v || '';
        
        return {
          date: dateStr,
          dateObj: parseSheetDate(dateStr),
          Gaudí: cells[1]?.v || null,
          Maite: cells[2]?.v || null,
          Benito: cells[3]?.v || null,
          Cleopatra: cells[4]?.v || null
        };
      }).filter(row => row.date && row.date !== 'Fecha' && row.dateObj);

      formattedData.sort((a, b) => a.dateObj - b.dateObj);
      
      setData(formattedData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error al cargar los datos. Por favor, intenta de nuevo.');
      setLoading(false);
    }
  };

  const handleSaveWeight = async () => {
    if (!weight || isNaN(parseFloat(weight))) {
      setSaveMessage('Por favor ingresa un peso válido');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setSaving(true);
    setSaveMessage('');

    try {
      // Use our proxy endpoint instead of calling Apps Script directly
      const response = await fetch('/api/save-weight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate,
          cat: selectedCat,
          weight: parseFloat(weight)
        })
      });

      const result = await response.json();

      if (result.success) {
        setSaveMessage('✅ Peso registrado exitosamente');
        setWeight('');
        setShowForm(false);
        
        setTimeout(() => {
          fetchData();
          setSaveMessage('');
        }, 1000);
      } else {
        setSaveMessage('❌ Error al guardar: ' + (result.error || 'Error desconocido'));
      }
    } catch (err) {
      console.error('Error saving weight:', err);
      setSaveMessage('❌ Error al guardar el peso');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  const toggleCat = (cat) => {
    setSelectedCats(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  const getFilteredData = () => {
    if (dateRange === 'all') return data;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    let startDate = new Date(now);
    
    switch(dateRange) {
      case '1m':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return data;
    }
    
    return data.filter(row => {
      return row.dateObj && row.dateObj >= startDate && row.dateObj <= now;
    });
  };

  const getWeightChange = (cat) => {
    const filteredData = getFilteredData().filter(row => row[cat] !== null);
    if (filteredData.length < 2) return null;
    
    const latest = filteredData[filteredData.length - 1][cat];
    const previous = filteredData[filteredData.length - 2][cat];
    const change = latest - previous;
    const percentChange = ((change / previous) * 100).toFixed(1);
    
    return { change: change.toFixed(2), percent: percentChange };
  };

  const getLatestWeight = (cat) => {
    const filteredData = getFilteredData().filter(row => row[cat] !== null);
    if (filteredData.length === 0) return null;
    return filteredData[filteredData.length - 1][cat].toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando datos de los gatitos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
          <p className="text-gray-600 text-center">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-6 w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
            🐱 Control de Peso Gatuno
          </h1>
          <p className="text-gray-600">Seguimiento del peso de Maite, Benito, Gaudí y Cleopatra</p>
        </div>

        <div className="mb-6 flex justify-center">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            {showForm ? 'Cancelar' : 'Registrar Peso'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Save className="w-5 h-5" />
              Registrar nuevo peso
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha
                </label>
                <input
                  type="text"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Formato: DD/MM/YYYY (ej: 23/11/2025)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gato
                </label>
                <select
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  {Object.keys(CAT_COLORS).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="ej: 3.50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleSaveWeight}
                disabled={saving}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Registrar
                  </>
                )}
              </button>

              {saveMessage && (
                <div className={`p-3 rounded-lg text-center ${
                  saveMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rest of the component remains the same - Cat Cards, Filters, Charts, etc. */}
        {/* Copying from previous version... */}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Object.keys(CAT_COLORS).map(cat => {
            const weightChange = getWeightChange(cat);
            const latestWeight = getLatestWeight(cat);
            const info = CAT_INFO[cat];
            
            return (
              <div 
                key={cat}
                className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all ${
                  selectedCats.includes(cat) ? 'ring-4' : 'opacity-60'
                }`}
                style={{ 
                  ringColor: selectedCats.includes(cat) ? CAT_COLORS[cat] : 'transparent'
                }}
                onClick={() => toggleCat(cat)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{cat}</h3>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: CAT_COLORS[cat] }}
                  ></div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <p>📅 {info.age}</p>
                  <p>🎂 {info.birthday}</p>
                  {info.specialNote && <p className="text-orange-600">⚠️ {info.specialNote}</p>}
                </div>

                {latestWeight && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-2xl font-bold text-gray-800">{latestWeight} kg</p>
                    {weightChange && (
                      <div className="flex items-center mt-2">
                        {weightChange.change > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        ) : weightChange.change < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                        ) : (
                          <Minus className="w-4 h-4 text-gray-400 mr-1" />
                        )}
                        <span className={`text-sm font-medium ${
                          weightChange.change > 0 ? 'text-green-600' : 
                          weightChange.change < 0 ? 'text-red-600' : 
                          'text-gray-500'
                        }`}>
                          {weightChange.change > 0 ? '+' : ''}{weightChange.change} kg ({weightChange.percent}%)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">Rango de fechas</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: '1m', label: '1 mes' },
              { value: '3m', label: '3 meses' },
              { value: '6m', label: '6 meses' },
              { value: '1y', label: '1 año' },
              { value: 'all', label: 'Todo' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateRange === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Evolución del peso</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              {selectedCats.map(cat => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={CAT_COLORS[cat]}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {selectedCats.map(cat => {
            const catData = filteredData.filter(row => row[cat] !== null);
            
            return (
              <div key={cat} className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">{cat}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={catData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6B7280"
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis 
                      stroke="#6B7280"
                      style={{ fontSize: '11px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={cat}
                      stroke={CAT_COLORS[cat]}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>

        <div className="text-center text-gray-600 text-sm">
          <p>💚 Datos actualizados desde Google Sheets</p>
          <p className="mt-2">Total de registros: {data.length} | Mostrando: {filteredData.length}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
