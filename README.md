# cppcheck-misra Extension

A VS Code extension that runs cppcheck with multi-MISRA standard compliance checking (MISRA C:2012, MISRA C:2023, MISRA C++:2008, MISRA C++:2023) on C/C++ files. Automatically detects file type and applies appropriate MISRA rules.

## Features

- **Multi-MISRA Support**: Comprehensive support for MISRA C:2012, MISRA C:2023, MISRA C++:2008, and MISRA C++:2023
- **Smart Language Detection**: Automatically selects appropriate MISRA standard based on file type (C → MISRA C, C++ → MISRA C++)
- **Automatic checking**: Runs cppcheck MISRA analysis automatically when saving C/C++ files
- **Visual diagnostics**: Displays MISRA violations as errors, warnings, or informational messages based on MISRA compliance levels
- **Manual execution**: Can be triggered manually via command palette
- **Configurable**: Customize cppcheck path, language standards, MISRA report types, and enable/disable auto-checking
- **Performance optimized**: Parallel processing for faster analysis
- **Reduced noise**: Automatic suppression of common false positives

### Supported MISRA Compliance Levels

- **Mandatory** violations → Error (red underline)
- **Required** violations → Warning (yellow underline)  
- **Advisory** violations → Information (blue/gray underline)

### Supported Language Standards
- **C standards**: c89, c99, c11 (default: c99)
- **C++ standards**: c++03, c++11, c++14, c++17, c++20 (default: c++17)

## Requirements

- [cppcheck](https://cppcheck.sourceforge.io/) must be installed and available in your system PATH
- Alternatively, you can specify the full path to cppcheck in the extension settings

To install cppcheck:
- **Windows**: Download from [cppcheck website](https://cppcheck.sourceforge.io/) or use package managers like chocolatey
- **macOS**: `brew install cppcheck`
- **Linux**: `sudo apt-get install cppcheck` (Ubuntu/Debian) or use your distribution's package manager
## Extension Settings

This extension contributes the following settings:

* `cppcheck-misra.cppcheckPath`: Path to cppcheck executable (default: "cppcheck")
* `cppcheck-misra.enableOnSave`: Enable/disable automatic checking on file save (default: true)
* `cppcheck-misra.cStd`: C language standard for C files (options: c89, c99, c11; default: "c99")
* `cppcheck-misra.cppStd`: C++ language standard for C++ files (options: c++03, c++11, c++14, c++17, c++20; default: "c++17")
* `cppcheck-misra.reportType`: MISRA report type (options: auto, misra-c-2012, misra-c-2023, misra-cpp-2008, misra-cpp-2023; default: "auto")
  - **auto**: Automatically detect based on file type (C → MISRA C, C++ → MISRA C++)
  - **misra-c-2012**: Force MISRA C:2012 rules
  - **misra-c-2023**: Force MISRA C:2023 rules  
  - **misra-cpp-2008**: Force MISRA C++:2008 rules
  - **misra-cpp-2023**: Force MISRA C++:2023 rules
* `cppcheck-misra.severityMapping.mandatory`: Diagnostic severity for MISRA Mandatory violations (options: error, warning, information, hint; default: "error")
* `cppcheck-misra.severityMapping.required`: Diagnostic severity for MISRA Required violations (options: error, warning, information, hint; default: "warning")
* `cppcheck-misra.severityMapping.advisory`: Diagnostic severity for MISRA Advisory violations (options: error, warning, information, hint; default: "information")

## Usage

### Automatic Checking
1. Open a C or C++ file
2. Save the file (Ctrl+S / Cmd+S)
3. The extension will automatically run cppcheck MISRA analysis
4. Violations will be displayed as editor diagnostics with appropriate severity levels

### Manual Execution
1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Cppcheck MISRA: Run on current file"
3. Select the command to run cppcheck on the current file

## Known Issues

- The extension requires cppcheck to be installed separately
- File must be saved to disk before checking (unsaved changes are not analyzed)
- Currently only supports single file analysis

## Release Notes

### 0.1.0

Major update with enhanced MISRA support:
- Added support for MISRA C:2023, MISRA C++:2008, and MISRA C++:2023 standards
- Smart automatic language detection (C → MISRA C, C++ → MISRA C++)
- Configurable C++ language standards (c++03 to c++20)
- Flexible report type configuration with auto-detection mode

### 0.0.1

Initial release of cppcheck-misra extension:
- Automatic MISRA C 2012 checking on file save
- Manual execution via command palette
- Configurable cppcheck path and auto-check behavior
- Visual diagnostics with MISRA compliance level-based severity

---

**Enjoy using cppcheck-misra!**
