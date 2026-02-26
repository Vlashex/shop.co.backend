function filterNonEmptyUniqueStrings(values) {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .filter((value) => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    ),
  ];
}

module.exports = {
  filterNonEmptyUniqueStrings,
};