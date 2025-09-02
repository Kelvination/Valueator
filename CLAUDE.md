# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development and Building
- `pnpm dev` - Start development server with Vite HMR
- `pnpm build` - Build for production using Vite
- `pnpm preview` - Preview production build locally
- `pnpm lint` - Run ESLint for code quality checks

### Project Setup
Uses Vite with React and ESLint. Package manager: pnpm (not npm).

## Project Architecture

### Core Application Structure
This is "Valueator" - a professional value study tool for artists built with React and WebGL.

**Main Components:**
- `App.jsx` - Main application with image processing, level controls, and WebGL shader integration
- `HSVColorPickerModal.jsx` - Custom HSV color picker for level color customization
- `utils.js` - Color conversion utilities (HSV/RGB)

**Key Architecture Features:**
- **WebGL Shader Processing** using `gl-react` and `gl-react-dom` for real-time image value separation
- **Custom GLSL Fragment Shader** that converts images to grayscale and applies value level thresholds
- **HSV Color System** for artist-friendly color manipulation
- **LocalStorage Persistence** for recent images and user preferences
- **Responsive Design** with mobile and desktop layouts

### Core Functionality
- **Value Level Separation**: Divides images into 2-11 grayscale levels using customizable thresholds
- **Custom Shader System**: GLSL fragment shader processes images in real-time with WebGL
- **Color Customization**: Each value level can have custom HSV colors via color picker
- **Image Management**: Recent images stored in browser localStorage
- **Export Capability**: Save processed images as PNG files

### State Management Pattern
Uses React hooks with complex state for:
- Image processing (dimensions, URI, loaded state)
- Level configuration (count, ranges, colors)
- UI state (modals, sliders, editing modes)
- Recent images management

### Styling Approach
- CSS modules with professional dark theme
- Artist-focused design with glassmorphism effects
- Custom slider styling and interactive elements
- Responsive breakpoints for mobile/desktop

### Key Dependencies
- `gl-react`/`gl-react-dom` - WebGL rendering
- `react-icons` - Icon system
- `file-saver` - Image export functionality
- `react-color` - Color picker components

## Important Implementation Notes

### WebGL Shader Architecture
The core image processing uses a custom GLSL fragment shader that:
- Takes grayscale input and applies threshold-based level separation
- Supports up to 11 levels with 10 configurable thresholds
- Allows custom RGB colors for each level
- Processes images in real-time on GPU

### Color System
- Internally uses HSV (0-1 range) for artist-friendly manipulation
- Converts to RGB for WebGL shaders and CSS display
- Provides utilities in `utils.js` for color space conversion

### Performance Considerations
- WebGL rendering for real-time image processing
- LocalStorage for image persistence (may have size limits)
- Image loading handled asynchronously with proper error states