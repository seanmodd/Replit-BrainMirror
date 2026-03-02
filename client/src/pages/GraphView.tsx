import { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ForceGraph2D from 'react-force-graph-2d';

const NODE_COLORS: Record<string, string> = {
  Author: "#7C3AED",
  Hashtag: "#10B981",
  Thread: "#F97316",
  Tweet: "#A78BFA",
};

const LEGEND_ITEMS = [
  { group: "Author", label: "Author Hubs", color: "#7C3AED" },
  { group: "Hashtag", label: "Hashtags", color: "#10B981" },
  { group: "Thread", label: "Threads", color: "#F97316" },
  { group: "bookmark", label: "Bookmarked Tweets", color: "#3B82F6" },
  { group: "retweet", label: "Retweeted Tweets", color: "#F59E0B" },
  { group: "public", label: "Public Tweets", color: "#A78BFA" },
  { group: "manual", label: "Manual Imports", color: "#8B5CF6" },
];

export default function GraphView() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const graphRef = useRef<any>(null);
  
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

  const filteredData = useCallback(() => {
    if (!graphData || !filterGroup) return graphData;
    const visibleNodeIds = new Set<string>();
    graphData.nodes.forEach((n: any) => {
      if (n.group === filterGroup || n.subgroup === filterGroup) {
        visibleNodeIds.add(n.id);
      }
    });
    graphData.links.forEach((l: any) => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      if (visibleNodeIds.has(srcId)) visibleNodeIds.add(tgtId);
      if (visibleNodeIds.has(tgtId)) visibleNodeIds.add(srcId);
    });
    return {
      nodes: graphData.nodes.filter((n: any) => visibleNodeIds.has(n.id)),
      links: graphData.links.filter((l: any) => {
        const srcId = typeof l.source === 'object' ? l.source.id : l.source;
        const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
        return visibleNodeIds.has(srcId) && visibleNodeIds.has(tgtId);
      }),
    };
  }, [graphData, filterGroup]);

  const handleZoomIn = () => graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 300);
  const handleZoomOut = () => graphRef.current?.zoom(graphRef.current.zoom() * 0.67, 300);
  const handleFit = () => graphRef.current?.zoomToFit(400, 50);

  const displayData = filteredData();
  const nodeCounts = graphData?.nodes?.reduce((acc: Record<string, number>, n: any) => {
    acc[n.group] = (acc[n.group] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between bg-card z-10">
        <div>
          <h1 data-testid="text-graph-title" className="text-xl font-bold tracking-tight">Knowledge Graph</h1>
          <p className="text-sm text-muted-foreground">Tweets, authors, hashtags, and threads — all interconnected.</p>
        </div>
        <div className="flex gap-2">
          {["Author", "Hashtag", "Thread"].map(group => (
            <button
              key={group}
              data-testid={`filter-graph-${group.toLowerCase()}`}
              onClick={() => setFilterGroup(filterGroup === group ? null : group)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filterGroup === group
                  ? "text-white shadow-md"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
              style={filterGroup === group ? { backgroundColor: NODE_COLORS[group] } : undefined}
            >
              {group}s ({nodeCounts[group] || 0})
            </button>
          ))}
          {filterGroup && (
            <button
              onClick={() => setFilterGroup(null)}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 relative bg-[#0a0a0a]" id="graph-container">
        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2 bg-card p-2 rounded-lg border border-border shadow-xl">
          <Button data-testid="button-zoom-in" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleZoomIn}>
            <ZoomIn size={18} />
          </Button>
          <Button data-testid="button-zoom-out" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleZoomOut}>
            <ZoomOut size={18} />
          </Button>
          <Button data-testid="button-zoom-fit" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleFit}>
            <Maximize size={18} />
          </Button>
        </div>

        <div className="absolute top-6 left-6 z-10 bg-card/80 backdrop-blur-md p-4 rounded-lg border border-border shadow-xl min-w-[220px]">
          <h3 className="text-sm font-semibold mb-3">Legend</h3>
          <div className="space-y-2">
            {LEGEND_ITEMS.map(item => (
              <div key={item.group} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          {graphData && (
            <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
              <div>{graphData.nodes?.length || 0} nodes · {graphData.links?.length || 0} edges</div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {Object.entries(nodeCounts).map(([group, count]) => (
                  <span key={group}>{count} {group.toLowerCase()}s</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedNode && (
          <div className="absolute top-6 right-6 z-10 bg-card/90 backdrop-blur-md p-4 rounded-lg border border-border shadow-xl max-w-[280px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedNode.color }} />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{selectedNode.group}</span>
            </div>
            <h4 className="text-sm font-semibold mb-1 break-words">{selectedNode.name}</h4>
            <p className="text-xs text-muted-foreground">
              {selectedNode.group === "Hashtag" && "Connects tweets sharing this tag"}
              {selectedNode.group === "Author" && "Hub linking all tweets by this author"}
              {selectedNode.group === "Thread" && "Groups tweets in the same conversation"}
              {selectedNode.group === "Tweet" && `Source: ${selectedNode.subgroup || "manual"}`}
            </p>
            <button onClick={() => setSelectedNode(null)} className="text-xs text-muted-foreground hover:text-foreground mt-2">
              Dismiss
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading graph data...
          </div>
        ) : (!displayData?.nodes?.length) ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Import some tweets to see your knowledge graph.
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={displayData}
            nodeLabel="name"
            nodeColor={(node: any) => node.color}
            linkColor={() => '#333333'}
            linkWidth={1.5}
            nodeRelSize={6}
            backgroundColor="#0a0a0a"
            onNodeClick={(node: any) => setSelectedNode(node)}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Inter, sans-serif`;

              const isHub = node.group === "Author";
              const isHashtag = node.group === "Hashtag";
              const isThread = node.group === "Thread";

              ctx.beginPath();
              if (isHashtag) {
                const s = node.val;
                ctx.moveTo(node.x, node.y - s);
                ctx.lineTo(node.x + s * 0.87, node.y - s * 0.5);
                ctx.lineTo(node.x + s * 0.87, node.y + s * 0.5);
                ctx.lineTo(node.x, node.y + s);
                ctx.lineTo(node.x - s * 0.87, node.y + s * 0.5);
                ctx.lineTo(node.x - s * 0.87, node.y - s * 0.5);
                ctx.closePath();
              } else if (isThread) {
                const s = node.val;
                ctx.rect(node.x - s * 0.8, node.y - s * 0.8, s * 1.6, s * 1.6);
              } else {
                ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
              }
              ctx.fillStyle = node.color;
              ctx.fill();

              if (node === selectedNode) {
                ctx.strokeStyle = "#FFFFFF";
                ctx.lineWidth = 2 / globalScale;
                ctx.stroke();
              }

              const showLabel = globalScale > 1.5 || 
                ((isHub || isHashtag) && globalScale > 0.6) ||
                (isThread && globalScale > 1);

              if (showLabel) {
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
                ctx.fillRect(
                  node.x - bckgDimensions[0] / 2,
                  node.y + node.val + fontSize / 2,
                  bckgDimensions[0],
                  bckgDimensions[1]
                );

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = isHub ? '#FFFFFF' : isHashtag ? '#6EE7B7' : '#E5E5E5';
                ctx.fillText(label, node.x, node.y + node.val + fontSize);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
