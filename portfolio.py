#!/usr/bin/env python3
"""
LYRA Portfolio Dashboard

Manage audit status across multiple projects from one terminal.

Setup:
  Create a file at ~/.lyra/portfolio.json listing your projects:

  {
    "projects": [
      {"name": "relevnt", "path": "/Users/you/Desktop/relevnt"},
      {"name": "codra", "path": "/Users/you/Desktop/codra"},
      {"name": "ready", "path": "/Users/you/Desktop/ready"}
    ]
  }

Usage:
  python3 portfolio.py                # Dashboard across all projects
  python3 portfolio.py blockers       # Show blockers across all projects
  python3 portfolio.py next           # What to work on next (picks the highest-value item globally)
  python3 portfolio.py <project>      # Jump into one project's session runner
"""

import json
import os
import sys
import subprocess
from pathlib import Path

PORTFOLIO_CONFIG = os.path.expanduser("~/.lyra/portfolio.json")

PRIORITY_ORDER = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
SEVERITY_ORDER = {"blocker": 0, "major": 1, "minor": 2, "nit": 3}


def load_portfolio():
    if not os.path.exists(PORTFOLIO_CONFIG):
        print(f"Portfolio config not found at {PORTFOLIO_CONFIG}")
        print()
        print("Create it:")
        print(f"  mkdir -p ~/.lyra")
        print(f'  cat > {PORTFOLIO_CONFIG} << \'EOF\'')
        print('  {')
        print('    "projects": [')
        print('      {"name": "relevnt", "path": "/Users/you/Desktop/relevnt"},')
        print('      {"name": "codra", "path": "/Users/you/Desktop/codra"}')
        print('    ]')
        print('  }')
        print("  EOF")
        sys.exit(1)

    with open(PORTFOLIO_CONFIG) as f:
        return json.load(f)


def load_project_findings(project):
    """Load findings for one project."""
    findings_path = os.path.join(project["path"], "audits", "open_findings.json")
    if not os.path.exists(findings_path):
        return []

    with open(findings_path) as f:
        data = json.load(f)

    return data.get("open_findings", data.get("findings", []))


def load_project_expectations(project):
    """Load expectations rule counts."""
    exp_path = os.path.join(project["path"], "audits", "expectations.md")
    if not os.path.exists(exp_path):
        return None

    with open(exp_path) as f:
        text = f.read()

    import re
    critical = len(re.findall(r"[Ff]ile `critical`", text))
    warning = len(re.findall(r"[Ff]ile `warning`", text))
    return {"critical": critical, "warning": warning}


def sort_key(item):
    f = item["finding"]
    fix = f.get("suggested_fix", {}) if isinstance(f.get("suggested_fix"), dict) else {}
    return (
        PRIORITY_ORDER.get(f.get("priority", "P3"), 9),
        SEVERITY_ORDER.get(f.get("severity", "nit"), 9),
    )


def cmd_dashboard():
    portfolio = load_portfolio()
    projects = portfolio.get("projects", [])

    print("LYRA Portfolio Dashboard")
    print("=" * 70)
    print()
    print(f"{'Project':<20} {'Findings':>8} {'Blockers':>8} {'P0/P1':>8} {'Questions':>8} {'Ship?':>6}")
    print("-" * 70)

    total_findings = 0
    total_blockers = 0
    shippable = 0

    for proj in projects:
        findings = load_project_findings(proj)
        name = proj["name"]

        if not findings:
            print(f"{name:<20} {'--':>8} {'--':>8} {'--':>8} {'--':>8} {'--':>6}")
            continue

        actionable = [f for f in findings if f.get("status") in ("open", "accepted", "in_progress")]
        blockers = [f for f in actionable if f.get("severity") == "blocker"]
        p0p1 = [f for f in actionable if f.get("priority") in ("P0", "P1")]
        questions = [f for f in actionable if f.get("type") == "question"]
        can_ship = len(blockers) == 0 and len(questions) == 0

        total_findings += len(findings)
        total_blockers += len(blockers)
        if can_ship:
            shippable += 1

        ship_str = "YES" if can_ship else "NO"
        print(f"{name:<20} {len(findings):>8} {len(blockers):>8} {len(p0p1):>8} {len(questions):>8} {ship_str:>6}")

    print("-" * 70)
    print(f"{'TOTAL':<20} {total_findings:>8} {total_blockers:>8} {'':>8} {'':>8} {f'{shippable}/{len(projects)}':>6}")
    print()

    if total_blockers > 0:
        print(f"!! {total_blockers} blockers across portfolio. Run 'python3 portfolio.py blockers' for details.")
    else:
        print("No blockers across portfolio.")


def cmd_blockers():
    portfolio = load_portfolio()
    projects = portfolio.get("projects", [])

    print("LYRA Portfolio -- All Blockers")
    print("=" * 70)
    print()

    total = 0
    for proj in projects:
        findings = load_project_findings(proj)
        blockers = [f for f in findings
                     if f.get("severity") == "blocker"
                     and f.get("status") in ("open", "accepted", "in_progress")]

        if blockers:
            print(f"[{proj['name']}]")
            for b in blockers:
                effort = ""
                fix = b.get("suggested_fix", {})
                if isinstance(fix, dict):
                    effort = fix.get("estimated_effort", "?")
                print(f"  {b.get('priority','?')} {b['finding_id']}")
                print(f"    {b.get('title', '?')}")
                print(f"    Effort: {effort}")
                files = fix.get("affected_files", []) if isinstance(fix, dict) else []
                if files:
                    print(f"    File: {files[0]}")
                print()
            total += len(blockers)

    if total == 0:
        print("No blockers. All projects are clear.")
    else:
        print(f"Total: {total} blockers across portfolio.")


def cmd_next():
    portfolio = load_portfolio()
    projects = portfolio.get("projects", [])

    all_items = []
    for proj in projects:
        findings = load_project_findings(proj)
        for f in findings:
            if f.get("status") in ("open", "accepted"):
                all_items.append({"project": proj["name"], "path": proj["path"], "finding": f})

    if not all_items:
        print("Nothing to do across any project. Ship everything.")
        return

    all_items.sort(key=sort_key)
    top = all_items[0]
    f = top["finding"]
    fix = f.get("suggested_fix", {}) if isinstance(f.get("suggested_fix"), dict) else {}

    print("LYRA Portfolio -- What To Do Next")
    print("=" * 50)
    print()
    print(f"Project:  {top['project']}")
    print(f"Finding:  {f['finding_id']}")
    print(f"Title:    {f.get('title', '?')}")
    print(f"Severity: {f.get('severity', '?')} | Priority: {f.get('priority', '?')}")
    print(f"Effort:   {fix.get('estimated_effort', '?')}")
    print(f"Type:     {f.get('type', '?')}")
    print()

    if f.get("type") == "question":
        print("This is a QUESTION. Make a decision:")
        if fix.get("approach"):
            print(f"  Options: {fix['approach'][:150]}")
        print()
        print(f"  cd {top['path']}")
        print(f"  python3 audits/session.py decide {f['finding_id']} 'your decision'")
    else:
        if fix.get("approach"):
            print(f"Fix: {fix['approach'][:150]}")
        files = fix.get("affected_files", [])
        if files:
            print(f"File: {files[0]}")
        print()
        print(f"  cd {top['path']}")
        print(f"  python3 audits/session.py fix {f['finding_id']}")


def cmd_project(project_name):
    portfolio = load_portfolio()
    projects = portfolio.get("projects", [])

    proj = None
    for p in projects:
        if p["name"].lower() == project_name.lower():
            proj = p
            break

    if not proj:
        names = [p["name"] for p in projects]
        print(f"Project '{project_name}' not found. Available: {', '.join(names)}")
        sys.exit(1)

    session_path = os.path.join(proj["path"], "audits", "session.py")
    if not os.path.exists(session_path):
        print(f"No session.py found at {session_path}. Install LYRA in this project first.")
        sys.exit(1)

    os.chdir(proj["path"])
    os.execvp(sys.executable, [sys.executable, session_path] + sys.argv[2:])


def main():
    if len(sys.argv) < 2:
        cmd_dashboard()
        return

    cmd = sys.argv[1].lower()

    if cmd == "blockers":
        cmd_blockers()
    elif cmd == "next":
        cmd_next()
    elif cmd in ("help", "--help", "-h"):
        print(__doc__)
    else:
        # Treat as project name
        cmd_project(sys.argv[1])


if __name__ == "__main__":
    main()
