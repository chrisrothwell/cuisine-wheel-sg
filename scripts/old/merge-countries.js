import fs from "fs";

// ---- Load files ----
const isoCountries = JSON.parse(
  fs.readFileSync("./all-countries.json", "utf8")
);

const unExtract = JSON.parse(
  fs.readFileSync("./un-countries.json", "utf8")
);

// ---- Build UN member lookup (alpha-3 codes) ----
const unMembers = new Set(
  unExtract.dimensions.entities.values.map(e => e.code)
);

// ---- Merge datasets ----
const merged = isoCountries.map(country => {
  const alpha3 = country["alpha-3"];
  const isMember = unMembers.has(alpha3);

  return {
    ...country,
    un_member: isMember,
    un_membership_status: isMember ? "Member" : "Non-member"
  };
});

// ---- Write output ----
fs.writeFileSync(
  "./display-countries.json",
  JSON.stringify(merged, null, 2),
  "utf8"
);

console.log(
  `✔ Created display-countries.json (${merged.length} entries)`
);
