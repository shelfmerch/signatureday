import React, { useEffect, useState } from 'react';

const hexagonSvgModules = import.meta.glob<string>('./hexagon/*.svg', { as: 'raw' });

interface HexagonSvgViewerProps {
  path: string;
}

export const HexagonSvgViewer: React.FC<HexagonSvgViewerProps> = ({ path }) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract just the filename (e.g., '14.svg' from './hexagon/14.svg')
    const filename = path.split('/').pop() || '';
    const key = path in hexagonSvgModules
      ? path
      : Object.keys(hexagonSvgModules).find((k) => {
        const kFilename = k.split('/').pop() || '';
        return kFilename === filename;
      });
    const loader = key ? hexagonSvgModules[key as keyof typeof hexagonSvgModules] : undefined;
    if (typeof loader !== 'function') {
      setError('Template not found');
      setLoading(false);
      return;
    }
    (loader as () => Promise<string>)()
      .then((svg) => {
        setContent(svg);
        setError(null);
      })
      .catch((err) => {
        setError('Failed to load');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [path]);

  // Match square grid layout exactly: same outer/inner structure
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-6">
        <div className="flex items-center justify-center bg-white rounded-xl shadow-2xl p-1 md:p-3 w-full min-h-[280px]">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-6">
        <div className="flex items-center justify-center bg-white rounded-xl shadow-2xl p-1 md:p-3 w-full min-h-[280px]">
          <p className="text-sm text-destructive">{error || 'No content'}</p>
        </div>
      </div>
    );
  }

  // meet = fit entire SVG inside container, no cropping — all hexagons visible
  let modifiedContent = content.replace(
    /<svg(\s[^>]*?)>/i,
    (match) => match.includes('preserveAspectRatio')
      ? match
      : match.replace('>', ' preserveAspectRatio="xMidYMid meet">')
  );
  modifiedContent = modifiedContent.replace(/<text[\s\S]*?<\/text>/gi, '');

  // Same structure as square: outer div + inner white card (no overflow-hidden)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-6">
      <div className="flex items-center justify-center bg-white rounded-xl shadow-2xl p-1 md:p-3 w-full">
        <div
          className="w-full [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: modifiedContent }}
        />
      </div>
    </div>
  );
};

export default HexagonSvgViewer;
