import { Entity, OwnershipEdge } from '../types';

export interface OwnershipResult {
  directOwnership: number;
  indirectOwnership: number;
  totalOwnership: number;
  paths: OwnershipPath[];
}

export interface OwnershipPath {
  path: string[]; // array of entity IDs from source to target
  percentage: number; // calculated percentage for this specific path
}

export class OwnershipGraph {
  entities: Map<string, Entity> = new Map();
  edges: OwnershipEdge[] = [];

  constructor(entities: Entity[] = [], edges: OwnershipEdge[] = []) {
    entities.forEach(e => this.entities.set(e.id, e));
    
    // Deduplicate edges and combine percentages
    const edgeMap = new Map<string, OwnershipEdge>();
    edges.forEach(edge => {
        const key = `${edge.parent_entity_id}_${edge.child_entity_id}`;
        if (edgeMap.has(key)) {
            const existing = edgeMap.get(key)!;
            existing.percentage += edge.percentage;
        } else {
            edgeMap.set(key, { ...edge });
        }
    });
    this.edges = Array.from(edgeMap.values());
  }

  addEntity(entity: Entity) {
    if (this.entities.has(entity.id)) return; // Allow idempotent add
    this.entities.set(entity.id, entity);
  }

  addEdge(edge: OwnershipEdge) {
    if (edge.percentage < 0) edge.percentage = 0;
    if (edge.percentage > 100) edge.percentage = 100;

    if (edge.parent_entity_id === edge.child_entity_id) {
      throw new Error("Self-ownership is not allowed");
    }
    
    // Support Decimals: ensure precision does not drift (round to 4 decimals)
    edge.percentage = Math.round(edge.percentage * 10000) / 10000;

    const existingIndex = this.edges.findIndex(
      e => e.parent_entity_id === edge.parent_entity_id && e.child_entity_id === edge.child_entity_id
    );

    let oldPercentage = 0;
    if (existingIndex !== -1) {
      oldPercentage = this.edges[existingIndex].percentage;
    }

    // Check if total ownership of child exceeds 100%
    let currentTotal = this.edges
      .filter(e => e.child_entity_id === edge.child_entity_id)
      .reduce((sum, e) => sum + e.percentage, 0);
      
    if (existingIndex !== -1) {
      currentTotal -= oldPercentage;
    }

    // Use a small epsilon for floating point comparison
    if (currentTotal + edge.percentage > 100.0001) {
      throw new Error(`Total ownership of entity ${edge.child_entity_id} cannot exceed 100%`);
    }

    // Duplicate Edge Handling: update existing relationship instead of throwing error
    if (existingIndex !== -1) {
       this.edges[existingIndex].percentage = edge.percentage;
       // Validation for loop must be done AFTER updating to see if it causes a cycle, 
       // but updating percentage doesn't create new paths. Just in case:
       if (this.hasCycle()) {
         this.edges[existingIndex].percentage = oldPercentage; // rollback
         throw new Error("This ownership creates a loop and is not allowed.");
       }
       return;
    }

    this.edges.push(edge);

    // Single source of truth Loop Detection
    if (this.hasCycle()) {
      this.edges.pop(); // rollback
      throw new Error("This ownership creates a loop and is not allowed.");
    }
  }

  hasCycle(): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        recStack.add(nodeId);

        const outEdges = this.edges.filter(e => e.parent_entity_id === nodeId);
        for (const edge of outEdges) {
          if (!visited.has(edge.child_entity_id) && dfs(edge.child_entity_id)) {
            return true;
          } else if (recStack.has(edge.child_entity_id)) {
            return true;
          }
        }
      }
      recStack.delete(nodeId);
      return false;
    };

    for (const entity of this.entities.values()) {
      if (!visited.has(entity.id)) {
        if (dfs(entity.id)) return true;
      }
    }
    return false;
  }

  removeEdge(parentId: string, childId: string) {
    this.edges = this.edges.filter(
      e => !(e.parent_entity_id === parentId && e.child_entity_id === childId)
    );
  }

  updateEdgePercentage(parentId: string, childId: string, percentage: number) {
     const edgeIndex = this.edges.findIndex(
      e => e.parent_entity_id === parentId && e.child_entity_id === childId
     );
     if (edgeIndex === -1) throw new Error("Edge not found");
     
     // Re-use addEdge since it handles decimals and valid limits and duplicate replacement
     this.addEdge({
        id: this.edges[edgeIndex].id,
        parent_entity_id: parentId,
        child_entity_id: childId,
        percentage: percentage
     });
  }

  hasPath(sourceId: string, targetId: string, visited: Set<string> = new Set()): boolean {
    if (sourceId === targetId) return true;
    if (visited.has(sourceId)) return false;
    
    visited.add(sourceId);
    
    const outgoing = this.edges.filter(e => e.parent_entity_id === sourceId);
    for (const edge of outgoing) {
      if (this.hasPath(edge.child_entity_id, targetId, visited)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Completes full ownership resolution calculating multi-layer multi-path percentage.
   */
  calculateOwnership(sourceId: string, targetId: string): OwnershipResult {
    if (!this.entities.has(sourceId) || !this.entities.has(targetId)) {
        throw new Error("Source or target entity not found");
    }

    const paths: OwnershipPath[] = [];
    
    // DFS to find paths
    const findPaths = (currentId: string, currentPath: string[], currentPct: number) => {
      if (currentId === targetId) {
        if (currentPath.length > 1) { // Path length at least 2 (source -> target)
            paths.push({ path: [...currentPath], percentage: currentPct });
        }
        return;
      }

      const outEdges = this.edges.filter(e => e.parent_entity_id === currentId);
      for (const edge of outEdges) {
        // Prevent cycles just in case
        if (!currentPath.includes(edge.child_entity_id)) {
           currentPath.push(edge.child_entity_id);
           findPaths(edge.child_entity_id, currentPath, currentPct * (edge.percentage / 100));
           currentPath.pop();
        }
      }
    };

    findPaths(sourceId, [sourceId], 1);

    let directOwnership = 0;
    let indirectOwnership = 0;

    paths.forEach(p => {
        if (p.path.length === 2 && p.path[0] === sourceId && p.path[1] === targetId) {
            directOwnership += p.percentage * 100;
        } else {
            indirectOwnership += p.percentage * 100;
        }
    });

    const totalOwnership = directOwnership + indirectOwnership;

    return {
      directOwnership,
      indirectOwnership,
      totalOwnership,
      paths: paths.map(p => ({ ...p, percentage: p.percentage * 100 }))
    };
  }
  
  /**
   * Retrieves all parents that own a specific entity, with their total aggregated ownership
   */
  getAllOwnersForEntity(targetId: string): Record<string, OwnershipResult> {
      const results: Record<string, OwnershipResult> = {};
      for (const entity of this.entities.values()) {
          if (entity.id !== targetId) {
              const res = this.calculateOwnership(entity.id, targetId);
              if (res.totalOwnership > 0) {
                  results[entity.id] = res;
              }
          }
      }
      return results;
  }
  
  /**
   * Retrieves all children owned directly or indirectly by an entity
   */
  getAllHoldingsForEntity(sourceId: string): Record<string, OwnershipResult> {
      const results: Record<string, OwnershipResult> = {};
      for (const entity of this.entities.values()) {
           if (entity.id !== sourceId) {
               const res = this.calculateOwnership(sourceId, entity.id);
               if (res.totalOwnership > 0) {
                   results[entity.id] = res;
               }
           }
      }
      return results;
  }
}
