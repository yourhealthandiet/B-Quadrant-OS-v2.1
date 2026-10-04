import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Entity, OwnershipEdge } from '../../types';
import { OwnershipGraph } from '../../services/ownershipEngine';

interface OwnershipGraphVizProps {
    engine: OwnershipGraph;
    entities: Entity[];
    onSelectEntity?: (id: string) => void;
    onUpdateEdge?: (parentId: string, childId: string, percentage: number) => void;
    selectedId?: string;
    showDirectOnly?: boolean;
}

interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
    name: string;
    type: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
    source: string | GraphNode;
    target: string | GraphNode;
    value: number;
}

export const OwnershipGraphViz: React.FC<OwnershipGraphVizProps> = ({ 
    engine, 
    entities, 
    onSelectEntity,
    onUpdateEdge,
    selectedId,
    showDirectOnly = false
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Prepare data for D3
    const graphData = useMemo(() => {
        const nodes: GraphNode[] = entities.map(e => ({
            id: e.id,
            name: e.name,
            type: e.type
        }));

        // In a graph viz, edges ARE direct relationships.
        // If we want "Direct Only" vs "Full", it might mean showing/hiding transitive connections if we were auto-generating them.
        // But our engine.edges are ALREADY the direct relationships.
        // If the user selects an entity and wants "Direct Only", maybe they only want to see nodes connected to it?
        // Let's interpret "Direct Only" as: only show the immediate ancestors and descendants of the selectedId.
        
        let links: GraphLink[] = engine.edges.map(e => ({
            source: e.parent_entity_id,
            target: e.child_entity_id,
            value: e.percentage
        }));

        const nodeIds = new Set(nodes.map(n => n.id));
        links = links.filter(l => nodeIds.has(l.source as string) && nodeIds.has(l.target as string));

        if (showDirectOnly && selectedId) {
            links = links.filter(l => l.source === selectedId || l.target === selectedId);
            // Optionally filter nodes too to clean up the graph
            const linkedNodeIds = new Set([selectedId]);
            links.forEach(l => {
                linkedNodeIds.add(typeof l.source === 'string' ? l.source : (l.source as any).id);
                linkedNodeIds.add(typeof l.target === 'string' ? l.target : (l.target as any).id);
            });
            return { nodes: nodes.filter(n => linkedNodeIds.has(n.id)), links };
        }

        return { nodes, links };
    }, [entities, engine.edges, showDirectOnly, selectedId]);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = width < 600 ? 300 : 500;

        const svg = d3.select(svgRef.current)
            .attr("viewBox", [0, 0, width, height])
            .attr("width", width)
            .attr("height", height)
            .style("max-width", "100%")
            .style("height", "100%");

        svg.selectAll("*").remove(); // Clear previous content

        const g = svg.append("g");

        // Zoom setup
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 8])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        // Simulation
        const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
            .force("link", d3.forceLink<GraphNode, GraphLink>(graphData.links).id(d => d.id).distance(220))
            .force("charge", d3.forceManyBody().strength(-1500))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(100));

        // Define arrowheads
        svg.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 32) // Position at the start of the node radius
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#94a3b8");

        // Draw Links
        const link = g.append("g")
            .selectAll("line")
            .data(graphData.links)
            .join("line")
            .attr("stroke", "#cbd5e1")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", d => Math.sqrt(d.value) * 1.5)
            .attr("marker-end", "url(#arrowhead)");

        // Draw Nodes
        const node = g.append("g")
            .selectAll<SVGGElement, GraphNode>("g")
            .data(graphData.nodes)
            .join("g")
            .style("cursor", "pointer")
            .call(d3.drag<SVGGElement, GraphNode>()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            .on("click", (event, d) => onSelectEntity?.(d.id));

        // Node Circles
        node.append("circle")
            .attr("r", 24)
            .attr("fill", d => d.id === selectedId ? "#6366f1" : "white")
            .attr("stroke", d => d.id === selectedId ? "#4338ca" : "#e2e8f0")
            .attr("stroke-width", 2)
            .attr("class", "transition-all duration-300");

        // Icons/Symbols placeholder
        node.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .attr("font-size", "12px")
            .attr("fill", d => d.id === selectedId ? "white" : "#64748b")
            .text(d => d.type === 'PERSON' ? "👤" : "🏢");

        // Labels
        node.append("text")
            .attr("dx", 0)
            .attr("dy", 40)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("fill", "#1e293b")
            .attr("class", "dark:fill-gray-300")
            .text(d => d.name);

        // Edge Labels (% ownership)
        const edgeLabels = g.append("g")
            .selectAll("g")
            .data(graphData.links)
            .join("g")
            .attr("class", "edge-label")
            .style("cursor", onUpdateEdge ? "pointer" : "default")
            .on("click", (event, d) => {
                if (!onUpdateEdge) return;
                const sourceId = typeof d.source === 'string' ? d.source : (d.source as any).id;
                const targetId = typeof d.target === 'string' ? d.target : (d.target as any).id;
                const sourceName = entities.find(e => e.id === sourceId)?.name || 'Owner';
                const targetName = entities.find(e => e.id === targetId)?.name || 'Entity';
                const newPct = window.prompt(`Update ownership percentage for ${sourceName} in ${targetName}:`, String(d.value));
                if (newPct !== null) {
                    const val = parseFloat(newPct);
                    if (!isNaN(val) && val >= 0 && val <= 100) {
                        onUpdateEdge(sourceId, targetId, val);
                    }
                }
            });

        edgeLabels.append("text")
            .attr("font-size", "9px")
            .attr("font-weight", "bold")
            .attr("fill", "#6366f1")
            .attr("text-anchor", "middle")
            .attr("paint-order", "stroke")
            .attr("stroke", "white")
            .attr("stroke-width", "2px")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .text(d => `${d.value}%`);

        simulation.on("tick", () => {
            link
                .attr("x1", d => (d.source as any).x)
                .attr("y1", d => (d.source as any).y)
                .attr("x2", d => (d.target as any).x)
                .attr("y2", d => (d.target as any).y);

            node
                .attr("transform", d => `translate(${d.x},${d.y})`);

            edgeLabels
                .attr("transform", d => {
                    const x = ((d.source as any).x + (d.target as any).x) / 2;
                    const y = ((d.source as any).y + (d.target as any).y) / 2;
                    // Add slight vertical offset so it floats above the line
                    return `translate(${x}, ${y - 8})`;
                });
        });

        function dragstarted(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: any, d: any) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return () => {
             simulation.stop();
        };
    }, [graphData, selectedId, onSelectEntity]);

    return (
        <div 
            ref={containerRef} 
            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-inner relative group"
        >
            <div className="absolute top-4 left-4 z-10 space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-400 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-md backdrop-blur-sm">
                    Interactive Ownership Map
                </div>
                <div className="text-[9px] text-gray-400">
                    Scroll to zoom • Drag nodes to explore
                </div>
            </div>
            <svg ref={svgRef} className="w-full h-[300px] sm:h-[400px] lg:h-[500px]"></svg>
        </div>
    );
};
