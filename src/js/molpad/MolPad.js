/**
 * This file is part of MolView (http://molview.org)
 * Copyright (c) 2014-2023 Herman Bergwerf
 */

var MP_ZOOM_TO_COG = 0;
var MP_ZOOM_TO_POINTER = 1;

/**
 * Initialize MolPad in the given container
 * TODO: larger touch targets on high DPI screens
 * TODO: add implicit hydrogen as subset of MPAtom
 * TODO: collapse newly added implicit H atoms if !skeletal
 * TODO: always on feature for select tool
 *
 * @param {DOMElement} container
 * @param {Float}      devicePixelRatio
 * @param {Object}     buttons
 */
function MolPad(container, devicePixelRatio, buttons) {
    this.loadSettings();

    //active tool data
    this.tool = {
        type: 'bond', //bond || fragment || chain || charge || erase || drag || select || atom
        data: { type: MP_BOND_SINGLE },
        selection: [], //TMP
    };

    this.mol = new MPMolecule(this);
    this.sel = new MPSelection(this);

    // ----- SHPD (Shortest Path by Distances) -----
    this.shpState = { mode: null, paths: [], idx: 0 }; // mode: "edges" | "bond" -- SHP/SHPD state (paths + which one is shown)

    // ----- Original code -----
    this.buttons = buttons;
    this.container = jQuery(container);
    this.offset = this.container.offset();
    this.devicePixelRatio = devicePixelRatio || 1;

    this.setupEventHandling();
    this.setupGraphics();
}

// ----- SHPD (Shortest Path by Distances) -----
// Clear current path display (used when toggling tools)
MolPad.prototype.resetEventDisplay = function () {
    this.shpState = { mode: null, paths: [], idx: 0 };
    // If you draw paths on canvas, also clear any overlay here.
};

// Compute all shortest paths between startAtom and endAtom, store them, and render the first one.
MolPad.prototype.computeAndStorePaths = function (startAtom, endAtom) {
    if (!startAtom || !endAtom || startAtom === endAtom) {
        this.shpState = { mode: null, paths: [], idx: 0 };
        this.updateShortestPathInfo && this.updateShortestPathInfo();
        this.requestRedraw();
        return;
    }

    var isBondMode = this.tool && this.tool.type === 'shortest_path_bond';
    this.shpState.mode = isBondMode ? 'bond' : 'edges';

    var paths = isBondMode
        ? this.mol.computeAllWeightedShortestPaths(startAtom, endAtom, {
              epsilon: 1e-6,
          })
        : this.mol.computeAllShortestPaths(startAtom, endAtom, {});

    this.shpState.paths = paths || [];
    this.shpState.idx = 0;

    this.renderCurrentPath();
    this.updateShortestPathInfo && this.updateShortestPathInfo();
};

// Advance to next equal-best path (used by your W toggle)
MolPad.prototype.cyclePath = function () {
    if (!this.shpState.paths || this.shpState.paths.length === 0) return;
    this.shpState.idx = (this.shpState.idx + 1) % this.shpState.paths.length;
    this.renderCurrentPath();
    if (this.updateShortestPathInfo) {
        this.updateShortestPathInfo();
    }
};

// Draw currently selected path (atoms/bonds) — reuse your existing drawing logic.
MolPad.prototype.renderCurrentPath = function () {
    // You likely already highlight a path somewhere.
    // Here we just request a redraw and rely on your draw code to read shpState.
    this.requestRedraw();
};

// ----- Displaying SHP/SHPD info -----
MolPad.prototype.updateShortestPathInfo = function () {
    var infoEl = document.getElementById('shortest-path-info');
    if (!infoEl) return;

    var meta =
        Sketcher && Sketcher.metadata && Sketcher.metadata.shortestPath2D;
    if (!meta || !meta.paths || !meta.paths.length) {
        infoEl.style.display = 'none';
        infoEl.textContent = '';
        return;
    }

    var idx = meta.idx || 0;
    if (idx < 0 || idx >= meta.paths.length) idx = 0;
    var path = meta.paths[idx];
    var label = '';

    // ----- SHPD: real chemical distance -----
    if (meta.mode === 'weights' || meta.mode === 'bond') {
        var w = null;

        if (path && typeof path.totalDistance === 'number') {
            w = path.totalDistance;
        } else if (path && typeof path.totalWeight === 'number') {
            w = path.totalWeight;
        }

        label =
            w == null ? 'Total distance: –' : 'Total distance: ' + w.toFixed(2); // + ' Å' if you want units
    }
    // ----- SHP: number of bonds -----
    else {
        var numBonds = 0;
        if (path && Array.isArray(path.bonds)) {
            numBonds = path.bonds.length;
        } else if (path && Array.isArray(path.atoms)) {
            numBonds = Math.max(0, path.atoms.length - 1);
        }
        label = 'Total bonds: ' + numBonds;
    }

    infoEl.textContent = label;
    infoEl.style.display = '';
};

// ----- Original code -----
/**
 * MolPad API
 */

MolPad.prototype.setTool = function (type, data) {
    this.tool.type = type;
    this.tool.data = data;
};

MolPad.prototype.onChange = function (cb) {
    this.changeCallback = cb;
};

MolPad.prototype.clear = function (cb) {
    this.mol.clear();
    this.sel.update();

    //retain old molecule translation in case of an undo
    this.scaleAbsolute(1 / this.matrix[0], this.width() / 2, this.height() / 2);

    this.redraw(true);
    this.mol.updateCopy();
};

MolPad.prototype.changed = function () {
    jQuery(this.buttons.undo).toggleClass(
        'tool-button-disabled',
        this.mol.stack.length === 0
    );
    jQuery(this.buttons.redo).toggleClass(
        'tool-button-disabled',
        this.mol.reverseStack.length === 0
    );
    if (this.changeCallback !== undefined) this.changeCallback();
};

MolPad.prototype.undo = function (noRedoPush) {
    this.dismissHandler();
    if (this.mol.undo(noRedoPush)) this.changed();
};

MolPad.prototype.redo = function () {
    this.dismissHandler();
    if (this.mol.redo()) this.changed();
};

MolPad.prototype.setSkeletalDisplay = function (on) {
    if (on === this.s.skeletalDisplay) return;

    this.dismissHandler();
    this.s.skeletalDisplay = on;

    if (on) this.mol.removeImplicitHydrogen();
    else this.mol.addImplicitHydrogen();

    this.mol.invalidateAll();

    this.clearRedrawRequest();
    this.mol.updateCopy();
};

MolPad.prototype.setColored = function (on) {
    this.s.atom.colored = this.s.bond.colored = on;
    this.s.fonts.isotope.fontStyle =
        this.s.fonts.element.fontStyle =
        this.s.fonts.charge.fontStyle =
            on ? 'bold' : 'normal';
    this.redraw(true);
};

MolPad.prototype.toDataURL = function () {
    return this.canvas.toDataURL('image/png');
};

/**
 * Load molfile
 * @param {String}  mol
 * @param {Boolean} forceRemoveHydrogen
 */
MolPad.prototype.loadMOL = function (mol, forceRemoveHydrogen) {
    this.mol.loadMOL(mol);

    if (this.s.skeletalDisplay || forceRemoveHydrogen) {
        this.mol.removeImplicitHydrogen();
    }

    this.center();
    this.mol.updateCopy();
};

MolPad.prototype.getMOL = function () {
    return this.mol.getMOL();
};

MolPad.prototype.getSMILES = function () {
    return this.mol.getSMILES();
};
