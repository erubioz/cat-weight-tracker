import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

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
  'Benito': { age: '9 años', birthday: '13 de noviembre', specialNote: 'Dieta renal especial' },
  'Gaudí': { age: '6 años', birthday: '28 de noviembre', specialNote: '' },
  'Cleopatra': { age: '4 meses', birthday: '2 de julio', specialNote: 'La más juguetona' }
};

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCats, setSelectedCats] = useState(['Maite', 'Benito', 'Gaudí', 'Cleopatra']);
  const [dateRange, setDateRange] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
      const response = await fetch(url);
      const text = await response.text();
      
      // Remove the prefix to get valid JSON
      const jsonData = JSON.parse(text.substring(47).slice(0, -2));
      
      const rows = jsonData.table.rows;
      const formattedData = rows.map(row => {
        const cells = row.c;
        return {
          date: cells[0]?.f || cells[0]?.v || '',
          Gaudí: cells[1]?.v || null,
          Maite: cells[2]?.v || null,
          Benito: cells[3]?.v || null,
          Cleopatra: cells[4]?.v || null
        };
      }).filter(row => row.date && row.date !== 'Fecha'); // Filter out header and empty rows

      setData(formattedData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error al cargar los datos. Por favor, intenta de nuevo.');
      setLoading(false);
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
    let startDate = new Date();
    
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
      const rowDate = new Date(row.date);
      return rowDate >= startDate;
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
            🐱 Control de Peso Gatuno
          </h1>
          <p className="text-gray-600">Seguimiento del peso de Maite, Benito, Gaudí y Cleopatra</p>
        </div>

        {/* Cat Cards */}
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

        {/* Filters */}
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

        {/* Main Chart */}
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

        {/* Individual Charts */}
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

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm">
          <p>💚 Datos actualizados desde Google Sheets</p>
          <p className="mt-2">Total de registros: {data.length}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
