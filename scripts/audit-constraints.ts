#!/usr/bin/env node

/**
 * CLI script to run constraint audits
 * Usage: npx ts-node scripts/audit-constraints.ts [options]
 *
 * Options:
 *   --project <name>       Project to audit (default: embr)
 *   --path <path>          Project path (default: ..)
 *   --difficulty <level>   easy|moderate|complex|all (default: easy)
 *   --save                 Save results to database
 *   --format <fmt>         json|text (default: text)
 */

import path from "path";
import { EMBR_CONSTRAINTS, getConstraintsByDifficulty } from "../dashboard/lib/constraints/embr-constraints";
import { runConstraintAudit } from "../dashboard/lib/constraint-validator";

async function main() {
  const args = process.argv.slice(2);
  const options = {
    project: "embr",
    path: "..",
    difficulty: "easy" as "easy" | "moderate" | "complex" | "all",
    save: false,
    format: "text" as "json" | "text",
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--project":
        options.project = args[++i];
        break;
      case "--path":
        options.path = args[++i];
        break;
      case "--difficulty":
        options.difficulty = args[++i] as any;
        break;
      case "--save":
        options.save = true;
        break;
      case "--format":
        options.format = args[++i] as any;
        break;
    }
  }

  const projectPath = path.isAbsolute(options.path)
    ? options.path
    : path.resolve(process.cwd(), options.path);

  // Get constraints
  let constraints = EMBR_CONSTRAINTS;
  if (options.difficulty !== "all") {
    constraints = getConstraintsByDifficulty(options.difficulty);
  }

  console.log(`\n📋 Auditing ${options.project} (${constraints.length} constraints)\n`);

  // Run audit
  const startTime = Date.now();
  const result = await runConstraintAudit(
    constraints,
    projectPath,
    options.project
  );
  const duration = Date.now() - startTime;

  if (options.format === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Text format
    console.log(`✅ Passed: ${result.passed}/${result.total_constraints}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`⚠️  Coverage: ${result.coverage_percentage}%`);
    console.log(`⏱️  Duration: ${duration}ms\n`);

    if (result.failed > 0) {
      console.log("Violations:\n");
      result.violations.forEach((v) => {
        console.log(`  ${v.constraint_id}: ${v.violation_type}`);
        console.log(`    → ${v.remediation}\n`);
      });
    }
  }

  // Save to database if requested
  if (options.save) {
    try {
      const { saveConstraintAudit } = await import(
        "../dashboard/lib/constraint-audit-repository"
      );
      const dbResult = await saveConstraintAudit(result);
      if (dbResult.id) {
        console.log(`✅ Saved to database (ID: ${dbResult.id})\n`);
      } else {
        console.log(`⚠️  Database save failed: ${dbResult.error}\n`);
      }
    } catch (error) {
      console.log("⚠️  Could not save to database (not configured)\n");
    }
  }

  // Exit with appropriate code
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
