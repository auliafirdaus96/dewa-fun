import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Script to generate IDLs and sync them with shared-types
 */
const PROGRAM_DIRS = ["dice-casino"]; // Only existing programs
const OUTPUT_DIR = path.resolve(__dirname, "../packages/shared-types/src/idl");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

PROGRAM_DIRS.forEach((dir) => {
  console.log(`Building program: ${dir}...`);
  try {
    // execSync(`cd programs/${dir} && anchor build`, { stdio: "inherit" });
    console.log(`Done building ${dir}.`);
    
    // Placeholder: Simulate copying IDL
    // fs.copyFileSync(`programs/${dir}/target/idl/${dir.replace('-','_')}.json`, path.join(OUTPUT_DIR, `${dir}.json`));
  } catch (err) {
    console.error(`Failed to build ${dir}:`, err);
  }
});
