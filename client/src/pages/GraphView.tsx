import { useEffect, useState, useMemo } from 'react';
import { mockNotes, generateGraphData } from '@/lib/mock-data';
import { Card } from '@/components/ui/card';
import { SlidersHorizontal, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Dynamically import to avoid SSR issues if this were a Next.js app, 
// but also good for heavy viz libraries
import { ForceGraph2D } from 'react-force-graph';

export default function GraphView() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const graphData = useMemo(() => generateGraphData(mockNotes), []);

  useEffect(() => {
    // Update dimensions on mount and resize
    const updateDimensions = () => {
      const container = document.getElementById('graph-container');
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Simple color mapping for groups (folders)
  const groupColors: Record<string, string> = {
    'Engineering': '#7C3AED', // Primary
    'Web': '#6366F1',         // Secondary
    'Management': '#8B5CF6'   // Accent
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between bg-card z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Knowledge Graph</h1>
          <p className="text-sm text-muted-foreground">Visualize connections between your notes.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 border-border">
            <SlidersHorizontal size={14} className="mr-2" />
            Display Options
          </Button>
        </div>
      </div>

      <div className="flex-1 relative bg-[#0a0a0a]" id="graph-container">
        {/* Controls overlay */}
        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2 bg-card p-2 rounded-lg border border-border shadow-xl">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <ZoomIn size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <ZoomOut size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Maximize size={18} />
          </Button>
        </div>

        {/* Legend overlay */}
        <div className="absolute top-6 left-6 z-10 bg-card/80 backdrop-blur-md p-4 rounded-lg border border-border shadow-xl min-w-[200px]">
          <h3 className="text-sm font-semibold mb-3">Categories</h3>
          <div className="space-y-2">
            {Object.entries(groupColors).map(([group, color]) => (
              <div key={group} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span>{group}</span>
              </div>
            ))}
          </div>
        </div>

        {typeof window !== 'undefined' && (
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={(node: any) => groupColors[node.group] || '#4B5563'}
            linkColor={() => '#333333'}
            linkWidth={1.5}
            nodeRelSize={6}
            backgroundColor="#0a0a0a"
            onNodeClick={(node) => {
              // Center view on node click
              console.log('Clicked node', node);
            }}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Inter, sans-serif`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); 

              ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
              ctx.fillRect(
                node.x - bckgDimensions[0] / 2, 
                node.y - bckgDimensions[1] / 2, 
                bckgDimensions[0], 
                bckgDimensions[1]
              );

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = groupColors[node.group] || '#9CA3AF';
              
              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
              ctx.fill();

              // Draw text if zoomed in enough
              if (globalScale > 1.5) {
                ctx.fillStyle = '#E5E5E5';
                ctx.fillText(label, node.x, node.y + node.val + fontSize);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}