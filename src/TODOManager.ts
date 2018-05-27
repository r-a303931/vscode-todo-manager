import * as fs from 'fs';
import * as globby from 'globby';
import * as vscode from 'vscode';
import { join } from 'path';

interface TODOData {
	fileSource: string;
	lineNumber: number;
	text: string;
}

const extensionToCommentMap: {
	[key: string]: RegExp[]
} = {
	"js": [/^\s*\/\/\/? ?@TODO:? ?(.*)/],
	"ts": [/^\s*\/\/\/? ?@TODO:? ?(.*)/],
	"php": [
		/^\s*# ?@TODO:? ?(.*)/,
		/^\s*\/\/\/? ?@TODO:? ?(.*)/
	],
	"java": [/^\s*\/\/\/? ?@TODO:? ?(.*)/],
	"python": [/^\s*# ?@TODO:? ?(.*)/],
	"c": [/^\s*\/\/\/? ?@TODO:? ?(.*)/],
	"cpp": [/^\s*\/\/\/? ?@TODO:? ?(.*)/],
	"cs": [/^\s*\/\/\/? ?@TODO:? ?(.*)/]
};

const extensions = Object.keys(extensionToCommentMap).map(s => '**/*.' + s);

export default class TODOManager implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTodoData: vscode.EventEmitter<TODOItem | undefined> = new vscode.EventEmitter<TODOItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<TODOItem | undefined> = this._onDidChangeTodoData.event;

	constructor(private readonly workspacePath?: string) {
		/// @TODO: Make it so that the files are watched properly
		extensions.map(ext => {
			let event = vscode.workspace.createFileSystemWatcher(ext, false, false, false);
	
			event.onDidChange(this.refresh);
			event.onDidCreate(this.refresh);
			event.onDidDelete(this.refresh);
		});

		/// @TODO: Syntax highlighting for `@TODO`
	}

	refresh () {
		this._onDidChangeTodoData.fire();
	}

	getTreeItem(element: TODOItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		if (!this.workspacePath) {
			vscode.window.showInformationMessage('No TODO handling in empty workspace');
			return Promise.resolve([]);
		}

		return new Promise(async resolve => {
			if (element instanceof TODOItem) {
				resolve([]);
			} else if (element instanceof TODOFile) {
				let file = element.label;
				(new Promise<TODOData[]>((res, rej) => {
					fs.readFile(join(this.workspacePath as string, file), 'utf-8', (err, data) => {
						let parts = file.split('.');
						let ending = parts[parts.length - 1];
						let regex = extensionToCommentMap[ending];
						let results: TODOData[] = [];
						data.split('\n').forEach((line, lineNumber) => {
							(regex
								.map(reg => {
									let result = reg.exec(line);
									if (result) {
										return result[1];
									} else {
										return undefined;
									}
								})
								.filter(val => val !== undefined) as string[])
								.forEach(result => {
									results.push({
										fileSource: file,
										lineNumber,
										text: result
									});
								});
						});
						res(results);
					});
				})).then(items => {
					resolve(items.map(item =>
						new TODOItem(item.text, vscode.TreeItemCollapsibleState.None, item.fileSource, item.lineNumber)));
				});
			} else {
				const files = await globby([...extensions, '!node_modules'], {
					cwd: this.workspacePath
				});
				
				resolve(files.map(file => new TODOFile(file, vscode.TreeItemCollapsibleState.Expanded)));
			}
		});
	}
}

class TODOItem extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly fileSource: string,
		public readonly lineNumber: number
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return `${this.label} (${this.fileSource}:${this.lineNumber + 1})`;
	}

	command = {
		title: "Open file and go to line",
		command: "other.openFileLine",
		arguments: [this.fileSource, this.lineNumber]
	};
}

class TODOFile extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return `${this.label}`;
	}
}