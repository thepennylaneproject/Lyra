#!/usr/bin/env python3
"""
LYRA Batch Fixer

Reads open findings, constructs a fix prompt for each, submits them all to
the Anthropic Message Batches API at 50% cost, then writes patch files
you can review and apply.

Setup:
  export ANTHROPIC_API_KEY="your-anthropic-api-key-here"

Usage:
  python3 batch_fix.py plan                    # Show what would be batched (dry run)
  python3 batch_fix.py submit                  # Submit batch to Anthropic
  python3 batch_fix.py status <batch_id>       # Check batch status
  python3 batch_fix.py results <batch_id>      # Download results and write patches
  python3 batch_fix.py apply <finding_id>      # Apply one patch (after review)
  python3 batch_fix.py apply-all               # Apply all patches (after review)

Cost savings:
  Standard API: ~$0.003/1K input + $0.015/1K output (Sonnet)
  Batch API:    ~$0.0015/1K input + $0.0075/1K output (50% off)
  30 findings x ~4K tokens each = ~$0.90 standard vs ~$0.45 batch

Options:
  --model MODEL          Model to use (default: claude-sonnet-4-5-20250514)
  --max-findings N       Limit batch size (default: all actionable)
  --filter-severity S    Only fix findings at this severity or above
  --filter-priority P    Only fix findings at this priority or above
  --include-types T      Comma-separated types to include (default: bug,debt)
  --expectations PATH    Path to expectations doc (injected into each prompt)
"""

import json
import os
import sys
import urllib.request
import urllib.error
import time
import hashlib
from datetime import datetime, timezone
from pathlib import Path

# --- Config ---

API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
API_BASE = "https://api.anthropic.com/v1"
DEFAULT_MODEL = "claude-sonnet-4-5-20250514"

OPEN_FINDINGS = "audits/open_findings.json"
EXPECTATIONS = "audits/expectations.md"
PATCHES_DIR = "audits/patches"
BATCH_LOG = "audits/batch_log.json"

NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
TODAY = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")

SEVERITY_ORDER = {"blocker": 0, "major": 1, "minor": 2, "nit": 3}
PRIORITY_ORDER = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}


# --- Parse CLI args ---

def parse_args():
    args = {
        "command": sys.argv[1] if len(sys.argv) > 1 else "help",
        "batch_id": sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] in ("status", "results") else None,
        "finding_id": sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == "apply" else None,
        "model": DEFAULT_MODEL,
        "max_findings": None,
        "filter_severity": None,
        "filter_priority": None,
        "include_types": ["bug", "debt"],
        "expectations_path": EXPECTATIONS,
    }

    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--model" and i + 1 < len(sys.argv):
            args["model"] = sys.argv[i + 1]; i += 2
        elif sys.argv[i] == "--max-findings" and i + 1 < len(sys.argv):
            args["max_findings"] = int(sys.argv[i + 1]); i += 2
        elif sys.argv[i] == "--filter-severity" and i + 1 < len(sys.argv):
            args["filter_severity"] = sys.argv[i + 1]; i += 2
        elif sys.argv[i] == "--filter-priority" and i + 1 < len(sys.argv):
            args["filter_priority"] = sys.argv[i + 1]; i += 2
        elif sys.argv[i] == "--include-types" and i + 1 < len(sys.argv):
            args["include_types"] = sys.argv[i + 1].split(","); i += 2
        elif sys.argv[i] == "--expectations" and i + 1 < len(sys.argv):
            args["expectations_path"] = sys.argv[i + 1]; i += 2
        else:
            i += 1

    return args


# --- API helpers ---

def api_request(method, path, data=None):
    if not API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set.")
        sys.exit(1)

    url = f"{API_BASE}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method, headers={
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    })

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"API error ({e.code}): {body[:500]}")
        sys.exit(1)


def api_get_stream(url):
    """Get raw response body (for JSONL results)."""
    req = urllib.request.Request(url, headers={
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
    })
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode()


# --- Data helpers ---

def load_findings():
    if not os.path.exists(OPEN_FINDINGS):
        print(f"ERROR: {OPEN_FINDINGS} not found.")
        sys.exit(1)
    with open(OPEN_FINDINGS) as f:
        data = json.load(f)
    return data.get("open_findings", data.get("findings", []))


def read_file_safe(path, max_lines=300):
    """Read a source file, truncating to max_lines."""
    if not os.path.exists(path):
        return None
    with open(path) as f:
        lines = f.readlines()
    if len(lines) > max_lines:
        return "".join(lines[:max_lines]) + f"\n\n[...truncated at {max_lines} lines, {len(lines)} total]"
    return "".join(lines)


def load_expectations(path):
    if os.path.exists(path):
        with open(path) as f:
            return f.read()
    return None


def filter_findings(findings, args):
    """Filter and sort findings for batching."""
    filtered = []
    for f in findings:
        # Only actionable findings
        if f.get("status") not in ("open", "accepted"):
            continue
        # Type filter
        if f.get("type") not in args["include_types"]:
            continue
        # Severity filter
        if args["filter_severity"]:
            threshold = SEVERITY_ORDER.get(args["filter_severity"], 9)
            if SEVERITY_ORDER.get(f.get("severity", "nit"), 9) > threshold:
                continue
        # Priority filter
        if args["filter_priority"]:
            threshold = PRIORITY_ORDER.get(args["filter_priority"], 9)
            if PRIORITY_ORDER.get(f.get("priority", "P3"), 9) > threshold:
                continue
        filtered.append(f)

    # Sort by priority then severity
    filtered.sort(key=lambda f: (
        PRIORITY_ORDER.get(f.get("priority", "P3"), 9),
        SEVERITY_ORDER.get(f.get("severity", "nit"), 9),
    ))

    if args["max_findings"]:
        filtered = filtered[:args["max_findings"]]

    return filtered


def build_fix_prompt(finding, expectations_text=None):
    """Build a fix prompt for one finding."""
    fix = finding.get("suggested_fix", {}) if isinstance(finding.get("suggested_fix"), dict) else {}
    affected_files = fix.get("affected_files", [])

    # Read source files
    file_contents = {}
    for fpath in affected_files:
        content = read_file_safe(fpath)
        if content:
            file_contents[fpath] = content

    # Build prompt
    parts = []

    parts.append("You are a code fixer. Produce ONLY a JSON object with the patches needed. No commentary.")
    parts.append("")

    if expectations_text:
        parts.append("## Project constraints (do not violate these)")
        parts.append(expectations_text[:2000])  # Truncate to save tokens
        parts.append("")

    parts.append("## Finding to fix")
    parts.append(f"ID: {finding.get('finding_id', '?')}")
    parts.append(f"Type: {finding.get('type', '?')}")
    parts.append(f"Severity: {finding.get('severity', '?')}")
    parts.append(f"Title: {finding.get('title', '?')}")
    parts.append(f"Description: {finding.get('description', '?')}")
    parts.append("")

    # Proof hooks
    hooks = finding.get("proof_hooks", [])
    if hooks:
        parts.append("## Proof hooks")
        for h in hooks:
            hook_type = h.get("hook_type", h.get("type", "?"))
            summary = h.get("summary", h.get("value", ""))
            parts.append(f"- [{hook_type}] {summary}")
            if h.get("file"):
                parts.append(f"  File: {h['file']}")
                if h.get("start_line"):
                    parts.append(f"  Line: {h['start_line']}")
        parts.append("")

    # Suggested fix
    if fix.get("approach"):
        parts.append("## Suggested approach")
        parts.append(fix["approach"])
        if fix.get("risk_notes"):
            parts.append(f"Risk: {fix['risk_notes']}")
        parts.append("")

    # Source files
    if file_contents:
        parts.append("## Source files")
        for fpath, content in file_contents.items():
            parts.append(f"### {fpath}")
            parts.append(f"```")
            parts.append(content)
            parts.append(f"```")
            parts.append("")

    # Output format
    parts.append("## Output format")
    parts.append("Return ONLY a JSON object with this structure:")
    parts.append("""```json
{
  "finding_id": "the-finding-id",
  "patches": [
    {
      "file": "path/to/file.ts",
      "description": "What this change does",
      "search": "exact text to find in the file (enough context to be unique)",
      "replace": "exact replacement text"
    }
  ],
  "tests_to_add": [
    {
      "file": "path/to/test.ts",
      "description": "What this test verifies",
      "content": "full test file content or test function"
    }
  ],
  "notes": "any caveats or things to verify manually"
}
```""")
    parts.append("")
    parts.append("Rules:")
    parts.append("- Minimal diff. Change only what is necessary.")
    parts.append("- search strings must be exact matches from the source file.")
    parts.append("- Each search string must be unique in the file (include enough surrounding context).")
    parts.append("- Do not refactor adjacent code.")
    parts.append("- If the fix would violate a project constraint, explain why in notes and provide no patches.")

    return "\n".join(parts)


# --- Commands ---

def cmd_plan(args):
    findings = filter_findings(load_findings(), args)
    expectations = load_expectations(args["expectations_path"])

    if not findings:
        print("No actionable findings match the filters.")
        return

    print(f"LYRA Batch Fix Plan")
    print(f"=" * 50)
    print(f"Model: {args['model']}")
    print(f"Findings to batch: {len(findings)}")
    if expectations:
        print(f"Expectations: loaded ({len(expectations)} chars)")
    print()

    total_files = set()
    for f in findings:
        fix = f.get("suggested_fix", {}) if isinstance(f.get("suggested_fix"), dict) else {}
        effort = fix.get("estimated_effort", "?")
        files = fix.get("affected_files", [])
        total_files.update(files)
        file_str = files[0] if files else "?"
        print(f"  {f.get('priority','?')} {f.get('severity','?'):8s} [{effort:7s}] {f['finding_id']}")
        print(f"    {f.get('title', '?')[:80]}")
        print(f"    File: {file_str}")
        print()

    print(f"Total unique files affected: {len(total_files)}")
    print()

    # Estimate cost (rough: ~2K input + 1K output per finding)
    est_input = len(findings) * 2000
    est_output = len(findings) * 1000
    # Sonnet pricing (batch = 50% off)
    standard_cost = (est_input * 0.003 + est_output * 0.015) / 1000
    batch_cost = standard_cost * 0.5
    print(f"Estimated cost (very rough):")
    print(f"  Standard API: ~${standard_cost:.2f}")
    print(f"  Batch API:    ~${batch_cost:.2f} (50% savings)")
    print()
    print(f"To submit: python3 batch_fix.py submit")


def cmd_submit(args):
    findings = filter_findings(load_findings(), args)
    expectations = load_expectations(args["expectations_path"])

    if not findings:
        print("No actionable findings match the filters.")
        return

    print(f"Building batch of {len(findings)} fix requests...")

    requests = []
    for f in findings:
        prompt = build_fix_prompt(f, expectations)
        requests.append({
            "custom_id": f["finding_id"],
            "params": {
                "model": args["model"],
                "max_tokens": 4096,
                "messages": [{"role": "user", "content": prompt}],
            }
        })

    print(f"Submitting batch to Anthropic API...")
    result = api_request("POST", "/messages/batches", {"requests": requests})

    batch_id = result.get("id", "?")
    status = result.get("processing_status", "?")

    print(f"Batch submitted!")
    print(f"  Batch ID: {batch_id}")
    print(f"  Status: {status}")
    print(f"  Requests: {len(requests)}")
    print()

    # Log the batch
    log = {"batches": []}
    if os.path.exists(BATCH_LOG):
        with open(BATCH_LOG) as lf:
            log = json.load(lf)

    log["batches"].append({
        "batch_id": batch_id,
        "submitted_at": NOW,
        "model": args["model"],
        "finding_count": len(requests),
        "finding_ids": [f["finding_id"] for f in findings],
        "status": status,
    })

    with open(BATCH_LOG, "w") as lf:
        json.dump(log, lf, indent=2)
        lf.write("\n")

    print(f"Logged to {BATCH_LOG}")
    print()
    print(f"Check status:  python3 batch_fix.py status {batch_id}")
    print(f"Get results:   python3 batch_fix.py results {batch_id}")


def cmd_status(args):
    batch_id = args["batch_id"]
    if not batch_id:
        # Show all batches from log
        if os.path.exists(BATCH_LOG):
            with open(BATCH_LOG) as f:
                log = json.load(f)
            for b in log.get("batches", []):
                print(f"  {b['batch_id']}  {b.get('submitted_at', '?')}  {b.get('finding_count', '?')} findings  {b.get('status', '?')}")
        else:
            print("No batches submitted yet.")
        return

    result = api_request("GET", f"/messages/batches/{batch_id}")
    status = result.get("processing_status", "?")
    counts = result.get("request_counts", {})

    print(f"Batch: {batch_id}")
    print(f"Status: {status}")
    print(f"Counts:")
    for k, v in counts.items():
        if v > 0:
            print(f"  {k}: {v}")

    if status == "ended":
        print()
        print(f"Ready! Run: python3 batch_fix.py results {batch_id}")


def cmd_results(args):
    batch_id = args["batch_id"]
    if not batch_id:
        print("Usage: python3 batch_fix.py results <batch_id>")
        sys.exit(1)

    # Check status first
    batch_info = api_request("GET", f"/messages/batches/{batch_id}")
    if batch_info.get("processing_status") != "ended":
        print(f"Batch not done yet. Status: {batch_info.get('processing_status')}")
        counts = batch_info.get("request_counts", {})
        for k, v in counts.items():
            if v > 0:
                print(f"  {k}: {v}")
        return

    # Get results
    results_url = batch_info.get("results_url")
    if not results_url:
        print("No results URL found.")
        return

    print(f"Downloading results...")
    raw = api_get_stream(results_url)

    # Parse JSONL
    os.makedirs(PATCHES_DIR, exist_ok=True)
    results = []
    for line in raw.strip().split("\n"):
        if not line.strip():
            continue
        results.append(json.loads(line))

    succeeded = 0
    failed = 0

    for r in results:
        custom_id = r.get("custom_id", "unknown")
        result = r.get("result", {})
        result_type = result.get("type", "")

        if result_type == "succeeded":
            message = result.get("message", {})
            content_blocks = message.get("content", [])
            text = "".join(b.get("text", "") for b in content_blocks if b.get("type") == "text")

            # Try to parse JSON from the response
            try:
                # Strip markdown fences if present
                clean = text.strip()
                if clean.startswith("```"):
                    clean = clean.split("\n", 1)[1] if "\n" in clean else clean
                    if clean.endswith("```"):
                        clean = clean[:-3]
                    clean = clean.strip()
                    if clean.startswith("json"):
                        clean = clean[4:].strip()

                patch_data = json.loads(clean)

                # Write patch file
                patch_path = os.path.join(PATCHES_DIR, f"{custom_id}.json")
                with open(patch_path, "w") as pf:
                    json.dump(patch_data, pf, indent=2)
                    pf.write("\n")

                patches = patch_data.get("patches", [])
                tests = patch_data.get("tests_to_add", [])
                notes = patch_data.get("notes", "")

                print(f"  {custom_id}: {len(patches)} patches, {len(tests)} tests")
                if notes:
                    print(f"    Note: {notes[:100]}")
                succeeded += 1

            except (json.JSONDecodeError, KeyError) as e:
                # Write raw response for manual review
                raw_path = os.path.join(PATCHES_DIR, f"{custom_id}.raw.txt")
                with open(raw_path, "w") as rf:
                    rf.write(text)
                print(f"  {custom_id}: could not parse JSON, raw saved to {raw_path}")
                failed += 1
        else:
            error = result.get("error", {})
            print(f"  {custom_id}: {result_type} - {error.get('message', '?')}")
            failed += 1

    print()
    print(f"Results: {succeeded} succeeded, {failed} failed")
    print(f"Patches written to: {PATCHES_DIR}/")
    print()
    print(f"Review patches, then apply:")
    print(f"  python3 batch_fix.py apply <finding_id>    # one at a time")
    print(f"  python3 batch_fix.py apply-all              # all at once")


def cmd_apply(args):
    finding_id = args.get("finding_id")
    if not finding_id:
        print("Usage: python3 batch_fix.py apply <finding_id>")
        sys.exit(1)

    patch_path = os.path.join(PATCHES_DIR, f"{finding_id}.json")
    if not os.path.exists(patch_path):
        print(f"No patch file found at {patch_path}")
        return

    with open(patch_path) as f:
        patch_data = json.load(f)

    patches = patch_data.get("patches", [])
    applied = 0
    failed = 0

    for p in patches:
        fpath = p.get("file", "")
        search = p.get("search", "")
        replace = p.get("replace", "")
        desc = p.get("description", "")

        if not os.path.exists(fpath):
            print(f"  SKIP: {fpath} not found")
            failed += 1
            continue

        with open(fpath) as sf:
            content = sf.read()

        if search not in content:
            print(f"  SKIP: search string not found in {fpath}")
            print(f"    Search: {search[:80]}...")
            failed += 1
            continue

        if content.count(search) > 1:
            print(f"  SKIP: search string not unique in {fpath} ({content.count(search)} matches)")
            failed += 1
            continue

        new_content = content.replace(search, replace, 1)
        with open(fpath, "w") as sf:
            sf.write(new_content)

        print(f"  APPLIED: {fpath} - {desc}")
        applied += 1

    # Write test files
    tests = patch_data.get("tests_to_add", [])
    for t in tests:
        tpath = t.get("file", "")
        tcontent = t.get("content", "")
        if tpath and tcontent:
            os.makedirs(os.path.dirname(tpath), exist_ok=True)
            with open(tpath, "w") as tf:
                tf.write(tcontent)
            print(f"  TEST: {tpath}")

    notes = patch_data.get("notes", "")
    if notes:
        print(f"\n  Notes: {notes}")

    print(f"\nApplied: {applied}, Failed: {failed}")
    if applied > 0:
        print(f"\nNext: python3 audits/session.py done {finding_id}")


def cmd_apply_all(args):
    if not os.path.exists(PATCHES_DIR):
        print(f"No patches directory found at {PATCHES_DIR}")
        return

    patch_files = sorted(f for f in os.listdir(PATCHES_DIR) if f.endswith(".json") and not f.endswith(".raw.txt"))

    if not patch_files:
        print("No patch files found.")
        return

    print(f"Applying {len(patch_files)} patches...")
    print()

    for pf in patch_files:
        finding_id = pf.replace(".json", "")
        print(f"--- {finding_id} ---")
        args_copy = dict(args)
        args_copy["finding_id"] = finding_id
        cmd_apply(args_copy)
        print()


# --- Main ---

def main():
    args = parse_args()
    cmd = args["command"]

    if cmd == "plan":
        cmd_plan(args)
    elif cmd == "submit":
        cmd_submit(args)
    elif cmd == "status":
        cmd_status(args)
    elif cmd == "results":
        cmd_results(args)
    elif cmd == "apply":
        cmd_apply(args)
    elif cmd == "apply-all":
        cmd_apply_all(args)
    elif cmd in ("help", "--help", "-h"):
        print(__doc__)
    else:
        print(f"Unknown command: {cmd}")
        print("Run 'python3 batch_fix.py help' for usage.")
        sys.exit(1)


if __name__ == "__main__":
    main()
