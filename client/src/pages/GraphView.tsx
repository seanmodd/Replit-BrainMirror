import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SlidersHorizontal, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ForceGraph2D from 'react-force-graph-2d';

export default function GraphView() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const { data: graphData, isLoading } = useQuery({
    queryKey: ["/api/graph"],
    queryFn: api.graph,
  });

  useEffect(() => {
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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between bg-card z-10">
        <div>
          <h1 data-testid="text-graph-title" className="text-xl font-bold tracking-tight">Obsidian Graph</h1>
          <p className="text-sm text-muted-foreground">Mirroring your local vault connections.</p>
        </div>
      </div>

      <div className="flex-1 relative bg-[#0a0a0a]" id="graph-container">
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

        <div className="absolute top-6 left-6 z-10 bg-card/80 backdrop-blur-md p-4 rounded-lg border border-border shadow-xl min-w-[200px]">
          <h3 className="text-sm font-semibold mb-3">Nodes</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-[#7C3AED]" />
              <span>Author Hubs</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-[#A78BFA]" />
              <span>Tweet Notes</span>
            </div>
          </div>
          {graphData && (
            <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
              {graphData.nodes?.length || 0} nodes · {graphData.links?.length || 0} edges
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading graph data...
          </div>
        ) : (!graphData?.nodes?.length) ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Import some tweets to see your knowledge graph.
          </div>
        ) : (
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={(node: any) => node.color}
            linkColor={() => '#333333'}
            linkWidth={1.5}
            nodeRelSize={6}
            backgroundColor="#0a0a0a"
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Inter, sans-serif`;
              
              const isHub = node.group === 'Author';
              
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color;
              ctx.fill();

              if (globalScale > 2 || (isHub && globalScale > 0.8)) {
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); 

                ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
                ctx.fillRect(
                  node.x - bckgDimensions[0] / 2, 
                  node.y + node.val + fontSize/2, 
                  bckgDimensions[0], 
                  bckgDimensions[1]
                );

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = isHub ? '#FFFFFF' : '#E5E5E5';
                ctx.fillText(label, node.x, node.y + node.val + fontSize);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
