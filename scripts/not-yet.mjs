// Placeholder for commands whose phase has not been built yet (plan §15).
const [command, phase] = process.argv.slice(2);
console.error(`"npm run ${command}" arrives in Phase ${phase}. Nothing was done.`);
process.exit(1);
