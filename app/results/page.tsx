'use client';

import { useState, useEffect } from 'react';

const CLASS_COLORS: Record<string, string> = {
  'death-knight': '#C41E3A', 'demon-hunter': '#A330C9', 'druid': '#FF7C0A',
  'evoker': '#33937F',       'hunter': '#AAD372',        'mage': '#3FC7EB',
  'monk': '#00FF98',         'paladin': '#F48CBA',       'priest': '#DCDCDC',
  'rogue': '#FFF468',        'shaman': '#0070DD',        'warlock': '#8788EE',
  'warrior': '#C69B3A',
};
const CLASS_DISPLAY: Record<string, string> = {
  'death-knight': 'Death Knight', 'demon-hunter': 'Demon Hunter',
  'druid': 'Druid',   'evoker': 'Evoker',   'hunter': 'Hunter',
  'mage': 'Mage',     'monk': 'Monk',       'paladin': 'Paladin',
  'priest': 'Priest', 'rogue': 'Rogue',     'shaman': 'Shaman',
  'warlock': 'Warlock', 'warrior': 'Warrior',
};

interface PlayerResult {
  player_id: number;
  name: string;
  wow_class: string;
  avg_score: number;
  vote_count: number;
}

function qualityColor(s: number) {
  if (s >= 9.5) return '#ff8000';
  if (s >= 7.5) return '#a335ee';
  if (s >= 6.0) return '#0070dd';
  if (s >= 4.5) return '#1eff00';
  if (s >= 3.0) return '#e0e0e0';
  return '#9d9d9d';
}
function qualityLabel(s: number) {
  if (s >= 9.5) return 'Legendary';
  if (s >= 7.5) return 'Epic';
  if (s >= 6.0) return 'Rare';
  if (s >= 4.5) return 'Uncommon';
  if (s >= 3.0) return 'Common';
  return 'Poor';
}

const MEDALS   = ['🥇', '🥈', '🥉'];
const RANK_COL = ['#f0c060', '#c0c0c0', '#cd7f32'];

export default function ResultsPage() {
  const [results, setResults]         = useState<PlayerResult[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeSessions, setActive]   = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch('/api/results');
        const data = await res.json();
        setResults(data.results   || []);
        setActive(data.activeSessionCount || 0);
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">

      <header className="border-b border-[#3d3020] bg-[#100e0c]">
        <div className="max-w-2xl mx-auto px-4 py-5 text-center">
          <a href="/"
             className="text-[#4a3a20] hover:text-[#c8a96e] transition-colors text-sm block mb-2">
            ← Back to Voting
          </a>
          <h1 className="text-3xl font-bold text-[#c8a96e]"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}>
            🏆 Leaderboard
          </h1>
          <p className="text-[#5a4a2a] text-sm mt-1">Fnatics Transmog Competition</p>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-3">

          {loading ? (
            <p className="text-center text-[#7a6a4a] py-20">Loading results…</p>

          ) : results.length === 0 ? (
            <div className="wow-card text-center p-12 fade-in">
              <div className="text-5xl mb-4">📜</div>
              <p className="text-[#7a6a4a]">No completed votes yet</p>
              <p className="text-[#3d3020] text-sm mt-2">
                Results appear after voting sessions are closed
              </p>
            </div>

          ) : (
            results.map((p, i) => (
              <div
                key={p.player_id}
                className="wow-card overflow-hidden fade-in"
                style={i < 3 ? { borderColor: RANK_COL[i] } : {}}
              >
                <div className="flex items-center p-4 gap-4">
                  {/* Rank */}
                  <div className="w-10 text-center flex-shrink-0">
                    {i < 3
                      ? <span className="text-3xl">{MEDALS[i]}</span>
                      : <span className="text-[#5a4a30] text-lg font-bold"
                               style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                          #{i + 1}
                        </span>
                    }
                  </div>

                  {/* Player */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-bold text-xl truncate"
                      style={{
                        fontFamily: 'var(--font-cinzel), serif',
                        color: CLASS_COLORS[p.wow_class] || '#c8a96e',
                      }}
                    >
                      {p.name}
                    </div>
                    <div className="text-[#5a4a30] text-sm">
                      {CLASS_DISPLAY[p.wow_class] || p.wow_class}
                      {' · '}
                      {p.vote_count} vote{p.vote_count !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className="text-3xl font-bold"
                      style={{ color: qualityColor(p.avg_score), fontFamily: 'var(--font-cinzel), serif' }}
                    >
                      {Number(p.avg_score).toFixed(1)}
                    </div>
                    <div className="text-xs" style={{ color: qualityColor(p.avg_score) }}>
                      {qualityLabel(p.avg_score)}
                    </div>
                  </div>
                </div>

                {/* Score bar */}
                <div className="h-1 bg-[#0a0908]">
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${Number(p.avg_score) * 10}%`,
                      background: qualityColor(p.avg_score),
                    }}
                  />
                </div>
              </div>
            ))
          )}

          {activeSessions > 0 && (
            <p className="text-center text-[#7a6a4a] text-sm pt-2">
              ⏳ {activeSessions} voting session{activeSessions !== 1 ? 's' : ''} still open
            </p>
          )}
        </div>
      </main>

    </div>
  );
}
