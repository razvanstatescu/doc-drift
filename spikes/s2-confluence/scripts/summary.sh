#!/bin/bash
# Summarise spike S2 browser-check evidence from forge logs (run after Razvan views the pages).
cd "$(dirname "$0")/.."
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null
forge logs -e development -n 500 -s "${1:-1d}" 2>&1 | python3 "$(pwd)/scripts/summary.py"
