'use strict';
import * as vscode from 'vscode';
import { join } from 'path';

import TODOManager from './TODOManager';

export function activate(context: vscode.ExtensionContext) {

    const rootPath = vscode.workspace.rootPath;

    vscode.commands.registerCommand('other.openFileLine', (file, line) => {
        if (!file) {
            return;
        }
        let path = vscode.Uri.file(join(vscode.workspace.rootPath as string, file));
        vscode.workspace.openTextDocument(path).then(doc => {
            vscode.window.showTextDocument(doc).then(texteditor => {
                texteditor.selection = new vscode.Selection(
                    new vscode.Position(line, 0),
                    new vscode.Position(line, 9999999)
                );
            });
        });
    });

    const todoManager = new TODOManager(rootPath);

    vscode.window.createTreeView('todo-manager', { treeDataProvider: todoManager });
    vscode.window.registerTreeDataProvider('todo-manager', todoManager);
    vscode.commands.registerCommand('todo-manager.refreshEntry', () => todoManager.refresh());
}

export function deactivate() {
}