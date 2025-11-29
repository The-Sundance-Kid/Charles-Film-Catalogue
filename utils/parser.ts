import { Movie } from '../types';

export const parseRawData = (rawData: string): Movie[] => {
  const lines = rawData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const movies: Movie[] = [];
  
  let currentYear = "2019"; // Default start
  let currentCategory: Movie['category'] = "Standard";

  const movieLineRegex = /^(\d+)\.\s+(.*?)(?:\s-\s(.*))?$/;
  // Regex to catch lines that might not have a hyphen separator but are still items (fallback)
  const movieLineSimpleRegex = /^(\d+)\.\s+(.*)$/;

  lines.forEach(line => {
    // Check for Year Headers
    if (line.match(/^\d{4}:$/)) {
      currentYear = line.replace(':', '');
      currentCategory = "Standard";
      return;
    }

    // Check for Category Headers
    if (line.includes('Recuts/Edits:')) {
      currentCategory = "Recut/Edit";
      return;
    }
    if (line.includes('*Leftovers')) {
      currentCategory = "Leftover";
      return;
    }

    // Parse Movie Lines
    let match = line.match(movieLineRegex);
    
    // Fallback if no hyphen detected but it is a list item
    if (!match) {
        match = line.match(movieLineSimpleRegex);
    }

    if (match) {
      const title = match[2].trim();
      let notes = match[3] ? match[3].trim() : "";
      
      // Some formatting cleanup
      // If the regex caught "70mm" as part of title in simple regex, it's hard to separate without explicit logic,
      // but the first regex handles " - " well.
      
      movies.push({
        id: crypto.randomUUID(),
        title,
        yearViewed: currentYear,
        notes,
        category: currentCategory
      });
    }
  });

  return movies;
};
