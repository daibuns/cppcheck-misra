# Change Log

All notable changes to the "cppcheck-misra" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.0] - 2025-01-10

### Added
- **Multi-MISRA standard support**: Added support for MISRA C:2023, MISRA C++:2008, and MISRA C++:2023
- **C++ language standards**: Added configuration for C++ standards (c++03, c++11, c++14, c++17, c++20)
- **Smart language detection**: Automatic selection of appropriate MISRA standard based on file type
- **Flexible report types**: Configurable report type with auto-detection mode
- **Enhanced configuration**: Separate C and C++ standard configuration options

### Changed
- **Updated description**: Reflects new multi-MISRA support capabilities
- **Version bump**: From 0.0.1 to 0.1.0 to indicate feature enhancement

## [0.0.1] - 2024-12-03

### Added
- Initial release of cppcheck-misra VS Code extension
- Automatic cppcheck MISRA C 2012 analysis on file save for C/C++ files
- Manual run command via "Cppcheck MISRA: Run on current file"
- Configuration options for cppcheck executable path and on-save behavior
- MISRA compliance level detection (Mandatory → Error, Required → Warning, Advisory → Information)
- Diagnostic reporting in VS Code Problems panel
- Output channel for cppcheck command and results debugging
- Customizable severity mapping for MISRA compliance levels (mandatory, required, advisory)
- C language standard configuration option (c89, c99, c11)
- Enhanced configuration flexibility allowing per-violation-type severity customization

### Changed
- **Performance optimization**: Added `-j 4` parameter for parallel processing to accelerate cppcheck analysis
- **Reduced noise**: Added `--suppress=missingIncludeSystem` to suppress missing system header warnings
- **Improved output parsing**: Enhanced command template format for better diagnostic message parsing