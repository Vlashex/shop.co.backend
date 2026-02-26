async function ensureCollection(db, name, validator) {
  const existing = await db.listCollections({ name }, { nameOnly: true }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name, {
      validator,
      validationAction: "error",
      validationLevel: "strict",
    });
    return;
  }

  await db.command({
    collMod: name,
    validator,
    validationAction: "error",
    validationLevel: "strict",
  });
}

async function ensureCollections(db, validators) {
  for (const [name, validator] of Object.entries(validators)) {
    await ensureCollection(db, name, validator);
  }
}

module.exports = {
  ensureCollections,
};