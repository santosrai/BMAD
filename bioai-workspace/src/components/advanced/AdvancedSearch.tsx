import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Search, Filter, Calendar, Tag, FileText, MessageSquare, Database } from 'lucide-react';

export function AdvancedSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    types: ['message', 'file', 'session'],
    dateRange: { start: '', end: '' },
    tags: [],
    categories: []
  });
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      // Mock search results
      const mockResults = [
        {
          id: '1',
          type: 'message',
          title: 'Protein folding discussion',
          content: 'Analysis of alpha-helix structures in cytochrome c...',
          relevance: 95,
          timestamp: Date.now() - 3600000,
          tags: ['protein', 'folding', 'analysis']
        },
        {
          id: '2',
          type: 'file',
          title: '1ABC.pdb',
          content: 'Crystal structure of cytochrome c',
          relevance: 87,
          timestamp: Date.now() - 7200000,
          tags: ['pdb', 'structure', 'cytochrome']
        },
        {
          id: '3',
          type: 'session',
          title: 'Molecular dynamics session',
          content: 'Simulation of protein dynamics over 100ns...',
          relevance: 78,
          timestamp: Date.now() - 86400000,
          tags: ['simulation', 'dynamics', 'analysis']
        }
      ];

      setTimeout(() => {
        setResults(mockResults);
        setIsSearching(false);
      }, 1000);
    } catch (error) {
      console.error('Search failed:', error);
      setIsSearching(false);
    }
  }, [query, filters]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'file': return <FileText className="h-4 w-4" />;
      case 'session': return <Database className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'message': return 'bg-blue-100 text-blue-800';
      case 'file': return 'bg-green-100 text-green-800';
      case 'session': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Search className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Advanced Search</h2>
      </div>

      {/* Search Input */}
      <Card className="p-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across messages, files, and sessions..."
              className="w-full p-3 border rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5" />
          <h3 className="font-medium">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Content Types */}
          <div>
            <label className="block text-sm font-medium mb-2">Content Types</label>
            <div className="space-y-2">
              {['message', 'file', 'session'].map(type => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.types.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters(prev => ({
                          ...prev,
                          types: [...prev.types, type]
                        }));
                      } else {
                        setFilters(prev => ({
                          ...prev,
                          types: prev.types.filter(t => t !== type)
                        }));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="capitalize">{type}s</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium mb-2">Date Range</label>
            <div className="space-y-2">
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value }
                }))}
                className="w-full p-2 border rounded"
              />
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value }
                }))}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div>
            <label className="block text-sm font-medium mb-2">Quick Filters</label>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Last 24 hours
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Tag className="h-4 w-4 mr-2" />
                Tagged items
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                PDB files only
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Results */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Search Results</h3>
          {results.length > 0 && (
            <Badge variant="outline">{results.length} results</Badge>
          )}
        </div>

        {results.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No results found</p>
            <p className="text-sm mt-1">Try adjusting your search terms or filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result: any) => (
              <div key={result.id} className="p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(result.type)}
                      <span className="font-medium">{result.title}</span>
                      <Badge className={getTypeColor(result.type)}>
                        {result.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {result.relevance}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{result.content}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                      <div className="flex gap-1">
                        {result.tags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Saved Searches */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Saved Searches</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 border rounded">
            <span className="text-sm">Protein analysis sessions</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">Run</Button>
              <Button variant="ghost" size="sm">Edit</Button>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 border rounded">
            <span className="text-sm">Recent PDB uploads</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">Run</Button>
              <Button variant="ghost" size="sm">Edit</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}