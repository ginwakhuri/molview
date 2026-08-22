# MolView – Molecular Pathfinding & Visualization Extension

## Introduction

This project extends MolView with interactive graph-based tools for computing and visualizing paths between atoms in molecular structures.
The extension introduces two pathfinding modes:
**SHP (Shortest Path):** Computes shortest paths based on the number of bonds between two selected atoms.
**SHPD (Shortest Path by Distance):** Computes weighted shortest paths using estimated chemical bond distances.
The implementation integrates graph algorithms with MolView's existing molecular model, user interface, event-handling system, application state, and rendering components.
It also supports visualization of computed paths, navigation between alternative shortest paths, and display of path measurements.

## SHP – Shortest Path by Number of Bonds

### Graph Representation

For pathfinding purposes, the molecular structure is represented as a graph:
**Atoms** represent vertices.
**Bonds** represent edges.
The SHP tool finds a path containing the minimum number of bonds between two selected atoms.

### Shortest-Path Algorithm

The path is computed using **Breadth-First Search (BFS)**.
The algorithm explores the molecular graph from the first selected atom while recording predecessor information for visited atoms.
Once the target atom is reached, the stored predecessors are followed backwards to reconstruct the shortest route.
The result contains the atoms and bonds belonging to the path. If the selected atoms are disconnected, no path is returned.

### User Interaction

The SHP tool is integrated into MolView's toolbar and selection system. The user activates the tool and selects two atoms:

1. The first selected atom is stored and highlighted.
2. The second selection triggers the shortest-path computation.
3. The atoms and bonds belonging to the resulting path are highlighted.
4. The computed path is stored in the sketcher state for visualization and further interaction.

## Multiple Equal-Length Shortest Paths

A molecular graph may contain more than one shortest path between the same pair of atoms. The SHP implementation therefore supports computing and navigating between multiple paths with the same minimum number of bonds.

### Computing Multiple Shortest Paths

The `computeAllShortestPaths()` method extends the BFS-based approach by recording all valid predecessors for each visited atom rather than storing only a single predecessor.
Once the minimum distance to the destination is known, the predecessor relationships are backtracked to reconstruct the available shortest paths.
A `canTraverse()` helper defines which molecular connections may participate in the search. The traversal policy can account for structural properties such as hydrogen atoms and atoms hidden by the current display mode.

### Path Navigation

When multiple shortest paths are available, they are stored together with the index of the currently displayed path. The user can navigate between the precomputed alternatives without rerunning the pathfinding algorithm:

- `W`: Show the next shortest path (same number of edges).
- `E`: Show the previous shortest path.
- `Esc`: Clear the current path and reset the selection. (Still working on it).
  Switching paths clears the previous highlight, displays the newly selected path, updates the internal state, and redraws the molecular structure.

## SHPD – Shortest Path by Distance

The original SHP algorithm treats every bond as an edge with equal cost. The SHPD tool extends the pathfinding system by assigning weights to bonds, allowing paths to be compared using estimated chemical bond distances rather than only the number of edges.

### Bond Weights

Bond distances are approximated using covalent radii and bond order. This allows different bond types, including single, double, and triple bonds, to contribute different weights to the total path distance.

### Weighted Pathfinding

Because the molecular graph now contains weighted edges, the SHPD tool uses **Dijkstra's algorithm** instead of BFS.
`computeWeightedShortestPath()` computes a minimum-weight path between the selected atoms.
`computeAllWeightedShortestPaths()` extends this functionality to support multiple paths whose total weighted distance is within a small epsilon of the optimal value.
The two pathfinding modes therefore provide different interpretations of shortest path:
**SHP:** Minimizes the number of bonds.
**SHPD:** Minimizes the estimated total bond distance.
The interface displays the appropriate path measurement and updates it when the selected path or pathfinding mode changes.

## Integration with the Existing MolView Codebase

The pathfinding functionality was integrated across multiple components of the existing MolView codebase rather than implemented as a standalone feature. The changes connect the graph algorithms with MolView's interface, event system, application state, and rendering pipeline.

### `index.html`

Added dedicated SHP and SHPD controls to the existing toolbar, along with a path-information element for displaying the current path measurement. Custom icons were introduced to visually distinguish between edge-based and distance-based pathfinding.

### `Actions.js`

Extended the action system to support activation and deactivation of both SHP and SHPD. Shared helper functions manage tool switching, clear previously displayed paths, and return the interface to its default interaction mode when necessary.

### `MolView.js`

Registered the SHPD tool with MolView's existing action system, allowing it to behave consistently with other interactive sketcher tools.

### `MolPad.js`

Extended the application state to manage computed paths, the currently displayed path, and the active pathfinding mode. The component also coordinates path navigation and updates the displayed measurement according to whether SHP or SHPD is active.

### `MPEvents.js`

Extended MolView's event handling to support atom selection, path computation, keyboard navigation, and cleanup for both pathfinding modes. The event logic connects user interaction with the pathfinding algorithms and updates the stored path state accordingly.

### `MPGraphics.js`

Extended the rendering system to display path measurements alongside the highlighted molecular path. This allows SHP to communicate bond-count information and SHPD to display the corresponding weighted-distance measurement.

### `MPMolecule.js`

Contains the core graph and pathfinding functionality introduced by the project, including:

- BFS-based shortest-path computation.
- Reconstruction of multiple equal-length shortest paths.
- Molecular traversal rules through `canTraverse()`.
- Bond-order and estimated bond-length calculations.
- Dijkstra-based weighted shortest-path computation.
- Reconstruction of multiple approximately equal optimal weighted paths.

### `Sketcher.less`

Added styling for the new SHP and SHPD controls and the path-information display, keeping the new functionality visually consistent with the existing MolView interface.
