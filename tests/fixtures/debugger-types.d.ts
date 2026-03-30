/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// Simulates the real JupyterLab pattern where:
//   - The interface lives inside a namespace   (separate from the token)
//   - The token is exported as a standalone const typed as Token<Namespace.Interface>
//
// This example mirrors @jupyterlab/debugger:

declare class Token<T> {}
declare class JupyterFrontEnd {}
declare class JupyterFrontEndPlugin<T> {}

export declare namespace IDebugger {
  interface ISidebar {}
}
export declare const IDebuggerSidebar: Token<IDebugger.ISidebar>;

export declare interface INotebookTracker {}
export declare const INotebookTrackerToken: Token<INotebookTracker>;
