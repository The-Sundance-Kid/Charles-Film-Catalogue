import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RAW_MOVIE_DATA, APP_TITLE } from './constants';
import { parseRawData } from './utils/parser';
import { Movie } from './types';
import { checkCommentaryAvailability, getMovieDetails } from './services/geminiService';
import { MovieCard } from './components/MovieCard';
import { AddMovieForm } from './components/AddMovieForm';
import { StatsChart } from './components/StatsChart';
import { FeaturedSection } from './components/FeaturedSection';
import { MovieDetailsModal } from './components/MovieDetailsModal';
import { Film, Search, Filter, AlertCircle, Play, Pause, Loader2, Disc, ArrowDownCircle } from 'lucide-react';
import { clsx } from 'clsx';

// Rate limit delay to prevent 429 errors (Gemini Free Tier is ~15 RPM, Paid is higher)
// 2000ms = 30 RPM (Aggressive but usually fine for bursts)
// 4000ms = 15 RPM (Safe)
const RATE_LIMIT_DELAY_MS = 2500;
const STORAGE_KEY = 'cineTrack_library_v1';
const INITIAL_VISIBLE_COUNT = 24;
const LOAD_MORE_COUNT = 24;

interface QueueItem {
  id: string;
  title: string;
  year: string;
}

const App = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [showOnlyCommentary, setShowOnlyCommentary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  // Modal State
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  // Auto-Check Queue State
  const [autoCheckQueue, setAutoCheckQueue] = useState<QueueItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [totalQueuedInitial, setTotalQueuedInitial] = useState(0);

  // Initial Load with Persistence Logic
  useEffect(() => {
    const loadData = () => {
      // 1. Always parse the raw data (source of truth for the list)
      const parsedMovies = parseRawData(RAW_MOVIE_DATA);
      
      // 2. Try to load metadata from local storage
      const storedJson = localStorage.getItem(STORAGE_KEY);
      let mergedMovies = parsedMovies;

      if (storedJson) {
        try {
          const storedMovies = JSON.parse(storedJson) as Movie[];
          // Create a map of stored metadata keying by "Title|Year"
          const storedMap = new Map(storedMovies.map(m => [`${m.title}|${m.yearViewed}`, m]));

          mergedMovies = parsedMovies.map(m => {
            const key = `${m.title}|${m.yearViewed}`;
            const stored = storedMap.get(key);
            
            // If we have stored data for this movie, preserve the metadata
            if (stored) {
              return {
                ...m,
                hasCommentary: stored.hasCommentary,
                commentaryDetails: stored.commentaryDetails,
                releaseFormat: stored.releaseFormat,
                sourceUrl: stored.sourceUrl,
                sourceTitle: stored.sourceTitle,
                // General Details
                plot: stored.plot,
                runtime: stored.runtime,
                rated: stored.rated,
                posterUrl: stored.posterUrl,
                
                metadataLastUpdated: stored.metadataLastUpdated,
                isLoadingMetadata: false,
                isLoadingDetails: false
              };
            }
            return m;
          });

          // Also check for user-added movies that aren't in RAW_MOVIE_DATA yet
          const rawKeys = new Set(parsedMovies.map(m => `${m.title}|${m.yearViewed}`));
          const userAddedMovies = storedMovies.filter(m => !rawKeys.has(`${m.title}|${m.yearViewed}`));
          
          mergedMovies = [...userAddedMovies, ...mergedMovies];

        } catch (e) {
          console.error("Failed to load from local storage", e);
        }
      }

      setMovies(mergedMovies);
      setIsLoading(false);
      
      // Initialize Queue: Only add movies that haven't been checked yet
      const uncheckedMovies = mergedMovies.filter(m => m.hasCommentary === undefined);
      
      if (uncheckedMovies.length > 0) {
        const queueItems: QueueItem[] = uncheckedMovies.map(m => ({
          id: m.id,
          title: m.title,
          year: m.yearViewed
        }));
        
        setAutoCheckQueue(queueItems);
        setTotalQueuedInitial(queueItems.length);
      }
    };
    loadData();
  }, []);

  // Save to Local Storage whenever movies change
  useEffect(() => {
    if (!isLoading && movies.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
    }
  }, [movies, isLoading]);

  // Helper to perform the commentary check
  const fetchMovieMetadata = useCallback(async (id: string, title: string, year: string) => {
    setMovies(prev => prev.map(m => m.id === id ? { ...m, isLoadingMetadata: true } : m));

    try {
      const result = await checkCommentaryAvailability(title, year);
      
      setMovies(prev => prev.map(m => m.id === id ? {
        ...m,
        ...result,
        isLoadingMetadata: false,
        metadataLastUpdated: Date.now()
      } : m));
    } catch (e) {
      setMovies(prev => prev.map(m => m.id === id ? {
        ...m,
        isLoadingMetadata: false
      } : m));
    }
  }, []);

  // Helper to perform the details check (Plot, Poster, etc)
  const fetchMovieDetailsData = useCallback(async (movie: Movie) => {
    setMovies(prev => prev.map(m => m.id === movie.id ? { ...m, isLoadingDetails: true } : m));

    try {
        const result = await getMovieDetails(movie.title, movie.yearViewed);
        setMovies(prev => prev.map(m => m.id === movie.id ? {
            ...m,
            ...result,
            isLoadingDetails: false
        } : m));
    } catch (e) {
        setMovies(prev => prev.map(m => m.id === movie.id ? { ...m, isLoadingDetails: false } : m));
    }
  }, []);

  // Queue Processor
  useEffect(() => {
    if (autoCheckQueue.length === 0 || isPaused) return;

    const timeoutId = setTimeout(() => {
      const nextItem = autoCheckQueue[0];
      
      // Process the item
      fetchMovieMetadata(nextItem.id, nextItem.title, nextItem.year);

      // Remove from queue
      setAutoCheckQueue(prev => prev.slice(1));

    }, RATE_LIMIT_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [autoCheckQueue, isPaused, fetchMovieMetadata]);

  const handleAddMovie = async (title: string, year: string, notes: string) => {
    const newMovie: Movie = {
      id: crypto.randomUUID(),
      title,
      yearViewed: year,
      notes,
      category: 'Standard',
      isLoadingMetadata: true,
    };

    setMovies(prev => [newMovie, ...prev]);
    // Immediately check the new movie (bypassing the queue for immediate feedback)
    await fetchMovieMetadata(newMovie.id, title, year);
  };

  const handleManualCheck = (movie: Movie) => {
    setAutoCheckQueue(prev => prev.filter(item => item.id !== movie.id));
    fetchMovieMetadata(movie.id, movie.title, movie.yearViewed);
  };

  const handleReset = () => {
    setSearchQuery('');
    setYearFilter('All');
    setShowOnlyCommentary(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleYearSelect = (year: string) => {
    setYearFilter(year);
    // Scroll to the list
    const element = document.getElementById(`year-group-${year}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filter Logic
  const filteredMovies = useMemo(() => {
    return movies.filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            m.notes.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesYear = yearFilter === 'All' || m.yearViewed === yearFilter;
      const matchesCommentary = !showOnlyCommentary || m.hasCommentary === true;
      
      return matchesSearch && matchesYear && matchesCommentary;
    });
  }, [movies, searchQuery, yearFilter, showOnlyCommentary]);

  // Pagination Logic
  const displayedMovies = useMemo(() => {
    return filteredMovies.slice(0, visibleCount);
  }, [filteredMovies, visibleCount]);

  const hasMoreMovies = filteredMovies.length > visibleCount;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + LOAD_MORE_COUNT);
  };

  // Group by Year for display
  const moviesByYear = useMemo(() => {
    const grouped: Record<string, Movie[]> = {};
    displayedMovies.forEach(m => {
      if (!grouped[m.yearViewed]) grouped[m.yearViewed] = [];
      grouped[m.yearViewed].push(m);
    });
    return Object.entries(grouped).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [displayedMovies]);

  const years = useMemo(() => {
    const uniqueYears = Array.from(new Set(movies.map(m => m.yearViewed))).sort().reverse();
    return ['All', ...uniqueYears];
  }, [movies]);

  // Modal
  const selectedMovie = useMemo(() => 
    movies.find(m => m.id === selectedMovieId), 
  [movies, selectedMovieId]);

  // Derived state for progress bar
  const processedCount = totalQueuedInitial - autoCheckQueue.length;
  const progressPercent = totalQueuedInitial > 0 ? (processedCount / totalQueuedInitial) * 100 : 100;

  return (
    <div className="min-h-screen bg-cinema-900 text-cinema-text font-sans pb-32">
      
      {/* Detail Modal */}
      {selectedMovie && (
        <MovieDetailsModal 
            movie={selectedMovie} 
            isOpen={!!selectedMovie} 
            onClose={() => setSelectedMovieId(null)} 
            onFetchDetails={fetchMovieDetailsData}
            onCheckCommentary={handleManualCheck}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-cinema-900/95 backdrop-blur border-b border-cinema-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <button onClick={handleReset} className="flex items-center gap-3 group focus:outline-none text-left">
            <div className="bg-cinema-accent text-cinema-900 p-2 rounded-lg group-hover:bg-amber-400 transition-colors">
              <Film size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white group-hover:text-cinema-accent transition-colors">{APP_TITLE}</h1>
              <p className="text-xs text-gray-400">Tracker & Commentary Finder</p>
            </div>
          </button>

          <div className="flex flex-col md:flex-row gap-3 flex-1 max-w-2xl justify-end">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search titles, formats..." 
                  className="w-full bg-cinema-800 border border-cinema-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-cinema-accent transition-colors text-white placeholder-gray-500"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(INITIAL_VISIBLE_COUNT); // Reset pagination on search
                  }}
                />
             </div>
             
             <div className="flex gap-2">
                <div className="relative min-w-[120px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <select 
                    className="w-full bg-cinema-800 border border-cinema-700 rounded-lg pl-10 pr-8 py-2 text-sm focus:outline-none focus:border-cinema-accent appearance-none cursor-pointer text-white"
                    value={yearFilter}
                    onChange={(e) => {
                        setYearFilter(e.target.value);
                        setVisibleCount(INITIAL_VISIBLE_COUNT);
                    }}
                    >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                <button
                    onClick={() => {
                        setShowOnlyCommentary(!showOnlyCommentary);
                        setVisibleCount(INITIAL_VISIBLE_COUNT);
                    }}
                    className={clsx(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all whitespace-nowrap",
                        showOnlyCommentary 
                            ? "bg-cinema-accent/20 border-cinema-accent text-cinema-accent" 
                            : "bg-cinema-800 border-cinema-700 text-gray-400 hover:border-gray-500"
                    )}
                >
                    <Disc size={16} />
                    <span className="hidden sm:inline">Commentary Only</span>
                </button>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Featured Section */}
        {!showOnlyCommentary && searchQuery === '' && yearFilter === 'All' && (
            <FeaturedSection 
                movies={movies} 
                onMovieClick={(m) => setSelectedMovieId(m.id)} 
            />
        )}
        
        {/* Stats & Add Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <StatsChart movies={movies} onYearSelect={handleYearSelect} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-cinema-800 border border-cinema-700 p-4 rounded-lg flex-1 flex flex-col justify-center items-center text-center">
               <h2 className="text-4xl font-black text-cinema-accent mb-1">{movies.length}</h2>
               <p className="text-gray-400 text-sm">Total Films Tracked</p>
            </div>
            <div className="bg-cinema-800 border border-cinema-700 p-4 rounded-lg flex-1 flex flex-col justify-center items-center text-center">
              <h2 className="text-4xl font-black text-green-500 mb-1">
                {movies.filter(m => m.hasCommentary).length}
              </h2>
               <p className="text-gray-400 text-sm">With Commentary (Found)</p>
            </div>
          </div>
        </div>

        <AddMovieForm onAdd={handleAddMovie} />

        {/* Movie List */}
        {isLoading ? (
          <div className="text-center py-20 text-gray-500 animate-pulse">Loading archive...</div>
        ) : (
          <div className="space-y-12">
            {moviesByYear.map(([year, yearMovies]) => (
              <div key={year} id={`year-group-${year}`} className="animate-in slide-in-from-bottom-4 duration-500 scroll-mt-24">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-4xl font-black text-white/10 select-none">{year}</h2>
                  <div className="h-px bg-cinema-700 flex-1"></div>
                  <span className="text-xs font-mono text-cinema-accent bg-cinema-accent/10 px-2 py-1 rounded">
                    {yearMovies.length} Films
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {yearMovies.map(movie => (
                    <MovieCard 
                      key={movie.id} 
                      movie={movie} 
                      onCheckMetadata={handleManualCheck}
                      onClickTitle={(m) => setSelectedMovieId(m.id)}
                      isQueued={autoCheckQueue.some(q => q.id === movie.id)} 
                    />
                  ))}
                </div>
              </div>
            ))}

            {moviesByYear.length === 0 && (
              <div className="text-center py-20 border border-dashed border-cinema-700 rounded-lg">
                <AlertCircle className="mx-auto text-gray-500 mb-2" size={32} />
                <p className="text-gray-400">No movies found matching your filters.</p>
                {showOnlyCommentary && (
                    <button 
                        onClick={() => setShowOnlyCommentary(false)}
                        className="text-cinema-accent text-sm mt-2 hover:underline"
                    >
                        Clear commentary filter
                    </button>
                )}
              </div>
            )}
            
            {/* Load More Button */}
            {hasMoreMovies && (
                <div className="flex justify-center pt-8">
                    <button
                        onClick={handleLoadMore}
                        className="flex items-center gap-2 px-6 py-3 bg-cinema-800 hover:bg-cinema-700 border border-cinema-700 text-white rounded-full transition-all hover:scale-105 shadow-lg"
                    >
                        <ArrowDownCircle size={20} />
                        Show More Films ({filteredMovies.length - visibleCount} remaining)
                    </button>
                </div>
            )}
          </div>
        )}
      </main>

      {/* Persistent Auto-Scan Status Bar */}
      {autoCheckQueue.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md bg-cinema-800 border border-cinema-700 rounded-full shadow-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-10 z-50">
           <div className="bg-cinema-900 rounded-full p-2 border border-cinema-700">
             <Loader2 size={20} className={isPaused ? "text-gray-500" : "text-cinema-accent animate-spin"} />
           </div>
           <div className="flex-1">
             <div className="flex justify-between text-xs text-gray-400 mb-1 font-mono uppercase tracking-wide">
               <span>Auto-Scanning Library</span>
               <span>{processedCount} / {totalQueuedInitial}</span>
             </div>
             <div className="h-2 bg-cinema-900 rounded-full overflow-hidden">
               <div 
                  className="h-full bg-cinema-accent transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
               />
             </div>
           </div>
           <button 
             onClick={() => setIsPaused(!isPaused)}
             className="text-gray-400 hover:text-white transition-colors p-1"
             title={isPaused ? "Resume" : "Pause"}
           >
             {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
           </button>
        </div>
      )}
    </div>
  );
};

export default App;