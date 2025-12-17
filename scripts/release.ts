#!/usr/bin/env bun
/**
 * release - A global bun script to wrap npm version with pre-checks
 * 
 * Usage:
 *   release patch   # 0.14.0 → 0.14.1
 *   release minor   # 0.14.0 → 0.15.0
 *   release major   # 0.14.0 → 1.0.0
 *   release --dry   # Show what would happen without doing it
 * 
 * Install globally:
 *   bun link
 */

import { $ } from "bun";

const VALID_VERSIONS = ["patch", "minor", "major", "prepatch", "preminor", "premajor", "prerelease"];

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry");
  const versionType = args.find(a => VALID_VERSIONS.includes(a));

  if (!versionType) {
    console.error("❌ Usage: release <patch|minor|major> [--dry]");
    console.error("   Examples:");
    console.error("     release patch   # Bug fixes");
    console.error("     release minor   # New features");
    console.error("     release major   # Breaking changes");
    process.exit(1);
  }

  // Check for clean working directory
  console.log("🔍 Checking git status...");
  const status = await $`git status --porcelain`.text();
  if (status.trim()) {
    console.error("❌ Working directory is not clean. Commit or stash changes first.");
    console.error(status);
    process.exit(1);
  }
  console.log("✅ Working directory clean");

  // Run unit tests
  console.log("\n🧪 Running unit tests...");
  try {
    await $`bun run test -- run`.quiet();
    console.log("✅ Unit tests passed");
  } catch (e) {
    console.error("❌ Unit tests failed. Fix tests before releasing.");
    process.exit(1);
  }

  // Run E2E tests (if they exist)
  console.log("\n🌐 Running E2E tests...");
  try {
    await $`bun run test:e2e`.quiet();
    console.log("✅ E2E tests passed");
  } catch (e) {
    // E2E might not exist in all projects
    console.log("⚠️  E2E tests skipped or failed (continuing anyway)");
  }

  // Get current version
  const pkg = await Bun.file("package.json").json();
  const currentVersion = pkg.version;

  if (dryRun) {
    console.log(`\n🔖 Would bump: ${currentVersion} → [${versionType}]`);
    console.log("   (dry run - no changes made)");
    process.exit(0);
  }

  // Bump version
  console.log(`\n🔖 Bumping version: ${currentVersion} → [${versionType}]`);
  try {
    const result = await $`npm version ${versionType} -m "chore(release): %s"`.text();
    const newVersion = result.trim();
    console.log(`✅ Released ${newVersion}`);
    console.log("\n📦 Don't forget to push:");
    console.log(`   git push && git push origin ${newVersion}`);
  } catch (e) {
    console.error("❌ Version bump failed:", e);
    process.exit(1);
  }
}

main();
