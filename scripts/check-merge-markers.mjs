import { execSync } from 'node:child_process';

const cmd = "git grep -nE '^(<{7}|={7}|>{7})' -- . ':(exclude)package-lock.json'";

try {
  const result = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

  if (result) {
    console.error('Merge conflict markers detected:\n');
    console.error(result);
    process.exit(1);
  }

  console.log('No merge conflict markers detected.');
} catch (error) {
  // git grep exits with non-zero when no matches are found.
  if (typeof error.status === 'number' && error.status === 1) {
    console.log('No merge conflict markers detected.');
    process.exit(0);
  }

  console.error('Failed to run merge marker check.');
  if (error.stderr) {
    console.error(String(error.stderr));
  }
  process.exit(2);
}
