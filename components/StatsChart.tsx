import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Movie } from '../types';

interface StatsChartProps {
  movies: Movie[];
  onYearSelect?: (year: string) => void;
}

export const StatsChart: React.FC<StatsChartProps> = ({ movies, onYearSelect }) => {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    movies.forEach(m => {
      if (m.yearViewed) {
        counts[m.yearViewed] = (counts[m.yearViewed] || 0) + 1;
      }
    });
    
    return Object.keys(counts)
      .sort()
      .map(year => ({
        name: year,
        count: counts[year]
      }));
  }, [movies]);

  if (data.length === 0) return null;

  return (
    <div className="h-64 w-full bg-cinema-800/50 rounded-lg p-4 border border-cinema-700">
      <h3 className="text-white font-bold mb-4">Theatrical History <span className="text-xs font-normal text-gray-500 ml-2">(Click bar to filter)</span></h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip 
            cursor={{fill: '#334155', opacity: 0.4}}
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
            itemStyle={{ color: '#f59e0b' }}
          />
          <Bar 
            dataKey="count" 
            fill="#f59e0b" 
            radius={[4, 4, 0, 0]}
            onClick={(data) => {
              if (onYearSelect && data && data.name) {
                onYearSelect(data.name);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={index % 2 === 0 ? '#f59e0b' : '#d97706'} 
                className="hover:opacity-80 transition-opacity"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};