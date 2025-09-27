# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive documentation structure
- 42+ format adapters
- AI-powered document processing
- Streaming support for large datasets
- Provenance tracking
- CLI interface
- Extensive test coverage

### Changed

- Initial release

### Fixed

- N/A

### Removed

- N/A

## [0.1.0] - 2024-01-01

### Added

- Core parsing and formatting functionality
- Zod schema validation
- Basic adapter system
- JSON, YAML, CSV adapters
- Unit test framework
- Basic documentation

### Changed

- N/A

### Fixed

- N/A

### Removed

- N/A

---

## Version History

### 0.1.0 (2024-01-01)

- **Initial Release**
- Core functionality with basic adapters
- Zod schema validation
- JSON, YAML, CSV support
- Basic test framework

### 0.2.0 (Planned)

- **AI Integration**
- Ollama-powered document processing
- AI adapters for DOCX, PPTX, XLSX
- Enhanced error handling
- Performance improvements

### 0.3.0 (Planned)

- **Advanced Features**
- Streaming support
- Provenance tracking
- CLI interface
- Extended adapter library

### 1.0.0 (Planned)

- **Production Ready**
- Complete adapter library (42+ formats)
- Comprehensive documentation
- Performance optimizations
- Security enhancements

---

## Migration Guides

### From 0.1.0 to 0.2.0

#### Breaking Changes

- None planned

#### New Features

- AI-powered adapters
- Enhanced error handling
- Performance improvements

#### Migration Steps

1. Update dependencies
2. Review new AI adapter options
3. Test error handling changes
4. Verify performance improvements

### From 0.2.0 to 0.3.0

#### Breaking Changes

- Streaming API changes
- Provenance format updates

#### New Features

- Streaming support
- Provenance tracking
- CLI interface

#### Migration Steps

1. Update streaming code
2. Review provenance format
3. Test CLI functionality
4. Update documentation

---

## Release Notes

### 0.1.0 Release Notes

**Release Date:** January 1, 2024

**Highlights:**

- First public release of ZTF
- Core parsing and formatting functionality
- Zod schema validation
- Basic adapter system
- JSON, YAML, CSV support

**New Features:**

- `parseFrom()` function for parsing data
- `formatTo()` function for formatting data
- `convert()` function for format conversion
- Basic adapter registry
- Zod schema validation
- JSON adapter
- YAML adapter
- CSV adapter

**Improvements:**

- Initial test framework
- Basic documentation
- Error handling
- Type safety with Zod

**Bug Fixes:**

- N/A (initial release)

**Breaking Changes:**

- N/A (initial release)

**Deprecations:**

- N/A (initial release)

**Security:**

- Input validation with Zod schemas
- Error handling to prevent information leakage

**Performance:**

- Optimized parsing for common formats
- Memory-efficient processing

**Documentation:**

- Basic API documentation
- Usage examples
- Installation guide

**Testing:**

- Unit tests for core functionality
- Adapter tests
- Integration tests

---

## Contributing

To contribute to this changelog:

1. Add your changes to the `[Unreleased]` section
2. Use the following format:
   - `### Added` - New features
   - `### Changed` - Changes to existing functionality
   - `### Fixed` - Bug fixes
   - `### Removed` - Removed features
3. Include a brief description of each change
4. Reference related issues or PRs when applicable

## Changelog Format

```markdown
## [Version] - YYYY-MM-DD

### Added

- New features

### Changed

- Changes to existing functionality

### Fixed

- Bug fixes

### Removed

- Removed features

### Security

- Security-related changes

### Performance

- Performance improvements

### Documentation

- Documentation updates

### Testing

- Test-related changes
```

---

**For more information, see [Contributing Guide](docs/contributing/README.md)**


