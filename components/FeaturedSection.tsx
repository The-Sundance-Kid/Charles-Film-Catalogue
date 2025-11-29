import React, { useMemo } from 'react';
import { Movie } from '../types';
import { Disc, PlayCircle } from 'lucide-react';

interface FeaturedSectionProps {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
}

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({ movies, onMovieClick }) => {
  // Get random selection of 5-10 movies that HAVE commentary
  const featuredMovies = useMemo(() => {
    const withCommentary = movies.filter(m => m.hasCommentary);
    // Shuffle and take 6
    return [...withCommentary]
      .sort(() => 0.5 - Math.random())
      .slice(0, 8);
  }, [movies]);

  if (featuredMovies.length === 0) return null;

  return (
    <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2 mb-4">
        <Disc className="text-cinema-accent" size={20} />
        <h2 className="text-xl font-bold text-white">Featured Commentary Tracks</h2>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cinema-700 scrollbar-track-cinema-900/50">
        {featuredMovies.map(movie => (
          <div 
            key={movie.id}
            onClick={() => onMovieClick(movie)}
            className="snap-start shrink-0 w-60 h-32 bg-cinema-800 border border-cinema-700 rounded-lg p-4 relative overflow-hidden group cursor-pointer hover:border-cinema-accent/50 transition-all hover:shadow-lg hover:shadow-cinema-accent/5"
          >
            <div className="absolute top-0 right-0 bg-cinema-accent w-16 h-16 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <h3 className="font-bold text-white text-sm line-clamp-2 leading-tight group-hover:text-cinema-accent transition-colors">
                    {movie.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{movie.yearViewed}</p>
              </div>
              
              <div className="flex items-center gap-1 text-[10px] text-green-400 font-medium">
                <PlayCircle size={12} />
                <span className="truncate">{movie.commentaryDetails?.substring(0, 30)}...</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};