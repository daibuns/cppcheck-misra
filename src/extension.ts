import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('cppcheck-misra');
    context.subscriptions.push(diagnosticCollection);

    const config = () => vscode.workspace.getConfiguration('cppcheck-misra');

    /**
     * 把配置字符串映射到 VS Code 的 DiagnosticSeverity
     */
    function toSeverity(level: string): vscode.DiagnosticSeverity {
        switch (level) {
            case 'error':
                return vscode.DiagnosticSeverity.Error;
            case 'warning':
                return vscode.DiagnosticSeverity.Warning;
            case 'information':
                return vscode.DiagnosticSeverity.Information;
            case 'hint':
                return vscode.DiagnosticSeverity.Hint;
            default:
                return vscode.DiagnosticSeverity.Warning;
        }
    }

    /**
     * 核心函数：对指定文档运行 cppcheck MISRA，并更新 diagnostics
     */
    async function runCppcheckMisraOnDocument(doc: vscode.TextDocument) {
        if (doc.languageId !== 'c' && doc.languageId !== 'cpp') {
            return;
        }

        // 确保文件已保存（cppcheck 读取磁盘文件）
        if (doc.isUntitled || doc.isDirty) {
            await doc.save();
        }

        const cfg = config();
        const cppcheckPath = cfg.get<string>('cppcheckPath', 'cppcheck');

        const mandatoryLevel = cfg.get<string>('severityMapping.mandatory', 'error');
        const requiredLevel = cfg.get<string>('severityMapping.required', 'warning');
        const advisoryLevel = cfg.get<string>('severityMapping.advisory', 'information');

        const filePath = doc.fileName;

        // 根据文件类型选择标准和报告类型
        let std: string;
        let reportType: string;

        const cfgReportType = cfg.get<string>('reportType', 'auto');
        if (cfgReportType === 'auto') {
            // 自动检测：C文件用MISRA C，C++文件用MISRA C++
            if (doc.languageId === 'c') {
                std = cfg.get<string>('cStd', 'c99');
                reportType = 'misra-c-2012'; // 默认使用MISRA C:2012
            } else {
                std = cfg.get<string>('cppStd', 'c++17');
                reportType = 'misra-cpp-2023'; // 默认使用MISRA C++:2023
            }
        } else {
            // 手动指定报告类型
            reportType = cfgReportType;
            // 根据文件类型选择对应的标准
            if (doc.languageId === 'c') {
                std = cfg.get<string>('cStd', 'c99');
            } else {
                std = cfg.get<string>('cppStd', 'c++17');
            }
        }

        const cwd =
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ??
            path.dirname(filePath);

        // 构建cppcheck命令
        const cmd = [
            cppcheckPath,
            `--std=${std}`,
            '--enable=style,warning,performance',
            '--inconclusive',
            `--report-type=${reportType}`,
			'-j 4',
			'--suppress=missingIncludeSystem',
            '--template="{file}:{line}:{column}: warning: [{severity}][MISRA {id}] {message}"',
            `"${filePath}"`
        ].join(' ');

        const outputChannel = vscode.window.createOutputChannel('Cppcheck MISRA');
        outputChannel.clear();
        outputChannel.appendLine(`Running: ${cmd}`);
        outputChannel.show(true);

        exec(cmd, { cwd }, (error, _stdout, stderr) => {
            const output = stderr.toString();
            outputChannel.appendLine(output);

            const diagnostics: vscode.Diagnostic[] = [];
            const lines = output.split(/\r?\n/);

            for (const line of lines) {
                // 匹配: file:line:column: warning: message
                const m = line.match(/^(.*?):(\d+):(\d+):\s+warning:\s+(.*)$/);
                if (!m) continue;

                const [, file, lineStr, colStr, msg] = m;

                // 只关心当前文件
                if (path.resolve(file) !== path.resolve(filePath)) {
                    continue;
                }

                const lineNum = parseInt(lineStr, 10) - 1;
                const colNum = parseInt(colStr, 10) - 1;

                const range = new vscode.Range(
                    new vscode.Position(lineNum, colNum),
                    new vscode.Position(lineNum, colNum + 1)
                );

                // 根据 MISRA 行为级别决定 severity
                let severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Warning;

                if (msg.includes('[Mandatory]')) {
                    severity = toSeverity(mandatoryLevel);
                } else if (msg.includes('[Required]')) {
                    severity = toSeverity(requiredLevel);
                } else if (msg.includes('[Advisory]')) {
                    severity = toSeverity(advisoryLevel);
                }

                const diag = new vscode.Diagnostic(range, msg, severity);
                diagnostics.push(diag);
            }

            diagnosticCollection.set(doc.uri, diagnostics);

            vscode.window.setStatusBarMessage(
                `Cppcheck MISRA: ${diagnostics.length} issue(s)`,
                3000
            );
        });
    }

    /**
     * 手动命令：对当前活动文件运行 cppcheck MISRA
     */
    const runCommand = vscode.commands.registerCommand(
        'cppcheck-misra.run',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('Cppcheck MISRA: No active editor');
                return;
            }
            await runCppcheckMisraOnDocument(editor.document);
        }
    );
    context.subscriptions.push(runCommand);

    /**
     * 自动事件：保存 C/C++ 文件时运行
     */
    const onSave = vscode.workspace.onDidSaveTextDocument(async (doc) => {
        const enabled = config().get<boolean>('enableOnSave', true);
        if (!enabled) return;

        await runCppcheckMisraOnDocument(doc);
    });
    context.subscriptions.push(onSave);
}

export function deactivate() {}