#!/bin/bash

# k6 Installation Script for macOS
# Run this script: bash install-k6.sh

set -e  # Exit on error

ARCH=$(uname -m)
echo "🔍 Detected architecture: $ARCH"

# Method 1: Try Homebrew first (easiest)
if command -v brew &> /dev/null; then
    echo "🍺 Homebrew detected. Installing k6 via Homebrew..."
    brew install k6
    echo "✅ Installation complete! Verifying..."
    k6 version
    exit 0
fi

# Method 2: Manual installation
echo "📥 Homebrew not found. Using manual installation..."

if [ "$ARCH" = "arm64" ]; then
    # Apple Silicon
    echo "📥 Downloading k6 for Apple Silicon (arm64)..."
    # Get latest version from GitHub API
    LATEST_VERSION=$(curl -s https://api.github.com/repos/grafana/k6/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    
    if [ -z "$LATEST_VERSION" ]; then
        echo "❌ Could not fetch latest version. Using v0.48.0..."
        LATEST_VERSION="v0.48.0"
    fi
    
    echo "📦 Using version: $LATEST_VERSION"
    DOWNLOAD_URL="https://github.com/grafana/k6/releases/download/${LATEST_VERSION}/k6-${LATEST_VERSION#v}-darwin-arm64.tar.gz"
    
    echo "🔗 Download URL: $DOWNLOAD_URL"
    curl -L "$DOWNLOAD_URL" -o k6.tar.gz
    
    # Check if download was successful (file should be > 1MB)
    if [ ! -f k6.tar.gz ] || [ $(stat -f%z k6.tar.gz 2>/dev/null || stat -c%s k6.tar.gz 2>/dev/null || echo 0) -lt 1000000 ]; then
        echo "❌ Download failed or file too small. Trying alternative URL..."
        rm -f k6.tar.gz
        # Try without version prefix
        curl -L "https://github.com/grafana/k6/releases/download/${LATEST_VERSION}/k6-${LATEST_VERSION#v}-darwin-arm64.tar.gz" -o k6.tar.gz
    fi
    
    echo "📦 Extracting..."
    tar -xzf k6.tar.gz
    
    echo "📁 Moving k6 to /usr/local/bin (requires sudo password)..."
    sudo mv k6-${LATEST_VERSION#v}-darwin-arm64/k6 /usr/local/bin/k6
    
    echo "🧹 Cleaning up..."
    rm -rf k6.tar.gz k6-${LATEST_VERSION#v}-darwin-arm64
else
    # Intel Mac
    echo "📥 Downloading k6 for Intel Mac (amd64)..."
    LATEST_VERSION=$(curl -s https://api.github.com/repos/grafana/k6/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    
    if [ -z "$LATEST_VERSION" ]; then
        LATEST_VERSION="v0.48.0"
    fi
    
    DOWNLOAD_URL="https://github.com/grafana/k6/releases/download/${LATEST_VERSION}/k6-${LATEST_VERSION#v}-darwin-amd64.tar.gz"
    curl -L "$DOWNLOAD_URL" -o k6.tar.gz
    tar -xzf k6.tar.gz
    sudo mv k6-${LATEST_VERSION#v}-darwin-amd64/k6 /usr/local/bin/k6
    rm -rf k6.tar.gz k6-${LATEST_VERSION#v}-darwin-amd64
fi

echo "✅ Installation complete! Verifying..."
k6 version

