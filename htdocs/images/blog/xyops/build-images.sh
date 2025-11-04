#!/usr/bin/env bash

canvas-plus *.png --filter "resize/width:33.33333%" --filter "write/format:webp/quality:90" --append "@1x"
canvas-plus *.png --filter "resize/width:66.66666%" --filter "write/format:webp/quality:90" --append "@2x"
