#!/bin/bash
# LYRA Portfolio Bootstrap
#
# Sets up LYRA + expectations across all projects in one shot.
#
# Prerequisites:
#   - lyra-starter-v1.1.zip already unzipped somewhere (LYRA_STARTER_DIR)
#   - Expectations files available (EXPECTATIONS_DIR)
#   - portfolio.json configured (~/.lyra/portfolio.json)
#
# Usage:
#   bash bootstrap_portfolio.sh <path-to-lyra-starter> <path-to-expectations-dir>
#
# Example:
#   bash bootstrap_portfolio.sh ~/Desktop/lyra-starter ~/Desktop/expectations

set -e

if [ "$#" -lt 2 ]; then
    echo "Usage: bash bootstrap_portfolio.sh <lyra-starter-dir> <expectations-dir>"
    echo ""
    echo "  lyra-starter-dir:  Directory containing the LYRA audits/ starter kit"
    echo "  expectations-dir:  Directory containing *-expectations.md files"
    exit 1
fi

LYRA_STARTER="$1"
EXPECTATIONS_DIR="$2"
PORTFOLIO_CONFIG="$HOME/.lyra/portfolio.json"

if [ ! -d "$LYRA_STARTER/audits" ]; then
    echo "ERROR: $LYRA_STARTER/audits not found. Point to the unzipped lyra-starter directory."
    exit 1
fi

if [ ! -d "$EXPECTATIONS_DIR" ]; then
    echo "ERROR: $EXPECTATIONS_DIR not found."
    exit 1
fi

if [ ! -f "$PORTFOLIO_CONFIG" ]; then
    echo "ERROR: $PORTFOLIO_CONFIG not found."
    echo "Create it first. See portfolio.py for the format."
    exit 1
fi

# Read project paths from portfolio.json
PROJECTS=$(python3 -c "
import json
with open('$PORTFOLIO_CONFIG') as f:
    data = json.load(f)
for p in data['projects']:
    print(p['name'] + '|' + p['path'])
")

echo "LYRA Portfolio Bootstrap"
echo "========================"
echo ""

while IFS='|' read -r NAME PROJECT_PATH; do
    echo "--- $NAME ($PROJECT_PATH) ---"

    if [ ! -d "$PROJECT_PATH" ]; then
        echo "  SKIP: directory not found"
        echo ""
        continue
    fi

    # Check if LYRA already installed
    if [ -d "$PROJECT_PATH/audits/prompts" ]; then
        echo "  LYRA already installed."
    else
        # Copy starter kit
        echo "  Installing LYRA starter kit..."
        cp -r "$LYRA_STARTER/audits" "$PROJECT_PATH/audits"
        echo "  Done."
    fi

    # Find matching expectations file
    EXP_FILE="$EXPECTATIONS_DIR/${NAME}-expectations.md"
    if [ ! -f "$EXP_FILE" ]; then
        # Try without hyphens
        EXP_FILE=$(find "$EXPECTATIONS_DIR" -name "*${NAME}*expectations*" -type f | head -1)
    fi

    if [ -n "$EXP_FILE" ] && [ -f "$EXP_FILE" ]; then
        echo "  Installing expectations from: $(basename "$EXP_FILE")"
        cp "$EXP_FILE" "$PROJECT_PATH/audits/expectations.md"

        # Generate project.json
        python3 -c "
import json, re
with open('$EXP_FILE') as f:
    text = f.read()
critical = len(re.findall(r'[Ff]ile \`critical\`', text))
warning = len(re.findall(r'[Ff]ile \`warning\`', text))
suggestion = len(re.findall(r'[Ff]ile \`suggestion\`', text))
project = {
    'project_name': '$NAME',
    'expectations_path': 'audits/expectations.md',
    'rule_counts': {'critical': critical, 'warning': warning, 'suggestion': suggestion}
}
with open('$PROJECT_PATH/audits/project.json', 'w') as f:
    json.dump(project, f, indent=2)
    f.write('\n')
print(f'  Rules: {critical} critical, {warning} warning, {suggestion} suggestion')
"
    else
        echo "  No expectations file found for $NAME"
    fi

    # Install Cursor rule
    mkdir -p "$PROJECT_PATH/.cursor/rules"
    if [ -f "cursor-rules/expectations.mdc" ]; then
        cp "cursor-rules/expectations.mdc" "$PROJECT_PATH/.cursor/rules/"
        echo "  Cursor expectations rule installed."
    fi

    echo ""
done <<< "$PROJECTS"

echo "Bootstrap complete."
echo ""
echo "Next steps:"
echo "  1. Fix project paths in $PORTFOLIO_CONFIG if any were wrong"
echo "  2. Run: python3 portfolio.py  (to see the portfolio dashboard)"
echo "  3. cd into any project and run: python3 audits/session.py"
