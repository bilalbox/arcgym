import type React from 'react';
import { useEffect, useState } from 'react';
import { searchStudioChunks } from '@/studio/api';
import { studioFieldClass } from '@/studio/fieldStyles';

interface CitationPickerProps {
  value: string;
  onChange: (url: string) => void;
}

export const CitationPicker: React.FC<CitationPickerProps> = ({ value, onChange }) => {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Array<{ url: string; title: string }>>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setSearching(true);
      searchStudioChunks(query.trim())
        .then((res) => {
          if (!cancelled) setHits(res.chunks);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="space-y-1.5">
      <input
        type="url"
        className={studioFieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://architect.salesforce.com/…"
      />
      <div className="relative">
        <input
          type="search"
          className={studioFieldClass}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search crawled chunks…"
        />
        {open && (query.trim().length >= 2 || hits.length > 0) && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-miro-hairline bg-miro-card shadow-md">
            {searching && <li className="px-3 py-2 text-xs text-miro-muted">Searching…</li>}
            {!searching && hits.length === 0 && (
              <li className="px-3 py-2 text-xs text-miro-muted">No matches</li>
            )}
            {hits.map((hit) => (
              <li key={hit.url}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs hover:bg-miro-surfaceSoft cursor-pointer"
                  onClick={() => {
                    onChange(hit.url);
                    setQuery('');
                    setHits([]);
                    setOpen(false);
                  }}
                >
                  <span className="block text-miro-primary font-medium line-clamp-1">
                    {hit.title}
                  </span>
                  <span className="block text-miro-muted font-mono truncate">{hit.url}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
