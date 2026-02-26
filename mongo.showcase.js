// mongo.commands.js

const { MongoClient, ObjectId } = require("mongodb");

function toObjectId(value) {
  return typeof value === "string" && ObjectId.isValid(value)
    ? new ObjectId(value)
    : null;
}

async function connectMongo({ uri, dbName }) {
  const client = new MongoClient(uri);
  await client.connect();
  return client.db(dbName);
}

/* ---------------- BASIC COMMANDS (db.* style) ---------------- */

function collection(db, name) {
  return db.collection(name);
}

async function find(coll, filter = {}, options = {}) {
  return coll.find(filter, options).toArray();
}

async function findOne(coll, filter = {}, options = {}) {
  return coll.findOne(filter, options);
}

async function insertOne(coll, doc) {
  return coll.insertOne(doc);
}

async function insertMany(coll, docs) {
  return coll.insertMany(docs);
}

async function updateOne(coll, filter, update, options = {}) {
  return coll.updateOne(filter, update, options);
}

async function deleteOne(coll, filter) {
  return coll.deleteOne(filter);
}

async function deleteMany(coll, filter) {
  return coll.deleteMany(filter);
}

async function aggregate(coll, pipeline = []) {
  return coll.aggregate(pipeline).toArray();
}

async function createIndex(coll, spec, options = {}) {
  return coll.createIndex(spec, options);
}

async function count(coll, filter = {}) {
  return coll.countDocuments(filter);
}

module.exports = {
  connectMongo,
  collection,
  find,
  findOne,
  insertOne,
  insertMany,
  updateOne,
  deleteOne,
  deleteMany,
  aggregate,
  createIndex,
  count,
  toObjectId,
};