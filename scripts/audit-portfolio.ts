#!/usr/bin/env ts-node

/**
 * Portfolio Constraint Audit CLI Script
 *
 * Usage:
 *   npx ts-node scripts/audit-portfolio.ts --difficulty=all --format=table
 *   npx ts-node scripts/audit-portfolio.ts --project=embr --format=json
 *   npx ts-node scripts/audit-portfolio.ts --difficulty=critical-only
 */

import * as path from "path";
import * as fs from "fs";
import { PortfolioOrchestrator, getDefaultPortfolioSLA } from "../dashboard/lib/portfolio-orchestrator";
import { ConstraintAuditRepository } from "../dashboard/lib/constraint-audit-repository";

interface CLIOptions {
  difficulty: "easy" | "moderate" | "complex" | "all" | "critical-only";
  format: "table" | "json" | "csv";
  project?: string;
  save: boolean;
  verbose: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    difficulty: "all",
    format: "table",
    save: false,
    verbose: false
  };

  args.forEach(arg => {
    if (arg.startsWith("--difficulty=")) {
      options.difficulty = arg.split("=")[1] as any;
    }
    if (arg.startsWith("--format=")) {
      options.format = arg.split("=")[1] as any;
    }
    if (arg.startsWith("--project=")) {
      options.project = arg.split("=")[1];
    }
    if (arg === "--save") {
      options.save = true;
    }
    if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    }
  });

  return options;
}

function printTableFormat(summary: any) {
  const chalk =
    require("chalk") || { green: (s: string) => s, red: (s: string) => s };

  console.log("\n" + "=".repeat(80));
  console.log("PORTFOLIO CONSTRAINT AUDIT");
  console.log("=".repeat(80));

  console.log(`\n📊 Overall Compliance: ${summary.aggregatedStats.portfolioCompliance.toFixed(1)}%`);
  console.log(`   Total Constraints: ${summary.aggregatedStats.totalConstraints}`);
  console.log(`   Passed: ${summary.aggregatedStats.totalPassed}`);
  console.log(`   Failed: ${summary.aggregatedStats.totalFailed}`);
  console.log(`   Warnings: ${summary.aggregatedStats.totalWarnings}`);

  console.log("\n" + "-".repeat(80));
  console.log("PER-PROJECT STATUS");
  console.log("-".repeat(80));

  const tableData = summary.projectResults.map((p: any) => ({
    Project: p.projectName,
    "Total": p.totalConstraints,
    "Passed": p.passed,
    "Failed": p.failed,
    "Compliance": `${p.compliancePercentage.toFixed(1)}%`,
    "Status": p.status.toUpperCase()
  }));

  console.table(tableData);

  if (summary.criticalViolations.length > 0) {
    console.log("\n" + "-".repeat(80));
    console.log("🔴 CRITICAL VIOLATIONS");
    console.log("-".repeat(80));
    summary.criticalViolations.slice(0, 10).forEach((v: any, i: number) => {
      console.log(`  ${i + 1}. [${v.projectId}] ${v.violation.remediation}`);
    });
    if (summary.criticalViolations.length > 10) {
      console.log(`  ... and ${summary.criticalViolations.length - 10} more`);
    }
  }

  if (summary.trending.commonFailures.length > 0) {
    console.log("\n" + "-".repeat(80));
    console.log("TOP FAILING CONSTRAINTS");
    console.log("-".repeat(80));
    summary.trending.commonFailures.slice(0, 5).forEach((f: any, i: number) => {
      console.log(
        `  ${i + 1}. ${f.constraintId}: ${f.failureCount} failures across ${f.affectedProjects} projects`
      );
    });
  }

  console.log("\n" + "=".repeat(80));
}

function printJsonFormat(summary: any) {
  console.log(JSON.stringify(summary, null, 2));
}

function printCsvFormat(summary: any) {
  console.log("Project,Total,Passed,Failed,Warnings,Compliance%,Status");
  summary.projectResults.forEach((p: any) => {
    console.log(
      `${p.projectName},${p.totalConstraints},${p.passed},${p.failed},${p.warnings},${p.compliancePercentage.toFixed(1)},${p.status}`
    );
  });
}

async function main() {
  const options = parseArgs();

  try {
    // Initialize
    const repository = new ConstraintAuditRepository();
    const sla = getDefaultPortfolioSLA();
    const orchestrator = new PortfolioOrchestrator(sla, repository);

    let summary;

    if (options.project) {
      // Audit single project
      const result = await orchestrator.auditProject(
        options.project,
        options.difficulty === "critical-only" ? "easy" : options.difficulty
      );
      summary = {
        timestamp: new Date(),
        totalProjects: 1,
        projectResults: [
          {
            projectId: result.projectId,
            projectName: result.projectName,
            totalConstraints: result.total,
            passed: result.passed,
            failed: result.failed,
            warnings: result.warnings,
            compliancePercentage: result.compliancePercentage,
            status:
              result.compliancePercentage >= 90
                ? "pass"
                : result.compliancePercentage >= 75
                  ? "warning"
                  : "fail"
          }
        ],
        aggregatedStats: {
          totalConstraints: result.total,
          totalPassed: result.passed,
          totalFailed: result.failed,
          totalWarnings: result.warnings,
          portfolioCompliance: result.compliancePercentage,
          slaStatus: result.compliancePercentage >= 90 ? "pass" : "fail"
        },
        criticalViolations: [],
        trending: {
          complianceTrend: [],
          commonFailures: []
        }
      };
    } else {
      // Audit all projects
      const difficulty =
        options.difficulty === "critical-only" ? "easy" : options.difficulty;
      summary = await orchestrator.auditAll(difficulty);
    }

    // Print output
    switch (options.format) {
      case "table":
        printTableFormat(summary);
        break;
      case "json":
        printJsonFormat(summary);
        break;
      case "csv":
        printCsvFormat(summary);
        break;
    }

    // Save results if requested
    if (options.save) {
      const outputPath = path.join(process.cwd(), "audit-results.json");
      fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
      console.log(`\n✅ Results saved to ${outputPath}`);
    }

    // Check SLA
    const slaCheck = orchestrator.checkSLACompliance(summary);
    if (slaCheck.overallStatus === "fail") {
      console.log("\n⚠️  SLA VIOLATIONS:");
      slaCheck.issues.forEach(issue => console.log(`   - ${issue}`));
      process.exit(1);
    }

    console.log("\n✅ All constraints passing - SLA met!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Audit failed:", error);
    process.exit(1);
  }
}

main();
