Hey Prof., this is my report for the project.
Sorry for the delay, I had another project to propose first and it took more time than expected.

I put the cloned the project to a folder which name is "molview-local" in my XAMPP htdocs directory.
Then to be able to run the project, I started Apache server from XAMPP control panel and opened the URL "http://localhost/molview-local/molview/" in my web browser.
But before openning the URL, I disabled the Matomo Analytics script in the index.html file to avoid any external requests + I changed the name of the .htaccess from ".htaccess" to "htaccess.bak" so Apache wouldn’t rewrite/redirect during local testing.
Then I started Apache in XAMPP and opened the "C:\xampp\htdocs\molview-local\molview" and opened the cmd to run "npm install" and then "npx grunt".
Then put the URL and the project was running fine.

# Project Report

## Introduction

Recently, you asked me to allow the user to pick two atoms and compute & visualize the shortest path between them.
First I added the needed code for visualizing the button in the screen.
What I did to make it visual in my local server is:
I marked them as written lines with a comment "Shortest Path tool".

1. In index.html, This is the visible button, and the onclick calls the action that puts MolPad in the new tool mode.
2. In src/js/Actions.js, I added the action that the button calls when clicked.
3. In src/js/molpad/MPEvents.js, a new branch in the getHandler() function is being added. It defines exactly how the SHP tool behaves.
4. src/js/molpad/MPMolecule.js, A new method to compute the path: Actually find the path. I used a simple Breadth-First Search (BFS) on the bond graph (atoms are nodes, bonds are edges). It returns the list of atoms and bonds on the shortest route (fewest bonds), or null if they’re disconnected.

Explanation of the second push to github:
After pushing the first time, I started working on the functionality of the tool and not just the visual part.
So, I changed the code in both Actions.js and MPEvents.js and added a new method in MPMolecule.js.

1. Actions.js: Updated the action funciton to click-handler the SHP toolbar button calls, and inside it we have the toggle logic which says:
   if the button is already active, then deactivate it, else activate it and deactivate any other active tool.
2. MPEvents.js: The getHandler() function is updated to include the logic of the SHP tool.
   When the active tool is SHP, MolPad returns a handler with onPointerDown. On each click, we hit-test using MolPad’s picker and only proceed if an atom was clicked.
   • First click: store and highlight the first atom.
   • Second click: store the second atom, call mp.mol.computeShortestPath(a, b), and highlight all atoms/bonds on the path; I also save their indices in Sketcher.metadata.shortestPath2D.
   • While a path is highlighted and no pick is in progress: a single click on any atom clears the old highlight and uses that atom as the new first pick, enabling fast re-selection.
   Clicks on empty space/bonds do nothing; clicking the same atom twice is ignored. The SHP button toggle lives in Actions.mp_shortest_path.
3. MPMolecule.js: I cleaned up computeShortestPath so it’s easier to think about and hook to the UI. Instead of tracking two parallel maps (one for the previous atom and one for the previous bond), I keep a single “breadcrumb” per visited atom : prev[ni] = { ai, bond }.
   That way, when we reach the target, we just walk those breadcrumbs back to rebuild the path.
   I also changed the “no path / same atom” case to return null (not an empty object), so the SHP click handler can simply treat it as “nothing to highlight."
   Same simple ES5 BFS under the hood, just clearer names and a tidier shape that plays nicer with the selection/highlight flow.

I will add images in the "C:\xampp\htdocs\molview-local\Images\Shortest_Path" folder to show the steps of using the tool.

Explanation of the third push to github:
This time I wanted to extend the second task which is (SHP button) functionality.
So I added the ability to toggle between 2 or more (if found) different shortest paths between the 2 selected atoms but with the same number of edges (same length).
So I modified the following files under the following comments: "SHP Multiple Paths".

1. MPMolecule.js: I added a method under the name: 'canTraverse()' which defines the rules of which edges (bonds) in the molecular graph can be used while searching for the shortest path between two atoms.
   Since molecules contain both structural and auxiliary atoms, this method ensures that the path-finding algorithm only follows some chemically meaningful connections such as:

    - Determines the next atom reachable through the current bond.
    - Optionally skips hydrogens that are not part of the structural backbone (to avoid unnecessary detours and provide a cleaner, chemically sensible route).
    - Optionally excludes atoms that are invisible in the current display mode.
    - Returns whether movement along the bond is allowed.

    Another method was added under the name: 'computeAllShortestPaths()' which goal is:

    - To run a BFS on the molecular graph to find every shortest path (minimum number of bonds) between the two selected atoms.
    - While exploring, to record all valid predecessors for each visited atom in a parents[] list (not just one), as allowed by the traversal policy in canTraverse.
    - After BFS reaches the target, it backtracks through parents[] to enumerate all shortest routes.
    - It returns an array of paths, where each path is an object.

2. MPEvents.js: To improve the usability of the Shortest Path (SHP) feature, I extended MolView’s event-handling system with dedicated keyboard controls.
   A new capture-phase listener was added to intercept key presses only while the SHP tool is active or a shortest path is displayed.
   This logic enables the user to explore multiple valid shortest paths between two atoms in a simple and intuitive way:

    - 'W': Show the next shortest path (same number of edges).
    - 'E': Show the previous shortest path.
    - 'Esc': Clear the current path and reset the selection. (Still working on it).

    The showShoretstPathIndex() is responsible for switching the visual highlight between different shortest paths that have already been computed.
    It clears the previously shown path, highlights the newly selected one, updates internal state (meta.idx), and forces a redraw of the sketcher.
    This function allows smooth toggling of equal-length shortest paths without recalculating them, supporting the W/E keyboard navigation feature.

    When the second atom is selected, this code computes all shortest paths between the two atoms using computeAllShortestPaths().
    If multiple valid paths exist, they are stored in Sketcher.metadata.shortestPath2D, including the list of full path objects and the index of the currently shown path.
    The first path is highlighted immediately, and the UI is updated. This prepares the system for toggling through alternative paths using the W and E keys, without needing to recompute anything.

Explanation of the fourth push to github:
This time I wanted to add another things:

1. I added the option to compute the shortest path considering the number of bonds between atoms, as we know in chemics there is a difference in the distance between single, double, and triple bonds.
   So I added a checkbox in the UI to allow the user to choose if he wants to consider the bond types while computing the shortest path or not.
   So now we have 2 buttons:

    1. SHP (Shortest Path) button: which computes the shortest path without considering the bond types.
    2. SHPD (Shortest Path with Bond Types) button: which computes the shortest path considering the bond types.

2. I also added the ability to toggle between 2 or more (if found) different shortest paths between the 2 selected atoms but with the same weighted distance.
   So I modified the following files under the following comments: "// ----- SHPD (Shortest Path by Distances) -----".
   I will explain the changes after listing them.

3. I also added the display of the weighted/unweighted shortest path distance value between the 2 selected atoms in the top left corner of the screen and it's updated each time we change path/ type of path.

the changes are as follows:

1. Index.html: In this stage, I updated the interface by adding two clear buttons for the shortest-path tools.
   Besides the original SHP option, I introduced a new SHPD button right next to it.
   This extra button lets the user switch to a chemistry-based shortest path, where the distance is calculated using actual bond lengths (based on covalent radii), rather than just counting edges.
   I also added a small information banner that can later display details about the selected path, and adjusted the button structure so both tools look and behave consistently with the rest of the toolbar.
   I also changed the (shp) button display into new logo that fits the other buttons.

2. Actions.js: This file was updated to support the new SHPD tool and to improve how shortest-path tools are activated, deactivated, and cleared.
   A new helper (clearShownShortestPath) automatically deselects any highlighted path and clears Sketcher.metadata.shortestPath2D. This prevents old paths from remaining visible when switching tools or clearing the canvas.
   Two small utilities (activateTool and deactivateToDrag) were added to handle: 1- Tool button highlight/unhighlight. 2- Switching back to drag mode. 3- Clearing old paths before activating a new tool. 4- This standardizes SHP and SHPD behaviour without repeating code.
   Now clears both the sketch and any stored path data, keeping the interface consistent when starting a new drawing.
   A new action mp_shortest_path_bond was added, enabling shortest paths calculated by chemical bond distances. It behaves exactly like the SHP button but activates the new weighted-path mode.
   The original shortest-path tool now uses the new activation helpers and automatically disables SHPD when selected.

3. MolView.js: the new SHPD tool (mp_shortest_path_bond) was registered using addAction().
   This ensures that MolView treats SHPD as a fully functional button tool, allowing it to appear in the sketcher interface and interact with the action system in the same way as the original SHP tool.

4. MolPad.js: molpad.js now manages the shortest path tools through a unified state system.
   The file was extended with logic that stores computed paths, distinguishes between edge-based and bond-length-based calculations, cycles through paths, and updates a UI banner with the correct form of measurement (bonds vs. weighted distance).
   These changes make both SHP and SHPD fully interactive and visually consistent, without interfering with the original MolView rendering system.

5. MpEvents.js: the event logic was extended to support both the original SHP tool and the new SHPD tool.
   The modifications unify how both tools respond to mouse clicks, keyboard navigation, and UI updates.
   Metadata now records whether paths were computed by edge count or by chemical bond length, allowing the UI to display the appropriate measurement.
   Cleanup functions were also updated to avoid leaving stale path highlights or labels.

6. MpGraphics.js: The graphical component of MolView was extended to visualize not only the geometry of the selected shortest path, but also its chemical interpretation.
   In the case of SHPD (Shortest Path by Distances), the computed path possesses a real molecular meaning: its length corresponds to the physical bond distances between atoms, derived from covalent radii and bond orders.
   To reflect this distinction, the renderer overlays a numeric label directly on the canvas, positioned near the geometric center of the highlighted path.
   Unlike the original SHP tool—which simply counted edges—SHPD communicates a quantitative molecular value. This makes the path visualization more than a structural indicator; it becomes a chemical measurement.
   By linking visual selection with molecular metrics, the graphics layer now serves an analytic purpose.
   The path display shifts from “which atoms are connected?” toward “how long is this chemical route?”, integrating a chemistry-aware perspective into MolView’s previously purely topological drawing tool.

7. MpMolecule.js: In MPMolecule.js I extended the path-finding logic to support chemically weighted shortest paths for the new SHPD tool.
   I introduced a bondOrder helper and a chemicalBondLength function that approximate the distance of a bond using covalent radii and bond order, so single, double and triple bonds receive different weights.
   On top of this, I implemented a Dijkstra-based routine to compute the single best weighted path (computeWeightedShortestPath) and a second routine (computeAllWeightedShortestPaths) that enumerates all paths whose total chemical length is within a small epsilon of the optimum.
   Together, these functions let MolView compute and return paths that are shortest in terms of realistic bond distances, not just number of edges.

8. Sketcher.less: UI styling was added to support the new shortest-path features.
   Two new icons were assigned to the SHP and SHPD tools to clearly differentiate edge-based versus bond-weighted path selection.
   Additionally, I introduced a small floating banner (.shortest-path-info) used to display live path measurements. The banner inherits MolView’s styling variables and is positioned non-intrusively under the toolbar, ensuring it provides useful feedback without interfering with drawing interactions.

10 & 11. the photos in the "C:\xampp\htdocs\molview-local\molview\src\svg\action\shp.svg" and "C:\xampp\htdocs\molview-local\molview\src\svg\action\shpd.svg" files were created to be the new icons for the SHP and SHPD buttons respectively.

12. Images and videos were added in the "C:\xampp\htdocs\molview-local\Images\SHPD_Tool" folder to show the new features.
