/**
 * Constraint Manager
 * Handles CRUD operations for project constraints
 * Allows managing constraints from dashboard without code
 */

import * as fs from "fs";
import * as path from "path";
import { ConstraintDefinition } from "./constraint-types";
import { ConstraintTemplates } from "./constraint-templates";

export interface ConstraintConfig {
  projectId: string;
  constraints: ConstraintDefinition[];
  lastModified: Date;
  modifiedBy?: string;
}

export class ConstraintManager {
  private constraintsDir: string;

  constructor(constraintsDir: string = "constraints") {
    this.constraintsDir = path.join(process.cwd(), constraintsDir);
    this.ensureDir();
  }

  private ensureDir() {
    if (!fs.existsSync(this.constraintsDir)) {
      fs.mkdirSync(this.constraintsDir, { recursive: true });
    }
  }

  /**
   * Get constraints for a project
   */
  async getProjectConstraints(projectId: string): Promise<ConstraintDefinition[]> {
    const filePath = this.getConstraintFilePath(projectId);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      return data.constraints || [];
    } catch (error) {
      console.error(`Failed to read constraints for ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Save constraint for a project
   */
  async saveConstraint(
    projectId: string,
    constraint: ConstraintDefinition,
    modifiedBy?: string
  ): Promise<void> {
    const constraints = await this.getProjectConstraints(projectId);

    // Update or insert
    const existingIndex = constraints.findIndex(c => c.id === constraint.id);
    if (existingIndex >= 0) {
      constraints[existingIndex] = constraint;
    } else {
      constraints.push(constraint);
    }

    // Save to file
    const config: ConstraintConfig = {
      projectId,
      constraints,
      lastModified: new Date(),
      modifiedBy
    };

    const filePath = this.getConstraintFilePath(projectId);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");
  }

  /**
   * Delete constraint from a project
   */
  async deleteConstraint(projectId: string, constraintId: string): Promise<void> {
    const constraints = await this.getProjectConstraints(projectId);
    const filtered = constraints.filter(c => c.id !== constraintId);

    const config: ConstraintConfig = {
      projectId,
      constraints: filtered,
      lastModified: new Date()
    };

    const filePath = this.getConstraintFilePath(projectId);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");
  }

  /**
   * Apply a template to create a new constraint
   */
  applyTemplate(
    projectId: string,
    templatePath: string,
    overrides?: Partial<ConstraintDefinition>
  ): ConstraintDefinition {
    // Parse template path: "security.jwtRequired"
    const [category, templateName] = templatePath.split(".");

    const templates = ConstraintTemplates as any;
    const template = templates[category]?.[templateName];

    if (!template) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    // Apply to project
    return {
      ...template,
      id: template.id.replace("template", projectId),
      ...overrides
    };
  }

  /**
   * Get available templates
   */
  getAvailableTemplates() {
    const templates: any = {};

    Object.entries(ConstraintTemplates).forEach(([category, items]: [string, any]) => {
      templates[category] = Object.entries(items).map(([key, template]: [string, any]) => ({
        name: key,
        template: template.name,
        description: template.description,
        path: `${category}.${key}`
      }));
    });

    return templates;
  }

  /**
   * Get constraint file path for a project
   */
  private getConstraintFilePath(projectId: string): string {
    return path.join(this.constraintsDir, `${projectId}.json`);
  }

  /**
   * List all projects with constraints
   */
  listProjects(): string[] {
    this.ensureDir();
    const files = fs.readdirSync(this.constraintsDir);
    return files
      .filter(f => f.endsWith(".json"))
      .map(f => f.replace(".json", ""));
  }

  /**
   * Bulk update constraints (for extractions)
   */
  async bulkUpsertConstraints(
    projectId: string,
    constraints: ConstraintDefinition[],
    modifiedBy?: string
  ): Promise<void> {
    const existing = await this.getProjectConstraints(projectId);

    const merged = constraints.reduce((acc, newConstraint) => {
      const existingIndex = acc.findIndex(c => c.id === newConstraint.id);
      if (existingIndex >= 0) {
        acc[existingIndex] = newConstraint;
      } else {
        acc.push(newConstraint);
      }
      return acc;
    }, existing);

    const config: ConstraintConfig = {
      projectId,
      constraints: merged,
      lastModified: new Date(),
      modifiedBy
    };

    const filePath = this.getConstraintFilePath(projectId);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");
  }

  /**
   * Export constraints as CSV (for analysis)
   */
  async exportAsCSV(projectId: string): Promise<string> {
    const constraints = await this.getProjectConstraints(projectId);

    const headers = [
      "ID",
      "Name",
      "Category",
      "Severity",
      "Difficulty",
      "Description"
    ];

    const rows = constraints.map(c => [
      c.id,
      c.name,
      c.category,
      c.severity,
      c.difficulty,
      c.description || ""
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

    return csv;
  }

  /**
   * Import constraints from CSV
   */
  async importFromCSV(projectId: string, csvContent: string): Promise<ConstraintDefinition[]> {
    const lines = csvContent.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.toLowerCase());

    const constraints: ConstraintDefinition[] = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const obj: any = {};

      headers.forEach((header, i) => {
        obj[header] = values[i];
      });

      return {
        id: obj.id || `${projectId}-${Date.now()}`,
        name: obj.name,
        category: obj.category,
        severity: obj.severity as any,
        difficulty: obj.difficulty as any,
        description: obj.description,
        pattern: obj.pattern || "",
        checks: [],
        sla: obj.sla || ""
      };
    });

    await this.bulkUpsertConstraints(projectId, constraints);
    return constraints;
  }

  /**
   * Validate constraint definition
   */
  validateConstraint(constraint: ConstraintDefinition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!constraint.id) errors.push("ID is required");
    if (!constraint.name) errors.push("Name is required");
    if (!constraint.category) errors.push("Category is required");
    if (!constraint.severity) errors.push("Severity is required");
    if (!constraint.difficulty) errors.push("Difficulty is required");

    const validCategories = [
      "security",
      "data-integrity",
      "performance",
      "code-quality",
      "operations",
      "business-logic",
      "infrastructure"
    ];
    if (!validCategories.includes(constraint.category)) {
      errors.push(`Invalid category: ${constraint.category}`);
    }

    const validSeverities = ["critical", "high", "medium", "low"];
    if (!validSeverities.includes(constraint.severity)) {
      errors.push(`Invalid severity: ${constraint.severity}`);
    }

    const validDifficulties = ["easy", "moderate", "complex"];
    if (!validDifficulties.includes(constraint.difficulty)) {
      errors.push(`Invalid difficulty: ${constraint.difficulty}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get constraint statistics for a project
   */
  async getConstraintStats(projectId: string) {
    const constraints = await this.getProjectConstraints(projectId);

    return {
      total: constraints.length,
      bySeverity: {
        critical: constraints.filter(c => c.severity === "critical").length,
        high: constraints.filter(c => c.severity === "high").length,
        medium: constraints.filter(c => c.severity === "medium").length,
        low: constraints.filter(c => c.severity === "low").length
      },
      byDifficulty: {
        easy: constraints.filter(c => c.difficulty === "easy").length,
        moderate: constraints.filter(c => c.difficulty === "moderate").length,
        complex: constraints.filter(c => c.difficulty === "complex").length
      },
      byCategory: constraints.reduce(
        (acc, c) => {
          acc[c.category] = (acc[c.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    };
  }
}
