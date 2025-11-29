import React, { useState } from 'react';
import { Movie } from '../types';
import { Disc, Loader2, CheckCircle2, XCircle, Film, ExternalLink, Clock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

interface MovieCardProps {
  movie: Movie;
  onCheckMetadata: (movie: Movie) => void;
  onClickTitle?: (movie: Movie) => void;
  isQueued?: boolean;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onCheckMetadata, onClickTitle, isQueued = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isChecking = movie.isLoadingMetadata;
  const hasChecked = movie.hasCommentary !== undefined;

  // Determine if text is likely long enough to need expansion (approx char count)
  const isLongText = (movie.commentaryDetails?.length || 0) > 90;

  return (
    <div className="bg-cinema-800 border border-cinema-700 rounded-lg p-4 shadow-lg hover:shadow-cinema-accent/10 transition-all flex flex-col h-full relative group overflow-hidden">
      
      {/* Category Badge */}
      {movie.category && movie.category !== 'Standard' && (
        <div className="absolute top-0 right-0 bg-cinema-accent text-cinema-900 text-xs font-bold px-2 py-1 rounded-bl-lg z-10">
          {movie.category}
        </div>
      )}

      <div className="flex-1 mb-3">
        <button 
          onClick={() => onClickTitle && onClickTitle(movie)}
          className="text-left w-full focus:outline-none"
        >
          <h3 className="text-lg font-bold text-white mb-1 leading-tight hover:text-cinema-accent transition-colors cursor-pointer decoration-cinema-accent/30 hover:underline underline-offset-4">
            {movie.title}
          </h3>
        </button>
        <p className="text-sm text-gray-400 flex items-center gap-2">
          <Film size={14} />
          {movie.yearViewed}
        </p>
        {movie.notes && (
          <p className="text-xs text-gray-500 mt-2 italic border-l-2 border-cinema-700 pl-2">
            {movie.notes}
          </p>
        )}
      </div>

      <div className="bg-cinema-900/50 rounded p-3 text-sm border border-cinema-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
             <Disc size={12} /> Commentary
          </span>
          
          <div className="flex items-center gap-1">
            {/* Action Button / Status Icon */}
            {!hasChecked && !isChecking && !isQueued && (
                <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckMetadata(movie);
                }}
                className="text-xs bg-cinema-700 hover:bg-cinema-600 text-white px-2 py-1 rounded transition-colors"
                >
                Check
                </button>
            )}
            
            {hasChecked && !isChecking && !isQueued && (
                <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckMetadata(movie);
                }}
                className="text-gray-600 hover:text-cinema-accent transition-colors p-1"
                title="Refresh Metadata"
                >
                <RefreshCw size={12} />
                </button>
            )}

            {isChecking && (
                <Loader2 size={14} className="animate-spin text-cinema-accent" />
            )}
            
            {isQueued && !isChecking && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCheckMetadata(movie);
                  }}
                  className="flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 hover:text-amber-400 px-2 py-0.5 rounded-full animate-pulse transition-colors cursor-pointer"
                  title="Click to check now (Prioritize)"
                >
                    <Clock size={10} /> Queued
                </button>
            )}
          </div>
        </div>

        {hasChecked ? (
           <div className="space-y-2">
             <div className="flex items-center gap-2">
               {movie.hasCommentary ? (
                 <CheckCircle2 size={16} className="text-green-500 shrink-0" />
               ) : (
                 <XCircle size={16} className="text-red-500 shrink-0" />
               )}
               <span className={clsx(
                 "font-medium",
                 movie.hasCommentary ? "text-green-400" : "text-red-400"
               )}>
                 {movie.hasCommentary ? "Available" : "Not Found"}
               </span>
             </div>
             
             {movie.hasCommentary && (
               <div className="relative">
                 <p 
                    className={clsx(
                        "text-xs text-gray-300 transition-all",
                        isExpanded ? "line-clamp-none" : "line-clamp-2"
                    )}
                 >
                   {movie.commentaryDetails}
                 </p>
                 {isLongText && (
                    <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsExpanded(!isExpanded);
                        }}
                        className="text-[10px] text-cinema-accent hover:text-white mt-1 flex items-center gap-1 w-full justify-center bg-cinema-800/50 hover:bg-cinema-800 rounded py-0.5 transition-colors"
                    >
                        {isExpanded ? (
                            <><ChevronUp size={10} /> Show Less</>
                        ) : (
                            <><ChevronDown size={10} /> Read More</>
                        )}
                    </button>
                 )}
               </div>
             )}
             
             <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-cinema-700/50 mt-1">
                {movie.releaseFormat && movie.releaseFormat !== "Unknown" && (
                    <p className="text-[10px] text-gray-500 uppercase truncate max-w-[120px]" title={movie.releaseFormat}>
                    Fmt: {movie.releaseFormat}
                    </p>
                )}
                
                {movie.sourceUrl && (
                    <a 
                    href={movie.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-[10px] text-cinema-accent hover:underline ml-auto"
                    title={movie.sourceTitle || "View Source"}
                    >
                    Source <ExternalLink size={8} />
                    </a>
                )}
             </div>
           </div>
        ) : (
          <p className="text-xs text-gray-600 italic">
            {isQueued ? "Waiting in queue... (Tap to check)" : "Tap 'Check' to search web."}
          </p>
        )}
      </div>
    </div>
  );
};