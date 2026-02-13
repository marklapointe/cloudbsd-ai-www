#!/bin/sh

# Detect the platform
OS=$(uname -s)

if [ "$OS" = "FreeBSD" ]; then
    # On FreeBSD, use the native make
    exec make "$@"
else
    # On non-FreeBSD systems, use bmake
    # Check if bmake is installed, if not fall back to make but warn
    if command -v bmake >/dev/null 2>&1; then
        exec bmake "$@"
    else
        exec make "$@"
    fi
fi
