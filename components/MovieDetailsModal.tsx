import React, { useEffect, useState } from 'react';
import { Movie } from '../types';
import { X, Clock, Calendar, ShieldAlert, Film, Loader2, RefreshCw } from 'lucide-react';

interface MovieDetailsModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
  onFetchDetails: (movie: Movie) => void;
  onCheckCommentary: (movie: Movie) => void;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({ 
  movie, 
  isOpen, 
  onClose,
  onFetchDetails,
  onCheckCommentary
}) => {
  const [imgError, setImgError] = useState(false);
  
  // Reset error state when movie changes
  useEffect(() => {
    setImgError(false);
  }, [movie.id, movie.posterUrl]);
  
  useEffect(() => {
    if (isOpen && !movie.plot && !movie.isLoadingDetails) {
      onFetchDetails(movie);
    }
  }, [isOpen, movie, onFetchDetails]);

  if (!isOpen) return null;

  const showPoster = movie.posterUrl && !imgError;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-cinema-800 border border-cinema-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Poster Section */}
        <div className="w-full md:w-1/3 bg-black flex items-center justify-center min-h-[300px] md:min-h-full relative overflow-hidden shrink-0">
          {showPoster ? (
            <img 
              src={movie.posterUrl} 
              alt={`${movie.title} Poster`} 
              className="w-full h-full object-cover opacity-90"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cinema-900 to-cinema-700 flex flex-col items-center justify-center text-gray-500">
               <Film size={48} className="mb-2 opacity-50" />
               <span className="text-xs uppercase tracking-widest">No Poster</span>
            </div>
          )}
          
          {movie.isLoadingDetails && (
             <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="animate-spin text-cinema-accent" size={32} />
             </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-black text-white mb-2 leading-tight">{movie.title}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar size={14} className="text-cinema-accent" /> {movie.yearViewed}
              </span>
              {movie.runtime && (
                <span className="flex items-center gap-1">
                    <Clock size={14} className="text-cinema-accent" /> {movie.runtime}
                </span>
              )}
              {movie.rated && (
                <span className="flex items-center gap-1 border border-gray-600 px-1.5 py-0.5 rounded text-xs font-bold text-gray-300">
                    {movie.rated}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
                <h3 className="text-cinema-accent text-xs font-bold uppercase tracking-wider mb-2">Plot Summary</h3>
                {movie.isLoadingDetails ? (
                    <div className="space-y-2 animate-pulse">
                        <div className="h-2 bg-cinema-700 rounded w-full"></div>
                        <div className="h-2 bg-cinema-700 rounded w-5/6"></div>
                        <div className="h-2 bg-cinema-700 rounded w-4/6"></div>
                    </div>
                ) : (
                    <p className="text-gray-300 leading-relaxed text-sm">
                        {movie.plot || "No plot summary available."}
                    </p>
                )}
            </div>

            <div>
                <h3 className="text-cinema-accent text-xs font-bold uppercase tracking-wider mb-2">Viewing Notes</h3>
                <p className="text-gray-400 text-sm italic border-l-2 border-cinema-700 pl-3">
                    {movie.notes || "No viewing notes recorded."}
                </p>
            </div>

            {/* Commentary Status in Modal */}
            <div className="bg-cinema-900/50 p-4 rounded-lg border border-cinema-700/50">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Commentary Status</h3>
                    
                    {!movie.isLoadingMetadata && (
                        <button 
                            onClick={() => onCheckCommentary(movie)}
                            className="text-[10px] text-cinema-accent hover:text-white flex items-center gap-1 hover:underline"
                        >
                            <RefreshCw size={10} /> {movie.hasCommentary !== undefined ? "Check Again" : "Check Now"}
                        </button>
                    )}
                </div>

                {movie.isLoadingMetadata ? (
                    <div className="flex items-center gap-2 text-cinema-accent text-sm">
                        <Loader2 size={16} className="animate-spin" /> Checking...
                    </div>
                ) : movie.hasCommentary ? (
                    <div>
                        <span className="inline-block px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-bold mb-2">Available</span>
                        <p className="text-xs text-gray-300">{movie.commentaryDetails}</p>
                    </div>
                ) : (
                    <span className="inline-block px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs font-bold">
                        {movie.hasCommentary === false ? "Not Found" : "Not Checked"}
                    </span>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};