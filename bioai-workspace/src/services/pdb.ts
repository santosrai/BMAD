// PDB API service for searching and fetching PDB metadata
// Uses RCSB PDB REST API: https://data.rcsb.org and https://search.rcsb.org
// Fallback: PDBe API https://www.ebi.ac.uk/pdbe/api/pdb/entry/summary/

export interface PDBSearchResult {
  identifier: string;
  title: string;
  organism?: string;
  resolution?: number;
  experimentalMethod?: string;
}

function validateResult(result: Partial<PDBSearchResult> & { identifier: string }): PDBSearchResult {
  return {
    identifier: result.identifier,
    title: result.title || 'Unknown Title',
    organism: result.organism || 'Unknown',
    resolution: result.resolution,
    experimentalMethod: result.experimentalMethod || 'Unknown',
  };
}

async function fetchRCSBMeta(id: string): Promise<PDBSearchResult | null> {
  try {
    const url = `https://data.rcsb.org/rest/v1/core/entry/${id}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return validateResult({
      identifier: id,
      title: data.struct?.title,
      organism: data.rcsb_entry_container_identifiers?.organism_scientific,
      resolution: data.rcsb_entry_info?.resolution_combined?.[0],
      experimentalMethod: data.exptl?.[0]?.method,
    });
  } catch {
    return null;
  }
}

async function fetchPDBeMeta(id: string): Promise<PDBSearchResult | null> {
  try {
    const url = `https://www.ebi.ac.uk/pdbe/api/pdb/entry/summary/${id.toLowerCase()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[id.toLowerCase()]?.[0];
    if (!entry) return null;
    return validateResult({
      identifier: id,
      title: entry.title,
      organism: entry.organism_scientific_name,
      resolution: entry.resolution,
      experimentalMethod: entry.experimental_method,
    });
  } catch {
    return null;
  }
}

export async function searchPDB(query: string, mode: 'id' | 'name' | 'keywords'): Promise<PDBSearchResult[]> {
  if (mode === 'id') {
    // Direct lookup by PDB ID with fallback
    const id = query.trim().toUpperCase();
    let meta = await fetchRCSBMeta(id);
    if (!meta) meta = await fetchPDBeMeta(id);
    if (!meta) throw new Error('PDB entry not found in RCSB or PDBe');
    return [meta];
  } else {
    // Search by name or keywords using RCSB search API
    const url = 'https://search.rcsb.org/rcsbsearch/v2/query?json';
    const searchType = mode === 'name' ? 'struct.title' : 'text';
    const body = {
      query: {
        type: 'terminal',
        service: 'text',
        parameters: {
          attribute: searchType,
          operator: 'contains_phrase',
          value: query,
        },
      },
      return_type: 'entry',
      request_options: { pager: { start: 0, rows: 10 } },
    };
    let ids: string[] = [];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('PDB search failed');
      const data = await res.json();
      ids = data.result_set.map((r: any) => r.identifier);
    } catch (err) {
      throw new Error('PDB search failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    // Fetch metadata for each hit, with fallback
    const metaResults: PDBSearchResult[] = [];
    for (const id of ids) {
      let meta = await fetchRCSBMeta(id);
      if (!meta) meta = await fetchPDBeMeta(id);
      if (meta) metaResults.push(meta);
    }
    return metaResults;
  }
} 