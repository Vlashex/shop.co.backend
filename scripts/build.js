const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "src");
const outputDir = path.join(rootDir, "dist");
const nodeModulesDir = path.join(rootDir, "node_modules");
const packageJsonPath = path.join(rootDir, "package.json");
const packageLockPath = path.join(rootDir, "package-lock.json");
const args = new Set(process.argv.slice(2));
const withDependencies = args.has("--with-deps");

function copyDirectory(source, destination) {
  fs.cpSync(source, destination, {
    recursive: true,
    force: true,
    dereference: true
  });
}

if (!fs.existsSync(sourceDir)) {
  console.error("Source directory not found:", sourceDir);
  process.exit(1);
}

fs.rmSync(outputDir, { recursive: true, force: true });
copyDirectory(sourceDir, outputDir);
fs.copyFileSync(packageJsonPath, path.join(outputDir, "package.json"));

if (fs.existsSync(packageLockPath)) {
  fs.copyFileSync(packageLockPath, path.join(outputDir, "package-lock.json"));
}

if (withDependencies) {
  if (!fs.existsSync(nodeModulesDir)) {
    console.error("Dependencies not found. Run `npm install` in backend first.");
    process.exit(1);
  }

  copyDirectory(nodeModulesDir, path.join(outputDir, "node_modules"));
}

console.log(
  `Build completed: ${path.relative(rootDir, outputDir)}${withDependencies ? " (with dependencies)" : ""}`
);
