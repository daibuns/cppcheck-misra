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

        const enable = cfg.get<string>('enable', 'all');
        const checkLevel = cfg.get<string>('checkLevel', 'exhaustive');
        const platform = cfg.get<string>('platform', 'unix32');
        const force = cfg.get<boolean>('force', true);
        const maxConfigs = cfg.get<number>('maxConfigs', 64);
        const safety = cfg.get<boolean>('safety', true);
        const jobs = cfg.get<number>('jobs', 4);
        const suppressMissingIncludeSystem = cfg.get<boolean>('suppressMissingIncludeSystem', true);

        const filePath = doc.fileName;

        // 根据文件类型选择标准和报告类型
        let std: string;
        let reportType: string;

        // 选择 report-type：
        // 默认：C => misra-c-2012, C++ => misra-cpp-2023（无自定义 auto 语义）
        // 用户可分别用 cReportType / cppReportType 覆盖
        const cfgCReportType = cfg.get<string>('cReportType', 'misra-c-2012');
        const cfgCppReportType = cfg.get<string>('cppReportType', 'misra-cpp-2023');

        if (doc.languageId === 'c') {
            std = cfg.get<string>('cStd', 'c99');
            reportType = cfgCReportType || 'misra-c-2012';
        } else {
            std = cfg.get<string>('cppStd', 'c++17');
            reportType = cfgCppReportType || 'misra-cpp-2023';
        }

        const cwd =
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ??
            path.dirname(filePath);

        // 构建 cppcheck 命令（尽可能严格）
        // 关键点（来自 cppcheck --help）：
        //  - --enable=all + --inconclusive：最大化覆盖面（可能有误报）
        //  - --check-level=<level>：更深的 valueflow（默认 exhaustive）
        //  - -f / --force：强制检查尽可能多的预处理配置
        //  - --max-configs=<n>：提升配置上限（避免因为配置过多被跳过）
        //  - --safety：更严格的关键错误处理与汇总
        //  - --report-type：MISRA 规则分类输出（C:2012 / C++:2023）
        const cmdParts: string[] = [
            cppcheckPath,
            `--std=${std}`,
            `--platform=${platform}`,
            `--enable=${enable}`,
            '--inconclusive',
            `--check-level=${checkLevel}`,
            `--max-configs=${maxConfigs}`,
            `-j ${jobs}`,
            `--report-type=${reportType}`,
            // 注意：cppcheck 的 --template 不一定支持 {reportType} 占位符（某些版本会原样输出）
            // 因此这里不依赖 {reportType}，改为在扩展侧注入 reportType 标签
            '--template="{file}:{line}:{column}: warning: [{severity}][MISRA {id}] {message}"',
            `"${filePath}"`
        ];

        if (force) {
            cmdParts.splice(5, 0, '--force');
        }
        if (safety) {
            cmdParts.splice(5 + (force ? 1 : 0), 0, '--safety');
        }
        if (suppressMissingIncludeSystem) {
            cmdParts.splice(cmdParts.length - 2, 0, '--suppress=missingIncludeSystem');
        }

        const cmd = cmdParts.join(' ');

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
                if (!m) {
                    continue;
                }

                const [, file, lineStr, colStr, msg0] = m;

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

                // 注入并展示当前 reportType（区分 Rules / Dir）
                // 兼容两种输入：
                //  1) 旧输出/当前模板: [severity][MISRA <id>] ...
                //  2) 万一未来 cppcheck 支持: [severity][<reportType>][MISRA <id>] ...
                let msg = msg0;
                const rt = msg.match(/\[[^\]]*\]\[([^\]]+)\]\[MISRA\s+[^\]]+\]/)?.[1];
                const usedReportType = rt || reportType;

                // 根据 MISRA 行为级别决定 severity
                let severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Warning;

                if (msg.includes('[Mandatory]')) {
                    severity = toSeverity(mandatoryLevel);
                } else if (msg.includes('[Required]')) {
                    severity = toSeverity(requiredLevel);
                } else if (msg.includes('[Advisory]')) {
                    severity = toSeverity(advisoryLevel);
                }

                // 若消息里没有 reportType，则在 [MISRA ...] 前补一个 [<reportType>] 标签
                if (!rt) {
                    msg = msg.replace(/\]\[MISRA /, `][${usedReportType}][MISRA `);
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
        if (!enabled) {
            return;
        }

        await runCppcheckMisraOnDocument(doc);
    });
    context.subscriptions.push(onSave);
}

export function deactivate() {}